const CACHE_NAME = 'keibakun-v1';
const BASE = '/horsebloodline';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll([`${BASE}/`, `${BASE}/index.html`])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/reviews/') || e.request.url.includes('.json')) {
    e.respondWith(fetch(e.request).then(r => { caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone())); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request)));
});
