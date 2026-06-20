---
status: done
spec: 006-testing-infrastructure
creada: 2026-06-20
autor: @planner
---

# Plan de Implementación — 006 Testing Infrastructure

## Resumen

Infraestructura completa de testing automatizado: **Vitest** para tests unitarios y de componentes Svelte 5, **Playwright** para tests E2E multi-navegador. Integración con el quality gate existente (`npm run quality`).

**ACs totales:** 20  
**Complejidad estimada:** L (infraestructura transversal)  
**Dependencias externas:** Feature 002 (Dexie/db.ts) para tests unitarios de ejemplo — si no existe, se crea un stub mínimo.

---

## Fase 1 — Instalación y configuración base

**Objetivo:** Tener Vitest y Playwright instalados, configs mínimas funcionales, scripts npm disponibles.

### Tarea 1.1: Instalar dependencias de testing [S]

**Asignado:** `impl-svelte`

```bash
npm install -D vitest @vitest/coverage-v8 jsdom \
  @testing-library/svelte @testing-library/jest-dom@^6 \
  fake-indexeddb \
  @playwright/test
```

> **Nota:** `@testing-library/jest-dom@^6` es requerido para el subpath `/vitest` usado en el setup.

**Verificación:**

```bash
npm ls vitest @playwright/test @testing-library/jest-dom  # todas aparecen en devDependencies
```

---

### Tarea 1.2: Crear `vitest.config.ts` [S]

**Asignado:** `impl-svelte`  
**ACs:** AC-09, AC-12, AC-13

**Archivo:** `vitest.config.ts` (NUEVO)

```typescript
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
	plugins: [svelte({ hot: !process.env.VITEST })],
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib')
		}
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/tests/setup.ts'],
		include: ['src/**/*.test.ts', 'src/**/*.test.svelte.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/lib/**/*.ts', 'src/lib/**/*.svelte'],
			exclude: ['src/**/*.test.ts', 'src/**/*.test.svelte.ts', 'src/tests/**']
		}
	}
});
```

> **Nota:** El alias `$lib` es necesario para que los tests puedan importar desde `$lib/db` y otros módulos internos.

---

### Tarea 1.3: Crear `playwright.config.ts` [S]

**Asignado:** `impl-svelte`  
**ACs:** AC-01, AC-04, AC-07, AC-08

**Archivo:** `playwright.config.ts` (NUEVO)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	outputDir: './e2e/results',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [['html', { outputFolder: './e2e/report' }]],
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		serviceWorkers: 'block'
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'] } }
	],
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
```

> **Nota:** `serviceWorkers: 'block'` evita que el Service Worker de la PWA interfiera con los tests E2E cacheando versiones antiguas.

---

### Tarea 1.4: Añadir scripts npm [S]

**Asignado:** `impl-svelte`  
**ACs:** AC-07, AC-08, AC-09, AC-12, AC-13

**Archivo:** `package.json` (MODIFICAR)

Añadir al objeto `"scripts"`:

```json
"test:unit": "vitest run",
"test:unit:watch": "vitest",
"test:unit:coverage": "vitest run --coverage",
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:codegen": "playwright codegen http://localhost:5173"
```

**Verificación:**

```bash
npm run test:unit --help  # no error
npm run test:e2e --help   # no error
```

---

### Tarea 1.5: Instalar browsers de Playwright [S]

**Asignado:** `impl-svelte`  
**ACs:** AC-04

```bash
npx playwright install --with-deps chromium firefox webkit
```

**Verificación:**

```bash
npx playwright --version  # muestra versión instalada
```

---

## Fase 2 — Tests unitarios con Vitest

**Objetivo:** Setup de Vitest funcional, tests de ejemplo para Dexie y componentes Svelte 5.

### Tarea 2.1: Crear setup file de Vitest [S]

**Asignado:** `impl-svelte`  
**ACs:** AC-09, AC-11

**Archivo:** `src/tests/setup.ts` (NUEVO)

```typescript
import '@testing-library/jest-dom/vitest';
```

> Este archivo importa los matchers extendidos (`toBeInTheDocument`, `toHaveTextContent`, etc.) para todos los tests.

---

### Tarea 2.2: Crear test unitario de ejemplo para `$lib/db.ts` [M]

**Asignado:** `tester`  
**ACs:** AC-10  
**Depende de:** Tarea 2.1, Feature 002 (db.ts) — ya implementada

**Archivo:** `src/lib/db.test.ts` (NUEVO)

```typescript
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
	db,
	createJornada,
	closeJornada,
	getOpenJornada,
	getAllJornadas,
	getUnsyncedJornadas,
	markAsSynced
} from '$lib/db';

