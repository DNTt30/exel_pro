// DNTgs25 Service Worker
const CACHE_NAME = 'dntgs25-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './tu_mini_avatar.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[DNTgs25 SW] Precache partial error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

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
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET and external API / Supabase calls
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Stale-while-revalidate for static assets, network-first for HTML
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html') || caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((networkRes) => {
        if (networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// ── Push Notification Handler ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'DNTgs25', body: event.data.text() }; }

  const title   = data.title || 'DNTgs25 Thông báo';
  const options = {
    body:    data.body    || '',
    icon:    data.icon    || './icon-192.png',
    badge:   './icon-192.png',
    tag:     data.tag     || 'gs25-notify',
    data:    { url: data.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click — mở app và điều hướng đến url ────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Nếu app đang mở → focus và navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      // Nếu app chưa mở → mở tab mới
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
