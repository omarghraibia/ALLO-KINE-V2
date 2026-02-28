const cacheName = 'allokine-v1';
const staticAssets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './logo.png',
  './phototerrain.jpg'
];

self.addEventListener('install', e => {
  // e.waitUntil garantit que le Service Worker ne s'installe pas tant que le cache n'est pas prêt
  e.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll(staticAssets))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', async e => {
  const req = e.request;
  const url = new URL(req.url);

  // Ne traiter que les requêtes vers notre propre origine.
  // Les appels vers d'autres domaines (Google, API externes...) sont
  // simplement passés au réseau sans tentative de mise en cache.
  // IMPORTANT : On exclut les appels API (/api/) du cache pour avoir toujours les données à jour.
  if (url.origin === location.origin && !url.pathname.startsWith('/api/')) {
    e.respondWith(cacheFirst(req));
  } else {
    e.respondWith(fetch(req)); // bypass cache for cross-origin
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  return cached || fetch(req);
}

async function networkAndCache(req) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);
    await cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    return await cache.match(req);
  }
}