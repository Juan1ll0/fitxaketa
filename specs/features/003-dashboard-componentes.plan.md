---
status: draft
spec: 003-dashboard-componentes
creada: 2026-06-20
autor: @planner
---

# Plan de Implementación — 003 Dashboard: Navegación por Tabs y Componentes Visuales

## Resumen

Estructura de navegación por bottom nav con 4 tabs (Fichar, Historial, Estadísticas, Mapa) y componentes visuales del dashboard: cronómetro de fichaje, gráfica de barras con Chart.js, y mapa de ubicaciones con Leaflet. Todos los datos se obtienen de Dexie (IndexedDB) — la integración con backend GAS se aborda en la spec 004.

**ACs totales:** 26
**Complejidad estimada:** L (multi-componente, dos librerías externas pesadas)
**Dependencias externas:** Feature 002 (Dexie/db.ts + app-state.ts) — ya implementada.

---

## Fase 1 — Instalación de dependencias y tipos

**Objetivo:** Instalar Chart.js y Leaflet con sus tipos. Establecer la base para el code-splitting.

### Tarea 1.1: Instalar Chart.js, Leaflet y tipos [S]

**Asignado:** `impl-svelte`

```bash
npm install chart.js leaflet
npm install -D @types/leaflet
```

> **Nota:** Chart.js incluye sus propios tipos TypeScript desde v4. `@types/leaflet` es necesario porque Leaflet no los incluye nativamente.

**Verificación:**

```bash
npm ls chart.js leaflet @types/leaflet  # todas aparecen
```

---

## Fase 2 — Utilidades puras

**Objetivo:** Extraer funciones de formateo reutilizables a `src/lib/utils/` (capa pura según dependency-cruiser). Estas funciones son usadas por múltiples componentes (Historial, Estadísticas, Mapa).

### Tarea 2.1: Crear `src/lib/utils/dashboard.ts` [S]

**Asignado:** `impl-svelte`
**ACs:** AC-13, AC-14, AC-16, AC-23

**Archivo:** `src/lib/utils/dashboard.ts` (NUEVO)

```typescript
import type { Jornada } from '$lib/db';

/**
 * Formatea un Date a string localizado es-ES (día, mes, hora, minuto).
 */
export function formatDateTime(date: Date | null | undefined): string {
	if (!date) return '—';
	return date.toLocaleString('es-ES', {
		day: '2-digit',
		month: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Formatea minutos a string legible (ej: "2h 30min").
 * Si es null, retorna "En curso".
 */
export function formatDuration(minutes: number | null | undefined): string {
	if (minutes == null) return 'En curso';
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (h === 0) return `${m}min`;
	return `${h}h ${m}min`;
}

/**
 * Convierte minutos a horas decimales (ej: 150min → 2.5h).
 */
export function minutesToDecimalHours(minutes: number | null | undefined): number {
	if (minutes == null) return 0;
	return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Formatea coordenadas a string legible.
 */
export function formatCoords(lat: number | null, lng: number | null): string {
	if (lat == null || lng == null) return '—';
	return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Filtra jornadas del mes actual (mes y año actuales).
 */
export function filterCurrentMonth(jornadas: Jornada[]): Jornada[] {
	const now = new Date();
	const currentMonth = now.getMonth();
	const currentYear = now.getFullYear();
	return jornadas.filter((j) => {
		const d = new Date(j.start_time);
		return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
	});
}

/**
 * Filtra jornadas que tienen coordenadas de inicio o fin no nulas.
 */
export function filterWithCoords(jornadas: Jornada[]): Jornada[] {
	return jornadas.filter(
		(j) =>
			(j.lat_start != null && j.lng_start != null) ||
			(j.lat_end != null && j.lng_end != null)
	);
}

/**
 * Obtiene la última ubicación conocida de las jornadas.
 * Retorna coordenadas por defecto (Bilbao: 43.263, -2.935) si no hay ninguna.
 */
export function getLastKnownLocation(
	jornadas: Jornada[]
): { lat: number; lng: number } {
	for (const j of jornadas) {
		if (j.lat_end != null && j.lng_end != null) {
			return { lat: j.lat_end, lng: j.lng_end };
		}
		if (j.lat_start != null && j.lng_start != null) {
			return { lat: j.lat_start, lng: j.lng_start };
		}
	}
	return { lat: 43.263, lng: -2.935 };
}
```

