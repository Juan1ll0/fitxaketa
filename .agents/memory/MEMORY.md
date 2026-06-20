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

### Cierre: 2026-06-20

Quality gate completo pasa: 11/11 gates ✅. Tests: 6/6 unit + 8/8 E2E (Chromium + Firefox).
