# Patrones PWA — Fitxaketa

> Principios generales en `.agents/skills/coding-standards.md`. Aquí lo específico de Service Worker, Dexie y offline.

---

## Checklist normativo

### Service Worker

- Estrategia SIEMPRE `injectManifest` — nunca `generateSW`
- `kit.serviceWorker.register: false` en vite.config.ts (el plugin PWA gestiona el registro)
- `globPatterns` de Workbox SIEMPRE con prefijo `client/` — sin él se precachean ficheros del servidor y rompe la app
- El manifest se lee de `self.__WB_MANIFEST` (inyectado en build) — no declarar globals alternativos
- Módulos virtuales (`virtual:pwa-register/svelte`) solo client-side — nunca en `+layout.server.ts`

### Dexie / IndexedDB

- Nueva versión de schema = `this.version(N+1).stores(...)` — NUNCA modificar una versión ya publicada
- Índices solo en campos que se consultan o filtran (target consulta histórico: < 200 ms)
- Toda escritura de fichaje va PRIMERO a IndexedDB (instantánea), el sync a GAS es posterior y no bloqueante

### Offline-first

- Flujo único: guardar local → ¿hay red? → sync → marcar `sincronizado` | sin red → Background Sync / listener `online`
- El reintento de sync usa el `clientId` (UUID) para que GAS deduplique
- El estado de sync es visible en la UI (componente indicador, contador de pendientes)

---

## Apéndice de ejemplos

### D1 — Config Vite PWA (patrón establecido)

```ts
VitePWA({
	strategies: 'injectManifest',
	srcDir: 'src',
	filename: 'service-worker.ts',
	registerType: 'autoUpdate',
	kit: { serviceWorker: { register: false } },
	injectManifest: {
		globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,webmanifest}']
	}
});
```

### D2 — Lectura del manifest en el SW

```ts
// src/service-worker.ts
declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const manifest = self.__WB_MANIFEST;
```

### D3 — Schema Dexie

```ts
// src/lib/db.ts
import Dexie, { type Table } from 'dexie';

interface Fichaje {
	id?: number;
	clientId: string; // UUID para idempotencia en GAS
	tipo: 'entrada' | 'salida';
	timestamp: Date;
	sincronizado: boolean;
	ubicacion?: { lat: number; lng: number };
}

class FitxaketaDB extends Dexie {
	fichajes!: Table<Fichaje>;
	constructor() {
		super('fitxaketa');
		this.version(1).stores({
			fichajes: '++id, clientId, tipo, timestamp, sincronizado'
		});
	}
}

export const db = new FitxaketaDB();
```

### D4 — Sync al reconectar

```ts
window.addEventListener('online', async () => {
	const pendientes = await db.fichajes.where('sincronizado').equals(0).toArray();
	for (const fichaje of pendientes) {
		await sincronizarFichaje(fichaje); // idempotente vía clientId
	}
});
```

### D5 — Manifest mínimo

```json
{
	"name": "Fitxaketa",
	"short_name": "Fitxaketa",
	"display": "standalone",
	"background_color": "#0f172a",
	"theme_color": "#3b82f6",
	"start_url": "/",
	"icons": [{ "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" }]
}
```