> **Nota:** Estas funciones son puras (sin side effects). `src/lib/utils/` tiene restricción de dependency-cruiser: no puede importar de componentes, stores, services, db ni rutas. Solo importa el **tipo** `Jornada` (import type, sin runtime dependency). Si depcruise lo rechaza, mover el tipo a un archivo `src/lib/types.ts` compartido.

---

## Fase 3 — Componentes Svelte base

**Objetivo:** Crear BottomNav, actualizar el layout raíz, y crear los componentes para las tabs Fichar e Historial.

### Tarea 3.1: Crear componente `BottomNav.svelte` [M]

**Asignado:** `impl-svelte`
**ACs:** AC-01, AC-02, AC-03, AC-04, AC-05

**Archivo:** `src/lib/components/BottomNav.svelte` (NUEVO)

Componente con las siguientes características:
- `position: fixed; bottom: 0` con `z-50`
- 4 tabs: Fichar (`/`), Historial (`/historial`), Estadísticas (`/estadisticas`), Mapa (`/mapa`)
- Cada tab: icono SVG inline + texto label
- Tab activo: comparar `$page.url.pathname` con la ruta del tab, resaltar con `text-primary`
- Tab inactivo: `text-text-muted`
- Fondo: `bg-surface-light` con borde superior sutil `border-t border-white/10`
- Ancho completo, padding horizontal, distribución `flex justify-around`

**Iconos SVG inline** (24x24, stroke-based, sin dependencias externas):
- Fichar: icono de reloj (circle + hands)
- Historial: icono de lista (lines)
- Estadísticas: icono de barras (bar chart)
- Mapa: icono de pin (map marker)

**Uso de `$page`:**

```typescript
import { page } from '$app/state';
```

> **Nota:** En Svelte 5 + SvelteKit, `$app/state` exporta `page` como reactive state. Usar `$derived` para `isActive`:
> ```typescript
> const isActive = (path: string) => $derived(page.url.pathname === path);
> ```
> Si `$app/state` no está disponible, usar el store clásico `import { page } from '$app/stores'` con `$page.url.pathname`.

---

### Tarea 3.2: Actualizar layout raíz `+layout.svelte` [S]

**Asignado:** `impl-svelte`
**ACs:** AC-05, AC-06

**Archivo:** `src/routes/+layout.svelte` (MODIFICAR)

Cambios:
1. Importar `BottomNav` desde `$lib/components/BottomNav.svelte`
2. Añadir `pb-20` (padding-bottom: 5rem) al contenedor principal para que el contenido no quede oculto bajo el nav fijo
3. Renderizar `<BottomNav />` después del `{@render children()}`
4. Eliminar el enlace a `/registros` del contenido (la navegación ahora es por tabs)

Estructura resultante:

```svelte
<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import PWAUpdatePrompt from '$lib/components/PWAUpdatePrompt.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#0f172a" />
</svelte:head>

<div class="min-h-screen bg-surface pb-20 text-text">
	{@render children()}
</div>

<BottomNav />
<PWAUpdatePrompt />
```

---

### Tarea 3.3: Actualizar página home `+page.svelte` (Tab Fichar) [M]

**Asignado:** `impl-svelte`
**ACs:** AC-07, AC-08, AC-09, AC-10, AC-11

**Archivo:** `src/routes/+page.svelte` (MODIFICAR)

Cambios respecto a la versión actual:
1. **Añadir indicador de estado:** texto "Trabajando" (con `text-success`) o "Parado" (con `text-text-muted`) sobre el cronómetro
2. **Eliminar** el enlace `<a href="/registros">` (la navegación ahora es por bottom nav)
3. **Mantener** la lógica existente de cronómetro + botón Start/Stop (ya funciona con `app-state.ts`)
4. **Añadir `ssr = false`** en el módulo compañero `+page.ts` (o inline si SvelteKit lo permite) porque `initAppState()` usa Dexie