describe('db (Dexie)', () => {
	beforeEach(async () => {
		await db.delete();
		await db.open();
	});

	it('debería crear la base de datos correctamente', async () => {
		const count = await db.jornadas.count();
		expect(count).toBe(0);
	});

	it('debería permitir crear una jornada abierta', async () => {
		const id = await createJornada();
		expect(id).toBeGreaterThan(0);

		const open = await getOpenJornada();
		expect(open).toBeDefined();
		expect(open?.status).toBe('open');
		expect(open?.end_time).toBeNull();
	});

	it('debería permitir cerrar una jornada', async () => {
		const id = await createJornada();
		await closeJornada(id);

		const open = await getOpenJornada();
		expect(open).toBeUndefined();

		const all = await getAllJornadas();
		expect(all).toHaveLength(1);
		expect(all[0].status).toBe('closed');
		expect(all[0].duration).toBeGreaterThanOrEqual(0);
	});

	it('debería filtrar jornadas no sincronizadas', async () => {
		const id1 = await createJornada();
		const id2 = await createJornada();
		await closeJornada(id1);

		const unsynced = await getUnsyncedJornadas();
		expect(unsynced).toHaveLength(2);

		await markAsSynced(id1);
		const unsyncedAfter = await getUnsyncedJornadas();
		expect(unsyncedAfter).toHaveLength(1);
		expect(unsyncedAfter[0].id).toBe(id2);
	});
});
```

> **Nota:** Los tests usan el esquema real de `jornadas` con las funciones exportadas (`createJornada`, `closeJornada`, etc.). Feature 002 ya está implementada. Se usa `db.jornadas.count()` en lugar de `db.isOpen()` para verificar que la BD está operativa.

---

### Tarea 2.3: Crear test de componente Svelte 5 de ejemplo [M]

**Asignado:** `tester`  
**ACs:** AC-11  
**Depende de:** Tarea 2.1

**Archivo:** `src/lib/components/Example.test.svelte.ts` (NUEVO)

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Example from './Example.svelte';

describe('Example component', () => {
	it('debería renderizar el texto inicial', () => {
		render(Example);
		expect(screen.getByText(/fichar/i)).toBeInTheDocument();
	});

	it('debería responder al click del botón', async () => {
		render(Example);
		const button = screen.getByRole('button');
		await fireEvent.click(button);
		expect(button).toHaveTextContent(/fichado/i);
	});
});
```

**Archivo:** `src/lib/components/Example.svelte` (NUEVO — componente mínimo de ejemplo)

```svelte
<script lang="ts">
	let texto = $state('Fichar');

	function handleClick() {
		texto = texto === 'Fichar' ? 'Fichado ✓' : 'Fichar';
	}
</script>

<button onclick={handleClick} class="rounded bg-primary px-4 py-2 text-white">
	{texto}
</button>
```

> Este componente existe solo como vehículo para el test de ejemplo. Puede eliminarse o reemplazarse cuando haya componentes reales.

---

### Tarea 2.4: Verificar tests unitarios [S]

**Asignado:** `tester`  
**ACs:** AC-09, AC-10, AC-11, AC-12, AC-13

```bash
npm run test:unit          # todos pasan
npm run test:unit:coverage # genera reporte de cobertura
```

