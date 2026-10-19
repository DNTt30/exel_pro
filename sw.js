// Lịch Ca Service Worker
const CACHE_NAME = 'lichca-v4';
const APP_SHELL = new URL('./index.html', self.registration.scope).href;
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './assistant-avatar.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Lịch Ca SW] Precache partial error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && (key.startsWith('lichca-') || key.startsWith('dntgs25-'))) {
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
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(req);
          if (!response.ok) throw new Error('HTML unavailable');
          if (response.headers.get('content-type')?.includes('text/html')) {
            // Store only the known application shell, never an unrelated HTML page.
            const shell = new URL(APP_SHELL);
            if (url.pathname === shell.pathname || url.pathname === new URL('./', shell).pathname) {
              const write = caches.open(CACHE_NAME).then(cache => cache.put(APP_SHELL, response.clone())).catch(() => {});
              event.waitUntil(write);
              await write;
            }
          }
          return response;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return await cache.match(req) || await cache.match(APP_SHELL)
            || new Response('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Mất kết nối</title><p>Chưa tải được ứng dụng. Vui lòng kết nối mạng rồi tải lại trang.</p></html>', {
              status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' },
            });
        }
      })()
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then((networkRes) => {
        if (networkRes.status === 200) {
          const resClone = networkRes.clone();
          event.waitUntil(cache.put(req, resClone).catch(() => {}));
        }
        return networkRes;
      }).catch(() => cached || Response.error());
      event.waitUntil(fetchPromise.then(() => {}).catch(() => {}));

      return cached || fetchPromise;
    })
  );
});

// ── Push Notification Handler ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Lịch Ca', body: event.data.text() }; }

  const title   = data.title || 'Lịch Ca Thông báo';
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
