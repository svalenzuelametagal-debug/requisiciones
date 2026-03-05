// Service Worker — Metagal Requisiciones
const CACHE = 'metagal-req-v1';

// Al instalar: cachear el index.html
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['./index.html', './manifest.json']))
  );
});

// Al activar: limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network first, cache fallback
self.addEventListener('fetch', e => {
  // Solo cachear recursos propios
  if (!e.request.url.startsWith(self.location.origin)) return;
  if (e.request.url.includes('api.github.com')) return;
  if (e.request.url.includes('login.microsoftonline.com')) return;
  if (e.request.url.includes('graph.microsoft.com')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Notificaciones: al hacer clic, enfocar ventana existente
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of list) {
        if (client.url.includes('index.html') || client.url.endsWith('/')) {
          return client.focus();
        }
      }
      // Si no hay ninguna, abrir una nueva
      return clients.openWindow('./index.html');
    })
  );
});

// Mensaje desde la app para enviar notificación
self.addEventListener('message', e => {
  if (e.data?.type === 'NOTIFY') {
    self.registration.showNotification(e.data.title, {
      body: e.data.body,
      tag: e.data.tag || 'metagal',
      icon: e.data.icon || './metagal_logo.png',
      badge: e.data.icon || './metagal_logo.png',
      requireInteraction: false,
      data: { url: e.data.url || './index.html' }
    });
  }
});
