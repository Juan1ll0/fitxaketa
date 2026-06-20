# 006 - Testing Infrastructure (Playwright + Vitest)

status: done
creada: 2026-06-20
autor: sistema

## User story

Como desarrollador, quiero una infraestructura de tests automatizados (E2E con Playwright y unit/component con Vitest) para garantizar que los cambios no rompen funcionalidad existente y poder iterar con confianza.

## Criterios de aceptación

### Playwright (E2E)

- [x] AC-01: Dado que Playwright está instalado, cuando ejecuto `npx playwright test`, entonces se ejecutan los tests E2E contra un servidor de preview y se genera un reporte HTML
- [x] AC-02: Dado que existe un test E2E de ejemplo, cuando lo ejecuto, entonces abre la página principal, verifica que el botón de fichaje está visible y toma un screenshot de referencia
- [x] AC-03: Dado que Playwright está configurado, cuando ejecuto `npx playwright codegen http://localhost:5173`, entonces se abre el inspector de Playwright y puedo grabar interacciones que generan código de test
- [x] AC-04: Dado que la app es una PWA, cuando ejecuto tests E2E, entonces los tests corren en Chromium, Firefox y WebKit (3 navegadores)
- [x] AC-05: Dado que la app usa geolocalización, cuando escribo tests E2E, entonces puedo mockear `navigator.geolocation` para simular coordenadas de fichaje
- [x] AC-06: Dado que la app funciona offline, cuando ejecuto tests E2E, entonces puedo simular modo offline con `page.context().setOffline(true)` y verificar que la app sigue funcional
- [x] AC-07: Dado que existe el script `npm run test:e2e`, cuando lo ejecuto, entonces lanza Playwright con la configuración del proyecto
- [x] AC-08: Dado que existe el script `npm run test:e2e:ui`, cuando lo ejecuto, entonces abre Playwright en modo interactivo (UI mode)

### Vitest (unit + component)

- [x] AC-09: Dado que Vitest está instalado, cuando ejecuto `npm run test:unit`, entonces se ejecutan los tests unitarios con `vitest run`
- [x] AC-10: Dado que existe un test unitario de ejemplo para `$lib/db.ts`, cuando lo ejecuto, entonces verifica que la base de datos Dexie se crea correctamente y los métodos CRUD funcionan
- [x] AC-11: Dado que existe un test de componente de ejemplo, cuando lo ejecuto con `@testing-library/svelte`, entonces monta un componente Svelte 5 y verifica su renderizado e interacciones
- [x] AC-12: Dado que Vitest está configurado, cuando ejecuto `npm run test:unit:watch`, entonces Vitest corre en modo watch (re-ejecuta al cambiar archivos)
- [x] AC-13: Dado que Vitest está configurado, cuando ejecuto `npm run test:unit:coverage`, entonces genera un reporte de cobertura con `@vitest/coverage-v8`

### Integración con quality gate

- [x] AC-14: Dado que los tests están configurados, cuando ejecuto `npm run quality`, entonces también se ejecutan los tests unitarios (`vitest run`) y los tests E2E (`playwright test`) como parte del quality gate
- [x] AC-15: Dado que los tests E2E necesitan un servidor, cuando `npm run quality` los ejecuta, entonces primero hace `npm run build && npm run preview` y Playwright se conecta al servidor de preview
- [x] AC-16: Dado que los tests están configurados, cuando ejecuto `npm run check`, entonces `svelte-check` sigue funcionando sin conflictos con la configuración de Vitest

### Estructura y convenciones

- [x] AC-17: Dado que se añaden tests, cuando creo archivos de test, entonces los tests E2E viven en `e2e/` en la raíz y los tests unitarios viven junto al código que testean (`*.test.ts` / `*.test.svelte.ts`)
- [x] AC-18: Dado que se añaden tests, cuando configuro TypeScript, entonces los archivos de test están incluidos en `tsconfig.json` pero excluidos del build de producción
- [x] AC-19: Dado que se añaden tests, cuando configuro ESLint, entonces los archivos de test pueden usar `describe`/`it`/`expect` sin warnings de globals no declarados
- [x] AC-20: Dado que se añaden tests, cuando configuro Knip, entonces los archivos de test no se reportan como código muerto

## Edge cases

- ¿Qué pasa si IndexedDB no está disponible en el entorno de test? → Vitest usa `fake-indexeddb` para simular IndexedDB en Node.js
- ¿Qué pasa si el service worker interfiere con los tests E2E? → Playwright puede deshabilitar el SW o usar un contexto limpio por test
- ¿Qué pasa si los tests E2E son flaky por timing? → Playwright tiene auto-waiting integrado; evitar `waitForTimeout` y usar `waitForSelector`/`waitForResponse`
- ¿Qué pasa si un test unitario necesita el browser API (localStorage, fetch)? → Vitest con `environment: 'jsdom'` o `environment: 'happy-dom'` para tests que necesitan DOM
- ¿Qué pasa si el build de producción falla pero los tests pasan? → El quality gate ejecuta tests DESPUÉS del build, así que si el build falla, no se ejecutan tests

