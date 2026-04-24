const CACHE = 'apex-v7';

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

// ── Push notifications ────────────────────────────────────────────────────
self.addEventListener('push', e => {
  const data    = e.data?.json() ?? {};
  const title   = data.title || 'APEX';
  const options = {
    body:  data.body  || '',
    icon:  '/icon.png',
    badge: '/icon.png',
    data:  { url: data.url || '/' },
    vibrate: [200, 100, 200]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin)) { c.focus(); c.navigate(self.location.origin + url); return; }
      }
      return clients.openWindow(self.location.origin + url);
    })
  );
});

// ── Fetch (network-first) ─────────────────────────────────────────────────
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
