// VULPIARE Progressive Web App - Service Worker
const CACHE_NAME = 'vulpiare-pwa-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vulpiare_logo.png',
  '/pwa-192-v2.png',
  '/pwa-512-v2.png',
  '/pwa-192-maskable-v2.png',
  '/pwa-512-maskable-v2.png',
  '/apple-touch-icon-v2.png',
  '/pwa-192.png',
  '/pwa-512.png',
  '/pwa-192-maskable.png',
  '/pwa-512-maskable.png',
  '/apple-touch-icon.png'
];

// 1. Install Event: Cache essential shell and immediately activate
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 2. Activate Event: Clean up old caches and claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Fetch Event Strategy:
// - /api/* or non-GET requests: STRICTLY Network Only (never serve stale database or session data)
// - HTML navigation: Network first, fallback to cached index.html
// - Static assets (js, css, images, fonts): Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET and chrome-extension / non-http requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // API calls: Network strictly
  if (url.pathname.startsWith('/api')) {
    return;
  }

  // HTML page navigation: Network first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Static assets: Stale-While-Revalidate (Fast response + background refresh)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});
