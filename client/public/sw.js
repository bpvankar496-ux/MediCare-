// Minimal service worker for MediCare+.
//
// Goals kept deliberately small so it can never make the live app feel
// "stuck" on stale data:
//  - Makes the app installable (a fetch handler + manifest are the only
//    hard requirements most browsers check for "Add to Home Screen").
//  - Caches the built static assets (JS/CSS/images) with a cache-first
//    strategy, since those are content-hashed by Vite and safe to cache
//    forever per build.
//  - Everything else (HTML navigation requests, and always /api/* calls)
//    goes straight to the network - this app's data changes constantly
//    (appointments, orders, chat), so we never want to serve it stale.
//  - Falls back to the cached shell only when the network is completely
//    unreachable (e.g. no connectivity), so the app doesn't show a blank
//    browser error page offline.

const CACHE_NAME = 'medicare-static-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never cache API calls or socket.io traffic - always live data.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    return
  }

  // Static, content-hashed build assets: cache-first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      }),
    )
    return
  }

  // Everything else (HTML navigation, etc): network-first, falling back to
  // cache only if the network is genuinely unreachable.
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
  )
})
