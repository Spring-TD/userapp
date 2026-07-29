import crypto from 'crypto';
import { ServiceWorkerMeta } from '../types/pwaPublish';

export function buildServiceWorkerScript(appId: string, version: string): string {
  const cacheName = `springtd-pwa-${appId}-${version}`;
  return `
const CACHE_NAME = '${cacheName}';
self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
self.addEventListener('push', (event) => {
  let payload = { title: 'Notification', body: '', url: '/' };
  try {
    if (event.data) {
      payload = Object.assign(payload, event.data.json());
    }
  } catch (e) {}
  const title = payload.title || 'Notification';
  const options = {
    body: payload.body || '',
    icon: payload.icon,
    badge: payload.badge,
    data: {
      url: payload.url || '/',
      template: payload.template
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
`.trim();
}

export function buildServiceWorkerMeta(
  appId: string,
  version: string
): ServiceWorkerMeta {
  const script = buildServiceWorkerScript(appId, version);
  const hash = crypto.createHash('sha256').update(script).digest('hex');
  return {
    version,
    hash,
    path: `/api/v1/apps/${appId}/pwa/sw.js`,
    contentType: 'application/javascript'
  };
}
