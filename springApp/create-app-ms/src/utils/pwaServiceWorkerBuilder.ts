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