---

## Fase 3 — Tests E2E con Playwright

**Objetivo:** Playwright funcional, test E2E de ejemplo, geolocalización mockeable, modo offline testeable.

### Tarea 3.1: Crear directorio `e2e/` y test de ejemplo [M]

**Asignado:** `tester`  
**ACs:** AC-02, AC-17  
**Depende de:** Fase 1

**Archivo:** `e2e/example.spec.ts` (NUEVO)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Página principal', () => {
	test('debería mostrar el botón de fichaje', async ({ page }) => {
		await page.goto('/');
		const button = page.getByRole('button', { name: /fichar/i });
		await expect(button).toBeVisible();
	});

	test('debería tomar un screenshot de referencia', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveScreenshot('landing.png', {
			maxDiffPixelRatio: 0.05
		});
	});
});
```

**Directorio:** `e2e/screenshots/` (NUEVO — se crea automáticamente al ejecutar `toHaveScreenshot`)

---

### Tarea 3.2: Test con geolocalización mockeada [M]

**Asignado:** `impl-pwa`  
**ACs:** AC-05

**Archivo:** `e2e/geolocation.spec.ts` (NUEVO)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Geolocalización', () => {
	test('debería permitir mockear coordenadas GPS', async ({ page, context }) => {
		await context.grantPermissions(['geolocation']);
		await page.goto('/');

		await page.evaluate(() => {
			navigator.geolocation.getCurrentPosition = (success) => {
				success({
					coords: { latitude: 43.263, longitude: -2.935, accuracy: 10 },
					timestamp: Date.now()
				} as GeolocationPosition);
			};
		});

		// Verificar que la app recibe las coordenadas mockeadas
		const coords = await page.evaluate(() => {
			return new Promise<{ lat: number; lng: number }>((resolve) => {
				navigator.geolocation.getCurrentPosition((pos) => {
					resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
				});
			});
		});

		expect(coords.lat).toBeCloseTo(43.263, 3);
		expect(coords.lng).toBeCloseTo(-2.935, 3);
	});
});
```

---

### Tarea 3.3: Test de modo offline [M]

**Asignado:** `impl-pwa`  
**ACs:** AC-06

