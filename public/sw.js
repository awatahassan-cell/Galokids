// Galo Kids service worker — app-shell caching for offline + installability.
// Strategy:
//   - navigations: network-first, fall back to cached shell when offline
//   - same-origin static assets: stale-while-revalidate (cache as requested)
//   - API calls (/api/): always network (never serve stale store/POS data)
const CACHE = 'galokids-v2';
const SHELL = ['/', '/index.html'];

const isDevHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(self.location.hostname);

self.addEventListener('install', (event) => {
  if (isDevHost) { self.skipWaiting(); return; }
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // On dev, remove ourselves and all caches so Vite's dev server works normally.
  if (isDevHost) {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.claim())
    );
    return;
  }
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (isDevHost) return;                                 // never intercept in dev
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch { return; }
  if (url.origin !== self.location.origin) return;       // don't touch cross-origin (API, image CDNs)
  if (url.pathname.includes('/api/')) return;            // always hit the network for API data
  // Only handle static build assets and documents; ignore Vite/dev module paths.
  if (url.pathname.startsWith('/src/') || url.pathname.startsWith('/@')) return;

  // Navigations → network first, offline fallback to the cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then((r) => r || caches.match('/')).then((r) => r || Response.error())
      )
    );
    return;
  }

  // Static assets → stale-while-revalidate. Always resolve to a real Response.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached || Response.error());
      return cached || network;
    })
  );
});
