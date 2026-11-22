const cacheName = 'tidepool-offline-v1'
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => cache.addAll(['/offline.html', '/offline.js', '/identity/icon-192.png'])),
  ),
)
self.addEventListener('activate', (event) =>
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k.startsWith('tidepool-offline-') && k !== cacheName)
              .map((k) => caches.delete(k)),
          ),
        ),
    ]),
  ),
)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin)
    return
  if (event.request.mode === 'navigate')
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')))
  else if (['/offline.js', '/identity/icon-192.png'].includes(new URL(event.request.url).pathname))
    event.respondWith(caches.match(event.request).then((r) => r || fetch(event.request)))
})
