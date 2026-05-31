// Notification layer. Front-end only, so reminders are evaluated on a ticking
// clock while the app is open: for each event we compute its next moment and,
// for each configured tier (lead time), fire once when that lead window opens.
// Deduped in localStorage. Closed-app delivery needs a push server — see README.

import { nextOccurrence, isTimed } from './dates.js'
import { tierMs, tierLabel } from './reminderTiers.js'
import { typeMeta } from './eventTypes.js'
import { playSound } from './sounds.js'

const SEEN_KEY = 'date-reminder/notified'

export function notifySupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function permission() {
  return notifySupported() ? Notification.permission : 'denied'
}

export async function requestPermission() {
  if (!notifySupported()) return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

function loadSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'))
  } catch {
    return new Set()
  }
}
function saveSeen(set) {
  // Keep the list from growing forever — last 200 keys is plenty.
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-200)))
}

async function show(title, body) {
  const opts = { body, icon: '/icon-192.png', badge: '/icon-192.png', tag: title }
  // Prefer the service worker (works when installed); fall back to page Notification.
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration()
    if (reg) return reg.showNotification(title, opts)
  }
  new Notification(title, opts)
}

/** The tier keys that apply to an event: its own override, else the type default. */
export function tiersFor(event, settings) {
  if (Array.isArray(event.reminders) && event.reminders.length) return event.reminders
  return settings?.reminderTiers?.[event.type] || settings?.reminderTiers?.other || []
}

/**
 * Evaluate all events against `now` and fire any reminder whose lead window has
 * opened but whose moment hasn't passed — once each (deduped). Call on a tick.
 */
export async function runReminders(events, settings, t, now = new Date()) {
  if (permission() !== 'granted') return
  const seen = loadSeen()
  let changed = false
  const nowMs = now.getTime()

  for (const ev of events) {
    const occ = nextOccurrence(ev, now)
    const occMs = occ.getTime()
    for (const key of tiersFor(ev, settings)) {
      const fireAt = occMs - tierMs(key)
      // Inside the window (lead reached) and the moment is still ahead.
      if (fireAt > nowMs || nowMs >= occMs) continue
      const seenKey = `${ev.id}|${occMs}|${key}`
      if (seen.has(seenKey)) continue

      const meta = typeMeta(ev.type)
      const lead = tierLabel(key, t)
      const when = isTimed(ev)
        ? occ.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : occ.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
      await show(`${meta.emoji} ${ev.name}`, `${lead} — ${when}`)
      playSound(settings?.sound)
      seen.add(seenKey)
      changed = true
    }
  }
  if (changed) saveSeen(seen)
}

/**
 * Fire a notification immediately so the user can confirm the whole pipeline
 * works on their device. Requests permission first if needed.
 * Returns { ok, reason } — reason is the permission state on failure.
 */
export async function sendTest(t, soundId) {
  if (!notifySupported()) return { ok: false, reason: 'unsupported' }
  let perm = permission()
  if (perm !== 'granted') perm = await requestPermission()
  if (perm !== 'granted') return { ok: false, reason: perm }
  await show(t('settings.testTitle'), t('settings.testBody'))
  playSound(soundId)
  return { ok: true }
}
