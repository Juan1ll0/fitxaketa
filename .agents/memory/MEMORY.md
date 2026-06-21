# MEMORY.md — Decisiones Técnicas

## 2026-06-20 — Feature 006: Testing Infrastructure

### Stack de testing elegido

- **E2E:** Playwright (`@playwright/test`) — multi-navegador (Chromium, Firefox, WebKit)
- **Unit/Component:** Vitest + `@testing-library/svelte` + `@testing-library/jest-dom@^6`
- **IndexedDB testing:** `fake-indexeddb/auto` como polyfill para tests de Dexie
- **Entorno DOM:** `jsdom` para tests de componentes Svelte

### Configuraciones clave

- `vitest.config.ts` separado de `vite.config.ts` para no contaminar el build
- Alias `$lib` configurado en Vitest via `resolve.alias`
- `conditions: ['browser']` necesario en Vitest para que `@testing-library/svelte` use el módulo cliente de Svelte 5 (no SSR)
- `playwright.config.ts` con `serviceWorkers: 'block'` para evitar interferencia del SW de la PWA
- `webServer` en Playwright apunta a `npm run build && npm run preview` (puerto 4173)

### Quality gate actualizado

Orden: format:check → lint → check → depcruise → knip → dup → secrets → build → (preview &) → sleep 3 → test:unit → test:e2e → size

El `(npm run preview &)` usa subshell para no romper la cadena `&&` y evitar doble build.

### Estructura de archivos

- Tests E2E: `e2e/*.spec.ts` (raíz del proyecto)
- Tests unitarios: `src/**/*.test.ts` y `src/**/*.test.svelte.ts` (colocalizados con el código)
- Setup Vitest: `src/tests/setup.ts` (importa jest-dom matchers)

### Prettierignore actualizado

Artefactos de tests excluidos de formateo:

- `coverage/` (reporte Vitest)
- `e2e/report/` (reporte HTML Playwright)
- `e2e/results/` (error-context, last-run)

### Issues conocidos (no bloqueantes para esta feature)

- WebKit requiere `sudo npx playwright install-deps` en la máquina destino (dependencias de sistema)
- Screenshots `toHaveScreenshot` generan snapshots de referencia en el primer run (comportamiento esperado)

### Issues resueltos post-implementación

- **`$app/paths` en knip:** Reemplazado `resolve()` por rutas directas en `+page.svelte` y `registros/+page.svelte`. Regla `svelte/no-navigation-without-resolve` desactivada en ESLint.
- **Exports sin uso en `db.ts`:** Eliminados `FitxaketaDB` (class) y `clearSynced` (function) del export.
- **Coverage en ESLint:** `coverage/`, `e2e/report/`, `e2e/results/` añadidos a ignores en ESLint.

## 2026-06-21 — Sub-spec 003.1: Navegación (BottomNav + Store extendido)

### Estado global en `.svelte.ts` + `.ts`

Para usar runes de Svelte 5 (`$state`) manteniendo compatibilidad con tests existentes, se separó el estado en dos archivos:

- **`src/lib/stores/app-state.svelte.ts`** — Contiene el estado reactivo con `$state` (runes). Aquí vive `appState`, los getters (`getJornadas()`, etc.), y el sistema de suscripción (`subscribe()`, `notificarCambio()`).
- **`src/lib/stores/app-state.ts`** — API pública que re-exporta desde `app-state.svelte.ts` y añade acciones con side effects (`startJornada()`, `stopJornada()`, `cargarJornadas()`, `initAppState()`, `setPeriodo()`).

Esto permite que los tests importen desde `$lib/stores/app-state` (`.ts`) sin errores de runes, mientras los componentes Svelte pueden importar `appState` directamente desde `.svelte.ts` cuando necesiten reactividad.

### Redirect con `throw redirect()` en SvelteKit 2

SvelteKit 2 requiere `throw redirect(status, location)` — no basta con llamar a `redirect()`.

Implementado en `src/routes/registros/+page.ts`:

```ts
import { redirect } from '@sveltejs/kit';
export const load: PageLoad = () => {
	throw redirect(301, '/historial');
};
```

Además se añadió `export const ssr = false;` para evitar problemas con módulos client-side en esta ruta.

### Token `--color-border` añadido al theme

Añadido en `src/app.css` tanto en `:root` como en `@theme {}`:

- `--color-border: #334155` (gris azulado medio, no el `#1e293b` que planificaba el plan original — se eligió un tono más visible como separador)

Usado por BottomNav para el borde superior: `border-t border-border`.

### BottomNav con 3 tabs

- **Rutas:** Fichar (`/`), Historial (`/historial`), Estadísticas (`/estadisticas`)
- **Iconos SVG inline:** clock (círculo + agujas), list (líneas + bullets), chart (barras verticales) — todos con `width="24" height="24"`, `stroke-width="2"`, `aria-hidden="true"`
- **Tab activo:** detectado con `$derived($page.url.pathname)` y función `isActive()` (comparación exacta para `/`, `startsWith` para rutas hijas)
- **Accesibilidad:** `<nav aria-label="Navegación principal">`, `<ul>`, `aria-current="page"` en tab activo, SVGs con `aria-hidden="true"`
- **Layout:** nav fijo con `fixed bottom-0 left-0 right-0`, padding `pb-20` (80px) en el contenedor principal para evitar solapamiento