> **Nota SSR:** Crear `src/routes/+page.ts` con `export const ssr = false;` para deshabilitar SSR en la home, ya que `initAppState()` llama a `getOpenJornada()` que usa Dexie/IndexedDB.

**Archivo adicional:** `src/routes/+page.ts` (NUEVO)

```typescript
export const ssr = false;
```

---

### Tarea 3.4: Crear ruta `/historial` y migrar desde `/registros` [M]

**Asignado:** `impl-svelte`
**ACs:** AC-12, AC-13, AC-14, AC-15

**Archivo:** `src/routes/historial/+page.svelte` (NUEVO)

Migrar la lógica de `src/routes/registros/+page.svelte` con estos cambios:
1. **Título:** "Historial" en lugar de "Registros"
2. **Eliminar** el enlace "Volver" (la navegación es por tabs)
3. **Usar utilidades de `$lib/utils/dashboard.ts`:** `formatDateTime`, `formatDuration`, `formatCoords` en lugar de funciones locales
4. **Mostrar por registro:** fecha, hora inicio, hora fin, duración formateada, sync (✅/❌)
5. **Orden:** `getAllJornadas()` ya retorna ordenado por `start_time` descendente
6. **Añadir `ssr = false`** vía `+page.ts` compañero

**Archivo:** `src/routes/historial/+page.ts` (NUEVO)

```typescript
export const ssr = false;
```

---

### Tarea 3.5: Eliminar ruta `/registros` [S]

**Asignado:** `impl-svelte`
**ACs:** AC-06

**Acción:** Eliminar el directorio `src/routes/registros/` completo.

> **Nota:** La ruta `/registros` queda obsoleta. El bottom nav enlaza a `/historial`. Si en el futuro se necesita redirección, se puede añadir un hook de SvelteKit, pero por ahora la eliminación limpia es suficiente (la app es PWA, no hay enlaces externos indexados).

---

## Fase 4 — Componentes con librerías externas (Chart.js + Leaflet)

**Objetivo:** Implementar los componentes de gráfica y mapa con lazy loading para respetar el bundle budget.

### Tarea 4.1: Crear componente `StatsChart.svelte` (Chart.js) [L]

**Asignado:** `impl-ui`
**ACs:** AC-16, AC-17, AC-18, AC-19, AC-20, AC-21, AC-22

**Archivo:** `src/lib/components/StatsChart.svelte` (NUEVO)

Estrategia de implementación:

1. **Lazy import de Chart.js** — usar dynamic `import()` para code-splitting:

```typescript
let Chart: typeof import('chart.js').Chart | null = $state(null);

$effect(() => {
	import('chart.js').then((mod) => {
		mod.Chart.register(
			mod.BarController,
			mod.BarElement,
			mod.CategoryScale,
			mod.LinearScale,
			mod.Tooltip,
			mod.Legend
		);
		Chart = mod.Chart;
	});
});
```

2. **Canvas element:** `<canvas>` nativo en el markup, ref con `bind:this`
3. **Inicialización:** cuando `Chart` esté disponible y el canvas exista, crear la instancia
4. **Datos:** recibir `jornadas: Jornada[]` como prop, usar `filterCurrentMonth()` y `minutesToDecimalHours()` de `$lib/utils/dashboard.ts`
5. **Labels (eje X):** fecha formateada de cada jornada (`formatDateTime`)
6. **Data (eje Y):** horas decimales trabajadas (`minutesToDecimalHours(j.duration)`)
7. **Colores:** usar tokens del theme (`--color-primary` para barras, `--color-text-muted` para labels)
8. **Responsivo:** `options.responsive: true, maintainAspectRatio: false`
9. **Cleanup:** destruir la instancia de Chart en el return del `$effect`
10. **Estado de carga:** mostrar skeleton/spinner mientras Chart.js se carga

> **Nota bundle:** Chart.js parcial (solo Bar) es ~35-40 KB gzip. El dynamic import genera un chunk separado que solo se carga al visitar `/estadisticas`.

> **Nota SSR:** Chart.js necesita DOM. El componente se usa en una ruta con `ssr = false`, pero además el lazy import garantiza que solo se ejecuta en el cliente.

