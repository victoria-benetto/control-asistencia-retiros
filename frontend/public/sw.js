// VULPIARE Progressive Web App - Service Worker
const CACHE_NAME = 'vulpiare-pwa-v5';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/vulpiare_logo.png',
  '/pwa-192-v3.png',
  '/pwa-512-v3.png',
  '/pwa-192-maskable-v3.png',
  '/pwa-512-maskable-v3.png',
  '/apple-touch-icon-v3.png',
  '/pwa-192.png',
  '/pwa-512.png',
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

// 4. Push Event: Receive Web Push Notifications in background even if app is closed
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'VULPIARE Acrobacia Aérea', body: event.data.text() };
    }
  }

  const title = data.title || '💜 VULPIARE Acrobacia Aérea';
  const options = {
    body: data.body || 'Tenés una novedad en tu portal de VULPIARE.',
    icon: data.icon || '/vulpiare_logo.png',
    badge: data.badge || '/vulpiare_logo.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'vulpiare-notification',
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
      extra: data.data || {}
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Notification Click Event: Focus or open window when user taps the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una pestaña abierta de Vulpiare, enfocarla
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Si no hay ninguna pestaña abierta, abrir una nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