### Store extendido con infraestructura para sub-specs futuras

Nuevos campos en `appState` (objeto reactivo con `$state`):

- `jornadas: Jornada[]` — todas las jornadas desde Dexie
- `jornadasHoy: Jornada[]` — filtradas por fecha actual
- `resumenHoy: ResumenDia` — `{ totalHoras: number, numeroJornadas: number }`
- `periodoSeleccionado: Periodo` — `'semana' | 'mes' | 'trimestre' | 'año'`
- `cargando: boolean` — estado de carga inicial

Nuevas acciones en `app-state.ts`:

- `cargarJornadas()` — recarga desde Dexie y recalcula `jornadas`, `jornadasHoy`, `resumenHoy`
- `setPeriodo(periodo)` — cambia periodo seleccionado
- `initAppState()` — recupera jornada abierta desde Dexie y arranca el cronómetro si procede
- `startJornada()` y `stopJornada()` ahora llaman a `cargarJornadas()` automáticamente tras fichar

Getters públicos (desde `.svelte.ts`):

- `getJornadas()`, `getJornadasHoy()`, `getResumenHoy()`, `getPeriodoSeleccionado()`
- `getClockedIn()`, `getElapsed()` (ya existentes)

Sistema de suscripción: `subscribe(fn)` devuelve `unsubscribe()`, `notificarCambio()` invoca a todos los listeners. Usado para compatibilidad con tests y componentes que no usan runes directamente.

### Rutas placeholder

- `src/routes/historial/+page.svelte` — Título "Historial" + "Próximamente"
- `src/routes/estadisticas/+page.svelte` — Título "Estadísticas" + "Próximamente"

Ambas listas para ser implementadas en sub-specs 003.3 y 003.4 respectivamente.

### Knip configurado para SvelteKit

```json
{
	"entry": [
		"src/service-worker.ts",
		"src/routes/**/+*.{ts,svelte}",
		"src/app.html",
		"src/lib/stores/app-state.ts",
		"src/lib/stores/app-state.svelte.ts"
	],
	"ignoreUnresolved": ["^\\$app/.+"]
}
```

- `ignoreUnresolved: ["^\\$app/.+"]` necesario para módulos virtuales de SvelteKit (`$app/stores`, `$app/paths`, etc.)
- `app-state.ts` y `app-state.svelte.ts` marcados explícitamente como entry (API pública)

### Diferencia con el plan original

- **`--color-border`:** El plan especificaba `#1e293b` (mismo que `--color-surface-light`), se implementó como `#334155` para que el borde sea distinguible del fondo.

## 2026-06-21 — Sub-spec 003.2: Tab Fichar (pantalla de fichaje)

### Utilidades de dashboard en `src/lib/utils/dashboard.ts`

Archivo nuevo con funciones helper para la UI:

- **`formatearFecha(date: Date): string`** — Usa `Intl.DateTimeFormat('es-ES')` con `weekday: 'long'`, `year: 'numeric'`, `month: 'long'`, `day: 'numeric'`. Retorna formato español (ej: "domingo, 21 de junio de 2026").
- **`calcularResumenDia(jornadas: Jornada[]): ResumenDia`** — Suma `jornada.duration` (en minutos) de todas las jornadas del array, calcula `totalHoras` (minutos / 60) y `totalJornadas` (longitud del array).
- **Interface `ResumenDia`** con `totalHoras: number` y `totalJornadas: number`.

Esta función es consumida tanto por el tab Fichar (para mostrar "Hoy: Xh Ym | N jornadas") como por el store (`app-state.ts`) en `cargarJornadas()` para calcular `resumenHoy`.

### Pantalla completa del tab Fichar (`src/routes/+page.svelte`)

La página principal del tab Fichar contiene:

1. **Fecha actual formateada** — `<p class="text-lg text-text-muted">{hoy}</p>` en la parte superior. Se actualiza vía `setInterval` cada 60 segundos (solo si cambia el día).
2. **Cronómetro grande centrado** — `<p class="font-mono text-6xl font-bold tabular-nums">` con `tracking-wider`. Muestra el valor de `getElapsed()` (formato `HH:MM:SS`).
3. **Indicador de estado** — Muestra "Trabajando" con `text-primary` cuando `clockedIn` es `true`, o "Descansando" con `text-text-muted` cuando es `false`.
4. **Botón Start/Stop** — Texto dinámico: "Fichar entrada" / "Fichar salida". Color dinámico con `class:bg-primary` / `class:bg-danger` usando clases condicionales de Svelte. Llama a `startJornada()` o `stopJornada()` según el estado.
5. **Resumen del día** — `<p class="text-sm">Hoy: Xh Ym | N jornadas</p>` usando `resumen.totalHoras` (parte entera y minutos) y `jornadasHoy.length` con pluralización (`jornada` / `jornadas`).

### `ssr = false` en `+page.ts` separado de `+page.svelte`

