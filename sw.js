const CACHE = 'apex-v6';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Requêtes cross-origin → réseau uniquement (Supabase, CDN, etc.)
  if (url.origin !== self.location.origin) return;

  // Network-first : toujours la version fraîche, cache uniquement si offline
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Mettre en cache la réponse fraîche
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      })
      .catch(() =>
        // Offline → fallback cache
        caches.match(e.request).then(r => r || caches.match('/index.html'))
      )
  );
});