## Fuera de scope

- Tests de Google Apps Script (backend en Sheets) — no se testean aquí
- Tests de iOS Shortcuts / Android MacroDroid — automatización móvil fuera de scope
- Visual regression testing (Applitools/Playwright screenshots comparativos) — se puede añadir después
- Tests de accesibilidad automatizados (axe-core) — se puede añadir como mejora futura
- Integración con Octomind u otras herramientas de IA — se evaluará después de tener la base funcionando
- CI/CD (GitHub Actions) — la infraestructura de tests se configura primero; la integración CI va en otra spec

## Notas técnicas

### Playwright

- Instalar `@playwright/test` como devDependency
- Config en `playwright.config.ts` en la raíz del proyecto
- `webServer` en la config apunta a `npm run preview` (puerto 4173) para tests contra build de producción
- Base URL: `http://localhost:4173`
- Projects: `chromium`, `firefox`, `webkit` (3 navegadores)
- `use: { trace: 'on-first-retry' }` para debug de tests flaky
- Directorio de tests: `e2e/` en la raíz (separado de `src/`)
- Screenshots de referencia en `e2e/screenshots/`
- El `tsconfig.json` debe incluir `e2e/**/*.ts` para que TypeScript no se queje

### Vitest

- Instalar `vitest`, `@testing-library/svelte`, `@testing-library/jest-dom`, `jsdom` (o `happy-dom`) como devDependencies
- Instalar `fake-indexeddb` para simular IndexedDB en tests de `$lib/db.ts`
- Config en `vitest.config.ts` en la raíz (separada de `vite.config.ts` para no contaminar el build)
- `environment: 'jsdom'` por defecto (necesario para tests de componentes Svelte)
- `setupFiles: ['./src/tests/setup.ts']` para importar `@testing-library/jest-dom/vitest` (matchers como `toBeInTheDocument`)
- `include: ['src/**/*.test.ts', 'src/**/*.test.svelte.ts']`
- Alias `$lib` debe funcionar en tests (Vitest hereda los aliases de Vite)
- Para componentes Svelte 5 con runes: `@testing-library/svelte` v5+ soporta runes nativamente

### Svelte 5 + Testing Library

- Los componentes Svelte 5 (runes) se testean con `render()` de `@testing-library/svelte`
- Para testear interacciones: `fireEvent.click()`, `fireEvent.input()`, etc.
- Para testear estado reactivo: verificar el DOM resultante después de la interacción
- No testear internals del componente (no `$state` directamente); testear comportamiento visible

### Dexie + fake-indexeddb

- En tests unitarios de `$lib/db.ts`, importar `fake-indexeddb/auto` ANTES de importar `db`
- Esto polyfills `indexedDB` y `IDBKeyRange` en Node.js
- Cada test debe limpiar la BD: `await db.delete()` en `beforeEach`

### ESLint

- Añadir `vitest/globals` o declarar globals en `eslint.config.js` para la sección de tests: `describe`, `it`, `expect`, `beforeEach`, `afterEach`, `vi`
- Alternativa: usar `import { describe, it, expect } from 'vitest'` explícitamente (más explícito, sin globals)

### Knip

- Añadir patrón `src/**/*.test.ts` y `e2e/**/*.ts` como entry points de test en `knip` config (si es necesario) para que no los reporte como muertos

### Scripts npm

```json
{
	"test:unit": "vitest run",
	"test:unit:watch": "vitest",
	"test:unit:coverage": "vitest run --coverage",
	"test:e2e": "playwright test",
	"test:e2e:ui": "playwright test --ui",
	"test:e2e:codegen": "playwright codegen http://localhost:5173"
}
```

### Quality gate

- Modificar el script `quality` para incluir `npm run test:unit && npm run test:e2e` después del build
- Orden: format:check → lint → check → depcruise → knip → dup → secrets → build → test:unit → test:e2e → size
- Playwright necesita el preview server corriendo; usar `webServer` en `playwright.config.ts` para que Playwright lo arranque automáticamente

### Archivos a crear/modificar

```
playwright.config.ts          # NUEVO — config Playwright
vitest.config.ts              # NUEVO — config Vitest
e2e/                          # NUEVO — directorio tests E2E
  example.spec.ts             # NUEVO — test E2E de ejemplo
src/tests/setup.ts            # NUEVO — setup Vitest (import jest-dom)
src/lib/db.test.ts            # NUEVO — tests unitarios de ejemplo para Dexie
src/lib/components/Example.test.svelte.ts  # NUEVO — test componente de ejemplo
package.json                  # MODIFICAR — añadir scripts y devDependencies
tsconfig.json                 # MODIFICAR — incluir e2e/ y archivos de test
eslint.config.js              # MODIFICAR — globals de Vitest en tests
```