> **Nota ESLint:** El `$effect` con async import puede disparar warnings. Usar el patrón `.then()` en lugar de `await` dentro de `$effect`.

---

### Tarea 4.2: Crear ruta `/estadisticas` [M]

**Asignado:** `impl-svelte`
**ACs:** AC-16, AC-25, AC-26

**Archivo:** `src/routes/estadisticas/+page.svelte` (NUEVO)

```svelte
<script lang="ts">
	import { getAllJornadas, type Jornada } from '$lib/db';
	import StatsChart from '$lib/components/StatsChart.svelte';

	let jornadas = $state<Jornada[]>([]);
	let loading = $state(true);

	$effect(() => {
		getAllJornadas().then((data) => {
			jornadas = data;
			loading = false;
		});
	});
</script>

<svelte:head>
	<title>Estadísticas - Fitxaketa</title>
</svelte:head>

<div class="px-4 py-6">
	<h1 class="mb-6 text-2xl font-bold">Estadísticas</h1>
	{#if loading}
		<div class="flex h-64 items-center justify-center">
			<p class="text-text-muted">Cargando gráfica...</p>
		</div>
	{:else if jornadas.length === 0}
		<div class="rounded-2xl bg-surface-light p-8 text-center">
			<p class="text-text-muted">No hay datos suficientes para mostrar estadísticas</p>
		</div>
	{:else}
		<div class="h-80">
			<StatsChart {jornadas} />
		</div>
	{/if}
</div>
```

**Archivo:** `src/routes/estadisticas/+page.ts` (NUEVO)

```typescript
export const ssr = false;
```

---

### Tarea 4.3: Crear componente `LocationMap.svelte` (Leaflet) [L]

**Asignado:** `impl-ui`
**ACs:** AC-23, AC-24, AC-25, AC-26, AC-27, AC-28

**Archivo:** `src/lib/components/LocationMap.svelte` (NUEVO)

Estrategia de implementación:

1. **Lazy import de Leaflet + CSS:**

```typescript
let L: typeof import('leaflet') | null = $state(null);

$effect(() => {
	Promise.all([
		import('leaflet'),
		import('leaflet/dist/leaflet.css')
	]).then(([leaflet]) => {
		L = leaflet.default ?? leaflet;
	});
});
```