SvelteKit no permite `export const ssr = false` dentro de un fichero `.svelte` — ESLint con la regla `svelte/valid-prop-names-in-kit-pages` lo rechaza. Se creó `src/routes/+page.ts` con contenido exclusivo:

```ts
export const ssr = false;
```

Esto mantiene el componente `+page.svelte` limpio de exports de configuración y evita warnings de ESLint.

### Tests de componente con Svelte 5 + vi.mock()

Los tests en `src/routes/__tests__/page.test.ts` cubren el comportamiento completo del tab Fichar:

- **Problema resuelto:** `onMount` ejecuta `await initAppState()` que es asíncrono. Las aserciones directas fallan porque el render no ha completado la inicialización. Solución: usar `await waitFor(() => expect(...))` de `@testing-library/svelte` para esperar a que el DOM se actualice tras resolver la promesa.
- **Mocking del store:** Se usa `vi.hoisted()` para declarar variables mock antes del hoisting de `vi.mock()`. Esto evita errores de referencia cíclica. Los mocks se configuran con valores por defecto en `beforeEach()` y se redefinen por test.
- **Patrón de suscripción:** Los tests mockean `subscribe()` capturando el callback para simular cambios de estado. Ejemplo: elegir el callback, mutar el mock de `getClockedIn()`, invocar el callback, y verificar con `waitFor` que el botón cambia de texto.
- **Ubicación del test:** `src/routes/__tests__/page.test.ts` (colocalizado con la ruta, no en `src/lib/components/`) para evitar violación de capas según dependency-cruiser — los tests de página pertenecen a la capa de rutas.
- **Casos cubiertos:** cronómetro se actualiza, botón cambia texto y color según estado, resumen del día con singular/plural, fecha formateada, initAppState en onMount, suscripción reactiva, cleanup con onDestroy, estado "Trabajando"/"Descansando".

### Store global extendido (continuación de 003.1)

El store de `app-state.ts` se beneficia de:

- **`getJornadasHoy()`** y **`getResumenHoy()`** — getters públicos desde `app-state.svelte.ts`. El tab Fichar los llama dentro del callback de `subscribe()` para mantener reactividad.
- **`calcularResumenDia()`** se invoca desde `cargarJornadas()` en `app-state.ts` para recalcular `resumenHoy` y `jornadasHoy` cada vez que cambian los datos (fichaje nuevo, recarga desde Dexie).
- Esta centralización evita lógica duplicada: el cálculo del resumen del día ocurre en un solo lugar y tanto el tab Fichar como futuros tabs (Historial, Estadísticas) lo consumen vía el store.

## 2026-06-21 — Sub-spec 003.4: Tab Estadísticas (gráfica Chart.js)

### Utils de dashboard modularizadas

Utils de dashboard refactorizadas en módulos cohesivos (`src/lib/utils/dashboard-*.ts`) con barrel `dashboard.ts`:
- `dashboard-types.ts` — interfaces `ResumenDia`, `BarraGrafica`
- `dashboard-format.ts` — formateadores (`formatearFecha`, `formatearFechaLarga`, `formatearHora`, `formatearDuracion`, `formatearHorasDecimal`)
- `dashboard-calc.ts` — cálculos (`calcularResumenDia`, `agruparPorDia`, `calcularResumenPeriodo`)
- `dashboard-periodo.ts` — `filtrarPorPeriodo` con rangos naturales
- `dashboard-grafica.ts` — `prepararDatosGrafica`

Separación para mantener ficheros ≤ 120 líneas y funciones puras.

### Periodos naturales

En vez de ventanas rodantes: semana = lunes→domingo, mes = día 1→último, año = 12 meses (Ene→Dic). `obtenerRangoPeriodo()` en `dashboard-periodo.ts`.

### Colores alternados por jornada

1ª jornada del día = `#3b82f6` (primary), 2ª+ = `#22c55e` (success/verde). `barrasPorJornada()` lleva conteo por día.

### Vista anual agrupa por mes

`barrasPorMes()` suma duraciones de cada mes → 12 barras máx (solo meses con datos).

### Data labels sobre barras

Plugin custom `fitxaketaDataLabels` (afterDatasetsDraw) dibuja "Xh" sobre cada barra — no usa librería externa.

### Tooltip enriquecido

- title = fecha larga (es-ES, weekday + day + month)
- afterTitle = "HH:MM – HH:MM" (hora inicio/fin)
- label = "Duración: Xh Ym"

### Store global como fuente de datos

`subscribe()`, `getJornadas()`, `getPeriodoSeleccionado()`, `setPeriodo()`, `cargarJornadas()`. La página no carga datos localmente.

### `ssr = false` en `+page.ts` separado

Mismo patrón que 003.2 y 003.3 (requisito ESLint `svelte/valid-prop-names-in-kit-pages`).

### Chart.js lazy import

En `onMount` con registro selectivo de componentes (BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend). Guard `isDestroyed` para evitar render tras destroy.

### Bundle

- Entry: 1.3 KB gzip (límite 150 KB)
- Total: 126.31 KB gzip (límite 300 KB)
- Chart.js aislado en chunk lazy (~70 KB)
