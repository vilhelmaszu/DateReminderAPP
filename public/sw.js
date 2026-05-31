// Service worker: makes the app installable + work offline, and shows
// notifications (tapping one focuses/opens the app). The app shell is cached
// on install; built JS/CSS are cached lazily as they're requested.

const CACHE = 'date-reminder-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Cache-first for our own assets, network fallback; runtime-cache successful GETs.
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return res
        })
        .catch(() => caches.match('/index.html')) // SPA offline fallback
    }),
  )
})

// The push server URL is sent from the page (SWs can't read build env vars).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'config' && event.data.api) {
    event.waitUntil(caches.open(CACHE).then((c) => c.put('/__cfg_api', new Response(event.data.api))))
  }
})

// A push arrived. Pushes are sent WITHOUT a payload (no VAPID payload crypto),
// so we ask the server what's due for this subscription, then show it.
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let api = null
    try {
      const r = await caches.match('/__cfg_api')
      if (r) api = (await r.text()) || null
    } catch { /* ignore */ }

    let items = []
    try {
      const sub = await self.registration.pushManager.getSubscription()
      if (api && sub) {
        const res = await fetch(`${api}/due?endpoint=${encodeURIComponent(sub.endpoint)}`)
        if (res.ok) items = await res.json()
      }
    } catch { /* ignore network errors */ }

    // Fallbacks: inline payload (if a future server sends one), else generic.
    if (!items.length && event.data) {
      try { items = [event.data.json()] } catch { items = [{ title: 'Reminder', body: event.data.text() }] }
    }
    if (!items.length) items = [{ title: 'Reminder', body: 'You have a reminder.' }]

    await Promise.all(
      items.map((it) =>
        self.registration.showNotification(it.title || 'Reminder', {
          body: it.body || '',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: it.key || it.title,
        }),
      ),
    )
  })())
})

// Focus an existing window (or open one) when a notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow('/')
    }),
  )
})