2. **Contenedor:** `<div id="map" class="h-full w-full rounded-xl"></div>` con `bind:this`
3. **Inicialización del mapa:** cuando `L` y el contenedor estén disponibles:
   - `L.map(mapElement).setView(center, 13)`
   - Tile layer: CartoDB Dark Matter (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`) para consistencia con el tema oscuro. Atribución de OSM mantenida.
   - Si se prefiere OSM estándar + filtro CSS: `filter: invert(100%) hue-rotate(180deg) brightness(95%)` sobre el contenedor
4. **Marcadores:** iterar jornadas con coords (usar `filterWithCoords()` de utils):
   - Pin verde para `lat_start/lng_start` (entrada)
   - Pin rojo para `lat_end/lng_end` (salida)
   - Popup: `fecha, hora, acción (inicio/fin)` usando `formatDateTime()`
5. **Centrado:** usar `getLastKnownLocation()` de utils
6. **Cleanup:** `map.remove()` en el return del `$effect`
7. **Props:** `jornadas: Jornada[]`

> **Nota Leaflet icons:** Leaflet tiene un bug conocido con webpack/Vite donde los iconos por defecto no cargan. Solución: importar los iconos manualmente o usar `L.Icon.Default.mergeOptions({ iconRetinaUrl: ..., iconUrl: ..., shadowUrl: ... })`. Alternativamente, usar `L.circleMarker()` en lugar de `L.marker()` para evitar el problema de los iconos.

> **Nota CSS import:** `import('leaflet/dist/leaflet.css')` puede no funcionar con todos los bundlers. Alternativa: importar el CSS estáticamente en el componente con `import 'leaflet/dist/leaflet.css'` al nivel superior (se tree-shakea si no se usa). Si esto causa problemas SSR, mover la importación al `$effect`.

> **Nota estilo oscuro:** La spec sugiere OSM + filtro CSS o CartoDB Dark Matter. Se recomienda **CartoDB Dark Matter** como primera opción (mejor integración visual, sin hacks CSS). El fallback con filtro CSS sobre OSM es la alternativa.

---

### Tarea 4.4: Crear ruta `/mapa` [M]

**Asignado:** `impl-svelte`
**ACs:** AC-23, AC-25, AC-26

**Archivo:** `src/routes/mapa/+page.svelte` (NUEVO)

```svelte
<script lang="ts">
	import { getAllJornadas, type Jornada } from '$lib/db';
	import LocationMap from '$lib/components/LocationMap.svelte';

	let jornadas = $state<Jornada[]>([]);
	let loading = $state(true);

	$effect(() => {
		getAllJornadas().then((data) => {
			jornadas = data;
			loading = false;
		});
	});
</script>

<svelte:head>
	<title>Mapa - Fitxaketa</title>
</svelte:head>

<div class="flex h-[calc(100vh-8rem)] flex-col px-4 py-6">
	<h1 class="mb-4 text-2xl font-bold">Mapa</h1>
	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-text-muted">Cargando mapa...</p>
		</div>
	{:else}
		<div class="flex-1">
			<LocationMap {jornadas} />
		</div>
	{/if}
</div>
```

**Archivo:** `src/routes/mapa/+page.ts` (NUEVO)

```typescript
export const ssr = false;
```

---

## Fase 5 — Verificación y quality gate

**Objetivo:** Asegurar que todo compila, los tipos son correctos, el bundle respeta el budget, y no hay regresiones.

### Tarea 5.1: Verificar tipos y build [S]

**Asignado:** `tester`

```bash
npm run format && npm run lint && npm run check
npm run build
```

**Verificaciones:**
- `svelte-check` sin errores ni warnings
- `eslint` sin errores (complejidad ≤ 10, max-lines ≤ 150 para .svelte, ≤ 120 para .ts)
- Build exitoso sin errores de SSR

---

### Tarea 5.2: Verificar bundle size [S]

**Asignado:** `tester`

```bash
npm run size
```

**Verificación:**
- Entry JS < 150 KB gzip
- Total JS < 300 KB gzip
- Chart.js y Leaflet deben aparecer como chunks separados (code-splitting)

> **Nota:** Si el entry supera 150 KB, revisar que los dynamic imports de Chart.js y Leaflet están generando chunks separados. SvelteKit debería hacerlo automáticamente al usar `import()` dinámico.

---

### Tarea 5.3: Verificar dependency-cruiser [S]

**Asignado:** `tester`

```bash
npm run depcruise
```

**Verificación:**
- `src/lib/utils/dashboard.ts` no importa de componentes, stores, services ni rutas
- Si `import type { Jornada } from '$lib/db'` viola la regla `utils-son-puras`, mover la interfaz `Jornada` a `src/lib/types.ts` y re-exportar desde `db.ts`

---

### Tarea 5.4: Verificar Knip y código muerto [S]

**Asignado:** `tester`

```bash
npm run knip
```

**Verificación:**
- Los nuevos componentes y rutas no se reportan como código muerto
- La ruta `/registros` eliminada no deja exports huérfanos

---

### Tarea 5.5: Verificación funcional manual [M]

**Asignado:** `tester`

| Escenario | Pasos | Resultado esperado |
|-----------|-------|--------------------|
| Bottom nav | Navegar entre las 4 tabs | Tabs se resaltan, contenido cambia, sin recarga |
| Cronómetro | Pulsar "Fichar entrada", esperar 5s | Tiempo avanza, botón cambia a "Fichar salida" |
| Persistencia | Recargar página con fichaje activo | Cronómetro continúa desde el timestamp |
| Indicador estado | Fichar entrada → ver texto | Muestra "Trabajando" en verde |
| Historial | Tener >3 jornadas, ir a Historial | Listado con fecha, horas, duración, sync |
| Gráfica | Tener >3 fichajes, ir a Estadísticas | Barras visibles por jornada, mes actual |
| Mapa | Ir a Mapa con jornadas con coords | Pines visibles, mapa centrado |
| Popup pin | Click en un pin | Popup con fecha, hora, acción |
| Mapa vacío | Ir a Mapa sin jornadas con coords | Mapa centrado en coords por defecto |

---

## Resumen de archivos

### Archivos nuevos

| Archivo | Fase | Agente | Complejidad |
|---------|------|--------|-------------|
| `src/lib/utils/dashboard.ts` | 2 | `impl-svelte` | S |
| `src/lib/components/BottomNav.svelte` | 3 | `impl-svelte` | M |
| `src/routes/+page.ts` | 3 | `impl-svelte` | S |
| `src/routes/historial/+page.svelte` | 3 | `impl-svelte` | M |
| `src/routes/historial/+page.ts` | 3 | `impl-svelte` | S |
| `src/lib/components/StatsChart.svelte` | 4 | `impl-ui` | L |
| `src/routes/estadisticas/+page.svelte` | 4 | `impl-svelte` | M |
| `src/routes/estadisticas/+page.ts` | 4 | `impl-svelte` | S |
| `src/lib/components/LocationMap.svelte` | 4 | `impl-ui` | L |
| `src/routes/mapa/+page.svelte` | 4 | `impl-svelte` | M |
| `src/routes/mapa/+page.ts` | 4 | `impl-svelte` | S |

### Archivos modificados

| Archivo | Fase | Agente | Complejidad |
|---------|------|--------|-------------|
| `package.json` (deps: chart.js, leaflet, @types/leaflet) | 1 | `impl-svelte` | S |
| `src/routes/+layout.svelte` (BottomNav + padding) | 3 | `impl-svelte` | S |
| `src/routes/+page.svelte` (indicador estado, eliminar link) | 3 | `impl-svelte` | M |

### Archivos/directorios eliminados

| Archivo | Fase | Agente | Razón |
|---------|------|--------|-------|
| `src/routes/registros/` (directorio completo) | 3 | `impl-svelte` | Migrado a `/historial` |

---

## Dependencias entre tareas

```
Fase 1 (instalación)
  └── 1.1 deps

Fase 2 (utilidades) ← depende de Fase 1 (tipos de Jornada)
  └── 2.1 dashboard.ts

Fase 3 (componentes base) ← depende de Fase 2
  ├── 3.1 BottomNav
  ├── 3.2 layout (depende de 3.1)
  ├── 3.3 home/+page (independiente de 3.1, pero 3.2 debe estar)
  ├── 3.4 historial/+page (depende de 2.1)
  └── 3.5 eliminar /registros (depende de 3.4)

Fase 4 (librerías externas) ← depende de Fases 1 y 2
  ├── 4.1 StatsChart (depende de 1.1, 2.1)
  ├── 4.2 estadisticas/+page (depende de 4.1)
  ├── 4.3 LocationMap (depende de 1.1, 2.1)
  └── 4.4 mapa/+page (depende de 4.3)

Fase 5 (verificación) ← depende de Fases 3 y 4
  ├── 5.1 tipos + build
  ├── 5.2 bundle size
  ├── 5.3 depcruise
  ├── 5.4 knip
  └── 5.5 funcional manual
```

**Paralelizable:** Las tareas 4.1+4.2 (Chart.js) y 4.3+4.4 (Leaflet) son independientes entre sí y pueden ejecutarse en paralelo por `impl-ui` y `impl-svelte`.

---

## Riesgos técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| **Chart.js bundle excede budget** | Media | Alto | Importar solo módulos necesarios (BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend). Verificar con `npm run size`. Si excede, considerar chart.js/auto vs tree-shaking manual. |
| **Leaflet icons no cargan con Vite** | Alta | Medio | Bug conocido de Leaflet con bundlers. Usar `L.circleMarker()` en lugar de `L.marker()` para evitar dependencia de iconos PNG, o configurar `L.Icon.Default` manualmente con las URLs correctas. |
| **`import('leaflet/dist/leaflet.css')` dinámico** | Media | Medio | Puede no funcionar con Vite. Fallback: importar CSS estáticamente en el componente o inyectar `<link>` dinámicamente en `onMount`. |
| **dependency-cruiser: utils importa de db** | Media | Medio | `import type` no tiene runtime cost, pero depcruise puede marcarlo. Si falla, extraer `Jornada` interface a `src/lib/types.ts`. |
| **SSR con Dexie en home `/`** | Baja | Alto | `+page.ts` con `ssr = false` lo previene. Si se olvida, el build fallará con "IndexedDB is not defined". |
| **`$app/state` vs `$app/stores`** | Baja | Bajo | SvelteKit v2 con Svelte 5 debería soportar `$app/state`. Si no está disponible, usar `$app/stores` con el prefijo `$` clásico. |
| **CartoDB Dark Matter tiles lentas** | Baja | Bajo | Si las tiles de CartoDB cargan lento, fallback a OSM + filtro CSS `invert(100%) hue-rotate(180deg)`. |
| **max-lines en StatsChart/LocationMap** | Media | Medio | Componentes con Chart.js/Leaflet tienden a ser largos. Si superan 150 líneas, extraer la lógica de inicialización a funciones helper en `$lib/utils/` o en un módulo compañero `.ts`. |

---

## Checklist de ACs para `@tester`

### Navegación por tabs (Bottom Nav)

- [ ] AC-01: Bottom nav fijo en la parte inferior con 4 tabs: Fichar, Historial, Estadísticas, Mapa
- [ ] AC-02: Cada tab tiene icono SVG + texto
- [ ] AC-03: Tab activo resaltado con `--color-primary`
- [ ] AC-04: Navegación entre tabs sin recarga de página
- [ ] AC-05: Layout compartido con `{@render children()}` para el contenido
- [ ] AC-06: Las rutas existentes (`/` y `/registros`) se reorganizan bajo la nueva estructura

### Tab Fichar (home `/`)

- [ ] AC-07: Cronómetro visible mostrando tiempo transcurrido (reutiliza `getElapsed()`)
- [ ] AC-08: Botón Start/Stop llama a `startJornada()` / `stopJornada()`
- [ ] AC-09: Estado del botón reactivo: "Fichar entrada" / "Fichar salida"
- [ ] AC-10: Cronómetro persiste ante recargas (basado en `start_time` de Dexie)
- [ ] AC-11: Indicador visual "Trabajando" / "Parado"

### Tab Historial (`/historial`)

- [ ] AC-12: Listado de todas las jornadas de Dexie
- [ ] AC-13: Cada registro muestra fecha, hora inicio, hora fin, duración, sync (✅/❌)
- [ ] AC-14: Lista ordenada por `start_time` descendente
- [ ] AC-15: Lógica migrada desde `/registros`

### Tab Estadísticas (`/estadisticas`)

- [ ] AC-16: Gráfica de barras con Chart.js (horas decimales por jornada)
- [ ] AC-17: Eje X: fechas de fichajes del mes en curso
- [ ] AC-18: Eje Y: horas decimales trabajadas
- [ ] AC-19: Puede haber más de una barra por día
- [ ] AC-20: Datos de `getAllJornadas()` de Dexie
- [ ] AC-21: Gráfica responsiva
- [ ] AC-22: Colores de la gráfica usan tokens del theme

### Tab Mapa (`/mapa`)

- [ ] AC-23: Mapa Leaflet ocupando el espacio disponible
- [ ] AC-24: Pines en coordenadas de fichajes (lat_start, lng_start, lat_end, lng_end)
- [ ] AC-25: Solo muestra pines para jornadas con coordenadas no nulas
- [ ] AC-26: Al hacer clic en un pin, popup con fecha, hora, acción
- [ ] AC-27: Mapa centrado en la última ubicación conocida (o coords por defecto)
- [ ] AC-28: Tile layer de OpenStreetMap (o CartoDB) con estilo oscuro

### Integración y datos

- [ ] AC-29: Todos los datos se leen de Dexie (sin peticiones HTTP)
- [ ] AC-30: Componentes cliente-only (SSR deshabilitado)
- [ ] AC-31: Chart.js y Leaflet se cargan solo en sus respectivas pestañas (lazy imports)

### Build y quality gate

- [ ] AC-32: `npm run build` sin errores
- [ ] AC-33: `npm run size` dentro del budget (150 KB entry / 300 KB total)
- [ ] AC-34: `npm run check` sin errores
- [ ] AC-35: `npm run depcruise` sin violaciones de capas