**Archivo:** `e2e/offline.spec.ts` (NUEVO)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Modo offline', () => {
	test('la app debería seguir funcional sin conexión', async ({ page, context }) => {
		await page.goto('/');

		// Verificar estado inicial
		const button = page.getByRole('button', { name: /Fichar entrada/i });
		await expect(button).toBeVisible();

		// Activar modo offline
		await context.setOffline(true);

		// La página ya está cargada; verificar que el botón sigue visible y funcional
		await button.click();

		// Después de clicar, el texto debería cambiar a "Fichar salida"
		const stopButton = page.getByRole('button', { name: /Fichar salida/i });
		await expect(stopButton).toBeVisible();

		// Restaurar conexión
		await context.setOffline(false);
	});
});
```

> **Nota:** El texto real del botón alterna entre "Fichar entrada" y "Fichar salida" (no "fichado").

---

### Tarea 3.4: Verificar tests E2E [S]

**Asignado:** `tester`  
**ACs:** AC-01, AC-03, AC-04, AC-07, AC-08

```bash
npm run test:e2e          # ejecuta en 3 navegadores, genera reporte HTML
npm run test:e2e:ui       # abre UI interactiva de Playwright
```

**Verificación adicional:**

```bash
# Verificar que el reporte HTML se genera
ls e2e/report/index.html  # existe tras ejecutar test:e2e
```

---

## Fase 4 — Integración con tooling existente

**Objetivo:** ESLint, TypeScript, Knip y quality gate funcionan sin conflictos con los tests.

### Tarea 4.1: Actualizar `tsconfig.json` [S]

**Asignado:** `impl-svelte`  
**ACs:** AC-18

**Archivo:** `tsconfig.json` (MODIFICAR)

Añadir `"vitest/globals"` al array `types` y añadir `"e2e/**/*.ts"` al `include` existente. **No modificar** las entradas de `.svelte-kit` ni el `exclude`.

```json
{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
		"rewriteRelativeImportExtensions": true,
		"allowJs": true,
		"checkJs": true,
		"esModuleInterop": true,
		"forceConsistentCasingInFileNames": true,
		"resolveJsonModule": true,
		"skipLibCheck": true,
		"sourceMap": true,
		"strict": true,
		"moduleResolution": "bundler",
		"types": ["vitest/globals"]
	}
}
```

> **Nota:** El `include` y `exclude` ya están gestionados por `.svelte-kit/tsconfig.json` (vía `extends`). Solo se necesita añadir `types: ["vitest/globals"]` para que TypeScript reconozca los globals de Vitest. Los archivos `e2e/**/*.ts` no necesitan inclusión explícita porque Playwright tiene su propio `tsconfig` o se ejecutan directamente con el runner de Playwright.

---

### Tarea 4.2: Actualizar `eslint.config.js` para tests [S]

**Asignado:** `impl-svelte`  
**ACs:** AC-19

**Archivo:** `eslint.config.js` (MODIFICAR)

Añadir bloque de configuración para archivos de test (antes del bloque `prettier` final):

```javascript
// Tests — permitir globals de Vitest y Playwright
{
	files: ['src/**/*.test.ts', 'src/**/*.test.svelte.ts', 'e2e/**/*.ts'],
	languageOptions: {
		globals: {
			describe: 'readonly',
			it: 'readonly',
			expect: 'readonly',
			beforeEach: 'readonly',
			afterEach: 'readonly',
			beforeAll: 'readonly',
			afterAll: 'readonly',
			vi: 'readonly',
			test: 'readonly'
		}
	},
	rules: {
		'max-lines': 'off',
		'max-lines-per-function': 'off',
		'@typescript-eslint/no-explicit-any': 'warn'
	}
},
```

---

### Tarea 4.3: Actualizar configuración de Knip [S]

**Asignado:** `impl-svelte`  
**ACs:** AC-20

**Archivo:** `knip.json` (MODIFICAR)

El archivo `knip.json` ya existe con configuración curada. **No reemplazarlo**. Solo añadir el campo `ignore` para excluir archivos de test:

```json
{
	"$schema": "https://unpkg.com/knip@latest/schema.json",
	"entry": ["src/service-worker.ts", "src/routes/**/+*.{ts,svelte}", "src/app.html"],
	"project": ["src/**/*.{ts,svelte}"],
	"ignoreDependencies": ["tailwindcss", "@secretlint/secretlint-rule-preset-recommend"],
	"ignore": ["src/**/*.test.ts", "src/**/*.test.svelte.ts", "src/tests/**", "e2e/**"]
}
```

> **Nota:** Solo se añade el campo `ignore`. No modificar `entry`, `project` ni `ignoreDependencies`.

**Verificación:**

```bash
npm run knip  # no reporta archivos de test como código muerto
```

---

### Tarea 4.4: Integrar tests en quality gate [M]

**Asignado:** `impl-svelte`  
**ACs:** AC-14, AC-15

**Archivo:** `package.json` (MODIFICAR script `quality`)

```json
"quality": "npm run format:check && npm run lint && npm run check && npm run depcruise && npm run knip && npm run dup && npm run secrets && npm run build && (npm run preview &) && sleep 3 && npm run test:unit && npm run test:e2e && npm run size"
```

**Orden del quality gate actualizado:**

1. `format:check` — Prettier
2. `lint` — ESLint
3. `check` — svelte-check
4. `depcruise` — dependency-cruiser
5. `knip` — código muerto
6. `dup` — jscpd
7. `secrets` — secretlint
8. `build` — Vite build
9. `(npm run preview &)` — inicia servidor preview en background (subshell para no romper la cadena `&&`)
10. `sleep 3` — espera a que el servidor esté listo
11. `test:unit` — Vitest
12. `test:e2e` — Playwright (reutiliza servidor preview existente via `reuseExistingServer`)
13. `size` — size-limit

> **Nota:** Los paréntesis `(npm run preview &)` aíslan el `&` en un subshell, permitiendo que la cadena `&&` continúe correctamente. Sin paréntesis, el `&` terminaría la lista entera y los tests se lanzarían en paralelo con el build.

---

### Tarea 4.5: Verificar `npm run check` sin conflictos [S]

**Asignado:** `tester`  
**ACs:** AC-16

```bash
npm run check  # svelte-check pasa sin errores relacionados con Vitest
```

---

## Fase 5 — Verificación integral

**Objetivo:** Todo el quality gate pasa, todos los ACs verificados.

### Tarea 5.1: Ejecutar quality gate completo [M]

**Asignado:** `tester`  
**ACs:** AC-14, AC-15

```bash
npm run quality  # todo pasa sin errores
```

### Tarea 5.2: Verificar codegen de Playwright [S]

**Asignado:** `tester`  
**ACs:** AC-03

```bash
# En una terminal separada:
npm run dev

