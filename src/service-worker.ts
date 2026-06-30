/// <reference lib="webworker" />
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import {
	cleanupOutdatedCaches,
	createHandlerBoundToURL,
	precacheAndRoute
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Cachés de versiones anteriores del SW (estrategia runtime previa) que ya no se usan.
// Las borramos al activar para que un dispositivo con un SW viejo no siga sirviendo
// contenido obsoleto desde ellas.
const LEGACY_CACHES = ['app-shell', 'pages'];

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			await Promise.all(LEGACY_CACHES.map((name) => caches.delete(name)));
			await self.clients.claim();
		})()
	);
});

// Precachea el shell de la app (JS, CSS, iconos y el fallback prerenderizado) en
// `install`. Sin esto, la primera carga no la controla el SW y nada queda cacheado →
// la PWA no arranca offline. Los chunks dinámicos (chart.js, write-excel-file) se
// excluyen del manifest en vite.config para no inflar la instalación.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Fallback de navegación: cualquier ruta (SPA) se sirve desde el shell precacheado (`/`),
// de modo que la app carga offline en frío y en cualquier pestaña. El router cliente
// resuelve luego la ruta concreta. Se excluyen las llamadas a la API.
const navigationHandler = createHandlerBoundToURL('/');
registerRoute(new NavigationRoute(navigationHandler, { denylist: [/^\/api\//] }));

// Chunks cargados bajo demanda (chart.js, export XLSX…) que no van en el precache:
// se cachean en runtime al primer uso para que sigan disponibles offline.
registerRoute(
	({ request, url }) =>
		url.origin === self.location.origin &&
		(request.destination === 'script' || request.destination === 'style'),
	new StaleWhileRevalidate({ cacheName: 'lazy-chunks' })
);

// API: cola de reintentos offline (se reenvía al recuperar conexión).
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
	event.waitUntil(self.clients.openWindow('/'));
});
