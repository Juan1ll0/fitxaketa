/// <reference lib="webworker" />
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { registerRoute } from 'workbox-routing';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

const manifest = self.__WB_MANIFEST;

const assetUrls = manifest.map((entry) => entry.url);

registerRoute(
	({ request }) => assetUrls.some((url) => request.url.endsWith(url)),
	new CacheFirst({
		cacheName: 'app-shell',
		plugins: [new ExpirationPlugin({ maxEntries: 100 })]
	})
);

registerRoute(
	({ request }) => request.destination === 'document',
	new StaleWhileRevalidate({
		cacheName: 'pages',
		plugins: [new ExpirationPlugin({ maxEntries: 50 })]
	})
);

const bgSyncPlugin = new BackgroundSyncPlugin('api-queue', {
	maxRetentionTime: 24 * 60
});

registerRoute(
	({ url }) => url.pathname.startsWith('/api/'),
	new StaleWhileRevalidate({
		cacheName: 'api',
		plugins: [bgSyncPlugin]
	})
);

self.addEventListener('push', (event) => {
	if (!event.data) return;
	const data = event.data.json();
	event.waitUntil(
		self.registration.showNotification(data.title ?? 'Fitxaketa', {
			body: data.body ?? '',
			icon: '/icon-192.png',
			badge: '/icon-192.png'
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(clients.openWindow('/'));
});