# En otra terminal:
npm run test:e2e:codegen
# Se abre el inspector de Playwright con http://localhost:5173
```

### Tarea 5.3: Verificar estructura de archivos [S]

**Asignado:** `tester`  
**ACs:** AC-17

```bash
# Verificar estructura esperada:
ls e2e/                          # example.spec.ts, geolocation.spec.ts, offline.spec.ts
ls src/lib/db.test.ts            # existe
ls src/lib/components/Example.test.svelte.ts  # existe
ls src/tests/setup.ts            # existe
```

---

## Resumen de archivos

### Archivos nuevos

| Archivo                                     | Fase | Agente        | Complejidad |
| ------------------------------------------- | ---- | ------------- | ----------- |
| `vitest.config.ts`                          | 1    | `impl-svelte` | S           |
| `playwright.config.ts`                      | 1    | `impl-svelte` | S           |
| `src/tests/setup.ts`                        | 2    | `impl-svelte` | S           |
| `src/lib/db.test.ts`                        | 2    | `tester`      | M           |
| `src/lib/components/Example.svelte`         | 2    | `tester`      | S           |
| `src/lib/components/Example.test.svelte.ts` | 2    | `tester`      | M           |
| `e2e/example.spec.ts`                       | 3    | `tester`      | M           |
| `e2e/geolocation.spec.ts`                   | 3    | `impl-pwa`    | M           |
| `e2e/offline.spec.ts`                       | 3    | `impl-pwa`    | M           |

### Archivos modificados

| Archivo                            | Fase | Agente        | Complejidad |
| ---------------------------------- | ---- | ------------- | ----------- |
| `package.json` (scripts + deps)    | 1, 4 | `impl-svelte` | S           |
| `tsconfig.json` (types)            | 4    | `impl-svelte` | S           |
| `eslint.config.js` (globals tests) | 4    | `impl-svelte` | S           |
| `knip.json` (ignore tests)         | 4    | `impl-svelte` | S           |

---

## Dependencias entre tareas

```
Fase 1 (instalación)
  ├── 1.1 deps → 1.2 vitest.config → 1.4 scripts
  ├── 1.3 playwright.config → 1.4 scripts
  └── 1.5 install browsers

Fase 2 (Vitest) ← depende de Fase 1
  ├── 2.1 setup → 2.2 db.test → 2.4 verificar
  └── 2.1 setup → 2.3 component.test → 2.4 verificar

Fase 3 (Playwright) ← depende de Fase 1
  ├── 3.1 example.spec → 3.4 verificar
  ├── 3.2 geolocation.spec → 3.4 verificar
  └── 3.3 offline.spec → 3.4 verificar

Fase 4 (integración) ← depende de Fases 2 y 3
  ├── 4.1 tsconfig
  ├── 4.2 eslint
  ├── 4.3 knip
  └── 4.4 quality gate → 4.5 verificar check

