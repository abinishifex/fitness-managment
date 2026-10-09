/* FORGE service worker — app shell offline. API responses are NOT cached here. */
const SHELL_CACHE = 'forge-shell-v1';
const RUNTIME_CACHE = 'forge-runtime-v1';

const PRECACHE_URLS = [
  '/',
  '/app',
  '/app/workout',
  '/app/exercises',
  '/app/progress',
  '/app/profile',
  '/app/onboarding',
  '/login',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

function isApiRequest(url) {
  // Do not cache API — offline data layer owns localStorage cache
  if (url.pathname.startsWith('/api')) return true;
  if (url.port === '4000') return true;
  if (/\/api(\/|$)/.test(url.pathname)) return true;
  return false;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (isApiRequest(url)) return;

  // Cross-origin (fonts, CDN images): best-effort runtime cache
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        try {
          const fresh = await fetch(request);
          if (fresh.ok) cache.put(request, fresh.clone());
          return fresh;
        } catch {
          if (cached) return cached;
          throw new Error('offline');
        }
      }),
    );
    return;
  }

  // Navigations: network-first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const cached =
            (await cache.match(request)) ||
            (await cache.match('/app')) ||
            (await cache.match('/'));
          if (cached) return cached;
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })(),
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((fresh) => {
          if (fresh && fresh.ok) cache.put(request, fresh.clone());
          return fresh;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
