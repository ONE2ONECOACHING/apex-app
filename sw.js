const CACHE = 'apex-v1';
const STATIC = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/config.js',
  '/js/supabase.js',
  '/js/tdee.js',
  '/js/snap-calories.js',
  '/js/router.js',
  '/pages/login.js',
  '/pages/reset-password.js',
  '/pages/client/dashboard.js',
  '/pages/client/logbook.js',
  '/pages/client/plan.js',
  '/pages/client/snap.js',
  '/pages/client/historique.js',
  '/pages/coach/clients.js',
  '/pages/coach/client-edit.js',
  '/pages/coach/plan-edit.js',
  '/pages/coach/journal-view.js',
  '/pages/coach/habits-edit.js',
  '/icon.svg',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
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
  // API calls toujours réseau
  if (url.hostname.includes('supabase.co') || url.hostname.includes('workers.dev')) return;
  // Navigation → toujours index.html (SPA)
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.match('/index.html').then(r => r || fetch(e.request)));
    return;
  }
  // Statique → cache first
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