Fase 5 (verificación) ← depende de Fase 4
  └── 5.1 quality gate completo
```

---

## Riesgos técnicos

| Riesgo                                        | Probabilidad | Impacto | Mitigación                                                                                                                                                         |
| --------------------------------------------- | ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`@testing-library/svelte` v5 y runes**      | Media        | Medio   | Verificar compatibilidad con Svelte 5 runes antes de escribir tests. Si hay problemas, usar `render()` con props explícitas y verificar DOM.                       |
| **`fake-indexeddb` y Dexie 4**                | Media        | Medio   | Dexie 4 usa APIs modernas de IndexedDB. Verificar que `fake-indexeddb/auto` las soporta. Si no, usar `fake-indexeddb` con import explícito antes de Dexie.         |
| **ESLint globals vs imports explícitos**      | Baja         | Bajo    | Se opta por declarar globals en ESLint (más cómodo). Si hay conflicto con `no-undef`, se puede cambiar a imports explícitos (`import { describe } from 'vitest'`). |
| **Knip reporta `e2e/` como muerto**           | Media        | Bajo    | El `ignore` en knip.json lo previene. Si Knip no respeta `ignore` para directorios externos, añadir `e2e` como entry de tipo `playwright`.                         |
| **Playwright screenshots flaky en CI futuro** | Media        | Bajo    | Usar `maxDiffPixelRatio: 0.05` en lugar de comparación pixel-perfect. Cuando se añada CI, generar screenshots de referencia en el mismo SO que el runner.          |

> **Nota:** Los riesgos originales (Feature 002 no implementada, esquema inventado, knip.json sobrescrito, texto incorrecto en offline.spec) han sido mitigados en las correcciones del plan.

---

## Checklist de ACs para `@tester`

### Playwright (E2E)

- [ ] AC-01: `npx playwright test` ejecuta tests E2E y genera reporte HTML
- [ ] AC-02: Test de ejemplo abre página principal, verifica botón fichaje, toma screenshot
- [ ] AC-03: `npx playwright codegen http://localhost:5173` abre inspector y graba interacciones
- [ ] AC-04: Tests corren en Chromium, Firefox y WebKit (3 navegadores)
- [ ] AC-05: Se puede mockear `navigator.geolocation` para simular coordenadas
- [ ] AC-06: Se puede simular modo offline con `page.context().setOffline(true)`
- [ ] AC-07: `npm run test:e2e` lanza Playwright con config del proyecto
- [ ] AC-08: `npm run test:e2e:ui` abre Playwright en modo interactivo

### Vitest (unit + component)

- [ ] AC-09: `npm run test:unit` ejecuta tests unitarios con `vitest run`
- [ ] AC-10: Test unitario de `$lib/db.ts` verifica creación de BD y métodos CRUD
- [ ] AC-11: Test de componente con `@testing-library/svelte` monta componente Svelte 5 y verifica renderizado
- [ ] AC-12: `npm run test:unit:watch` ejecuta Vitest en modo watch
- [ ] AC-13: `npm run test:unit:coverage` genera reporte de cobertura con `@vitest/coverage-v8`

### Integración con quality gate

- [ ] AC-14: `npm run quality` ejecuta tests unitarios y E2E como parte del quality gate
- [ ] AC-15: Playwright se conecta al servidor de preview (build + preview automático)
- [ ] AC-16: `npm run check` (svelte-check) sigue funcionando sin conflictos con Vitest

### Estructura y convenciones

- [ ] AC-17: Tests E2E en `e2e/` (raíz), tests unitarios junto al código (`*.test.ts` / `*.test.svelte.ts`)
- [ ] AC-18: Archivos de test incluidos en `tsconfig.json` pero excluidos del build de producción
- [ ] AC-19: Archivos de test pueden usar `describe`/`it`/`expect` sin warnings de ESLint
- [ ] AC-20: Archivos de test no se reportan como código muerto en Knip
