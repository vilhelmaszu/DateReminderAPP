// Client side of Web Push. Subscribes the device and syncs the computed
// schedule to the Worker. Configured via two build-time env vars:
//   VITE_PUSH_API          — the Worker base URL, e.g. https://reminders.you.workers.dev
//   VITE_VAPID_PUBLIC_KEY  — the VAPID public key (base64url)
// Without them, background push is simply hidden in the UI.

import { buildSchedule } from './schedule.js'

const API = import.meta.env.VITE_PUSH_API
const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function pushConfigured() {
  return Boolean(API && VAPID && 'serviceWorker' in navigator && 'PushManager' in window)
}

function urlB64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export async function currentSubscription() {
  if (!pushConfigured()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return reg ? reg.pushManager.getSubscription() : null
}

/** Subscribe this device and push the initial schedule. Returns the subscription. */
export async function enablePush(events, settings) {
  if (!pushConfigured()) throw new Error('push not configured')
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(VAPID),
    }))
  await syncSchedule(events, settings, sub)
  return sub
}

/** Push the current schedule for an already-subscribed device. */
export async function syncSchedule(events, settings, sub) {
  if (!pushConfigured()) return
  const subscription = sub || (await currentSubscription())
  if (!subscription) return
  await fetch(`${API}/subscribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subscription, schedule: buildSchedule(events, settings) }),
  })
}

export async function disablePush() {
  if (!pushConfigured()) return
  const sub = await currentSubscription()
  if (!sub) return
  try {
    await fetch(`${API}/unsubscribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    })
  } finally {
    await sub.unsubscribe()
  }
}
