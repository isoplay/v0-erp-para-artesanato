const CACHE_NAME = 'exclusiv-art-v2'
const STATIC_ASSETS = ['/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {})
    })
  )

  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )

  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Não interceptar páginas, login, dashboard, API ou Supabase
  if (
    event.request.mode === 'navigate' ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/api') ||
    url.hostname.includes('supabase')
  ) {
    return
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})