// Cloudflare Worker: a dumb timed dispatcher for reminder pushes.
// - The client computes its schedule (it has the right timezone + date logic)
//   and POSTs it here on /subscribe.
// - A cron trigger runs every minute, finds entries that are due, sends a bare
//   push, and queues the notification text under /due for the service worker.
//
// Storage: one KV namespace `SUBS`, keyed by the push endpoint.
//   value = { subscription, schedule:[{at,key,title,body}], sent:[key], pending:[{title,body,key}] }

import { sendBarePush } from './vapid.js'

const CORS = {
  'Access-Control-Allow-Origin': '*', // tighten to your app origin in production
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...CORS } })

function keyFor(endpoint) {
  return `sub:${endpoint}`
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })

    // Save / refresh a subscription and its schedule.
    if (request.method === 'POST' && url.pathname === '/subscribe') {
      const { subscription, schedule } = await request.json()
      if (!subscription?.endpoint) return json({ error: 'no endpoint' }, 400)
      const k = keyFor(subscription.endpoint)
      const prev = JSON.parse((await env.SUBS.get(k)) || '{}')
      await env.SUBS.put(k, JSON.stringify({
        subscription,
        schedule: Array.isArray(schedule) ? schedule : [],
        sent: prev.sent || [],
        pending: prev.pending || [],
      }))
      return json({ ok: true })
    }

    if (request.method === 'POST' && url.pathname === '/unsubscribe') {
      const { endpoint } = await request.json()
      if (endpoint) await env.SUBS.delete(keyFor(endpoint))
      return json({ ok: true })
    }

    // The service worker fetches what's due for its endpoint, then we clear it.
    if (request.method === 'GET' && url.pathname === '/due') {
      const endpoint = url.searchParams.get('endpoint')
      if (!endpoint) return json([], 200)
      const k = keyFor(endpoint)
      const rec = JSON.parse((await env.SUBS.get(k)) || 'null')
      if (!rec) return json([])
      const pending = rec.pending || []
      rec.pending = []
      await env.SUBS.put(k, JSON.stringify(rec))
      return json(pending)
    }

    if (url.pathname === '/health') return json({ ok: true })
    return new Response('Date Reminder push worker', { headers: CORS })
  },

  // Cron: runs every minute (see wrangler.toml). Fire anything now due.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(tick(env))
  },
}

async function tick(env) {
  const now = Date.now()
  const grace = 6 * 60_000 // catch entries up to 6 min late (cron jitter / sleep)
  const list = await env.SUBS.list({ prefix: 'sub:' })

  for (const entry of list.keys) {
    const rec = JSON.parse((await env.SUBS.get(entry.name)) || 'null')
    if (!rec?.subscription) continue
    const sent = new Set(rec.sent || [])
    const due = (rec.schedule || []).filter((s) => s.at <= now && s.at > now - grace && !sent.has(s.key))
    if (!due.length) continue

    rec.pending = [...(rec.pending || []), ...due.map((d) => ({ title: d.title, body: d.body, key: d.key }))].slice(-30)
    due.forEach((d) => sent.add(d.key))
    rec.sent = [...sent].slice(-400)
    await env.SUBS.put(entry.name, JSON.stringify(rec))

    try {
      const res = await sendBarePush(rec.subscription, env)
      // 404/410 mean the subscription is dead — clean it up.
      if (res.status === 404 || res.status === 410) await env.SUBS.delete(entry.name)
    } catch {
      /* transient push error — try again next minute */
    }
  }
}
