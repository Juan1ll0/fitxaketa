# Plan: 009 - Copia de seguridad/restauración (JSON) e iconos

**Status:** approved
**Spec:** [009-copia-seguridad-e-iconos.md](./009-copia-seguridad-e-iconos.md) (status: approved)
**Generado:** 2026-07-23
**Autor:** planner

> Cubre los ACs de la spec: Bloque A copia/restauración JSON + unificar entrega (AC-01..AC-15) y Bloque B iconos (AC-16..AC-22). Sin cambio de esquema Dexie (sigue v4). Sin red/Drive/OAuth: entrega por Web Share con fallback a descarga.

---

## Resumen de fases

| Fase | Contenido                                             | Implementers                   | Paralelizable         |
| ---- | ----------------------------------------------------- | ------------------------------ | --------------------- |
| 1    | Contrato del formato de backup (tipos + constantes)   | impl-svelte                    | — (base de las demás) |
| 2    | Lógica: serializar/parsear, entrega, db-backup, store | impl-svelte, impl-pwa          | parcial (ver tareas)  |
| 3    | Componentes/rutas (sección Ajustes) + unificar Excel  | impl-ui, impl-svelte, impl-pwa | parcial (ficheros)    |
| 4    | Iconos (assets + manifest + head/layout)              | impl-pwa, impl-ui              | parcial               |
| 5    | Tests + verificación (round-trip, entrega, iconos)    | tester                         | sí                    |

**Orden:** Fase 1 → Fase 2 → (Fase 3 ∥ Fase 4) → Fase 5.
**Commits:** uno por tarea/fase en la rama `feat/009-copia-seguridad-e-iconos` (granularidad por fase, precedente del proyecto).

---

## Fase 1 — Contrato del formato de backup

### T1.1 — Tipos y constantes del backup · `impl-svelte`

**Ficheros:** `src/lib/utils/backup.ts` (NUEVO, puro; solo `import type` desde `$lib/db`).

```ts
import type { Jornada, Settings } from '$lib/db';

export const APP_ID = 'fitxaketa';
export const FORMATO_BACKUP = 1; // versión del formato del fichero (no de la app)
export const SCHEMA_DEXIE = 4; // esquema de origen soportado

export interface BackupData {
	app: typeof APP_ID;
	version: number;
	schema: number;
	exportado: string; // ISO
	jornadas: Jornada[];
	settings: Settings[];
}
```

**ACs:** base de AC-02, AC-05, AC-08.
**Dependencias:** ninguna. **Bloquea:** T2.1, T2.3, T2.4.

---

## Fase 2 — Lógica de negocio

> Utils **puras** en `src/lib/utils/` (sin componentes/stores; `db.ts` solo por `type`). Side effects (Dexie, DOM/`navigator`) en `db-backup.ts`, `compartir.ts` y store. `npm run depcruise` tras cada util nueva (precedente 003.5).

### T2.1 — Serializar / parsear backup · `impl-svelte`

**Ficheros:** `src/lib/utils/backup.ts`.

- `serializarBackup(jornadas: Jornada[], settings: Settings[]): string` → arma `BackupData` (`app`, `version`, `schema`, `exportado: new Date().toISOString()`) y `JSON.stringify` (Date→ISO automático).
- `parsearBackup(texto: string): BackupData` → `JSON.parse` + **validación** (AC-05): `app === APP_ID`, `Array.isArray(jornadas|settings)`, `schema === SCHEMA_DEXIE` (rechazar `> 4` con mensaje «copia más nueva»), forma mínima por fila. **Revivir fechas** explícitamente: `start_time`, `end_time` (nullable → `null`|`Date`), `settings.fecha`. Lanza `Error` con mensaje claro si algo falla (lo captura la UI).

**ACs:** AC-02, AC-05, AC-08, base de AC-14.
**Dependencias:** T1.1. **Paralelizable con:** T2.2.

### T2.2 — Generalizar el helper de guardado · `impl-pwa`

**Ficheros:** `src/lib/utils/excel-guardar.ts` → **renombrar** a `src/lib/utils/guardar-fichero.ts`.

> **Nota (realidad en `main`):** el helper **ya existe** (`guardarBlob`) con cascada `showSaveFilePicker` (escritorio) → `navigator.share` (móvil) → descarga; solo `AbortError` es no-op, `NotAllowedError` cae a descarga. No se crea uno nuevo: se **generaliza** para JSON.

- Añadir `TipoFichero { mime; descripcion; extensiones }` y constantes `TIPO_XLSX`, `TIPO_JSON`.
- `guardarBlob(blob, nombre, tipo: TipoFichero = TIPO_XLSX)`: usa `tipo` en el `types` del picker y en el `File`. Firma por defecto XLSX → los llamadores de Excel no cambian de comportamiento.
- Actualizar el import en `excel-wrapper.ts` (`./excel-guardar` → `./guardar-fichero`).

**ACs:** AC-04, AC-05, AC-15.
**Dependencias:** ninguna. **Paralelizable con:** T2.1, T2.3.

### T2.3 — Export/import en Dexie · `impl-pwa`

**Ficheros:** `src/lib/db-backup.ts` (NUEVO).

- `exportarDatos(): Promise<{ jornadas: Jornada[]; settings: Settings[] }>` → `getAllJornadas()` + `getAllSettings()` (o lecturas directas de ambas tablas).
- `importarDatos(data: BackupData): Promise<void>` → **transacción `rw`** sobre `jornadas` + `settings`: `clear()` ambas, `bulkAdd(data.jornadas)` / `bulkAdd(data.settings)` (conserva `id`), y `seedSettingsIfEmpty()` si `settings` viene vacía (AC-09). Todo o nada (AC-07).

**ACs:** AC-07, AC-09.
**Dependencias:** T1.1 (tipo). **Paralelizable con:** T2.1, T2.2.

### T2.4 — Store: acciones de copia · `impl-svelte`

**Ficheros:** `src/lib/stores/app-state-backup.ts` (NUEVO). Espejo de `app-state-borrado.ts`.

- `exportarCopia(): Promise<void>` → `exportarDatos()` → `serializarBackup()` → nombre `fitxaketa-backup-YYYYMMDDHHmmss.json` → `entregarFichero(nombre, json, 'application/json')`.
- `importarCopia(texto: string): Promise<void>` → `parsearBackup()` → `importarDatos()` → recarga reactiva: `stopTimer()` + `resetEstadoJornada()` si la jornada abierta ya no existe; `cargarSettings()`; `cargarJornadas()`; `notificarCambio()` (AC-10, AC-12).

> `parsearBackup` se llama **antes** de mostrar la confirmación destructiva (en la UI, T3.1) para validar y conocer el conteo; `importarCopia` recibe el texto ya elegido y confía en la validación (o revalida).

**ACs:** AC-02, AC-10, AC-12.
**Dependencias:** T2.1, T2.3. **No paralelizable** con T2.1/T2.3.

---

## Fase 3 — Componentes / rutas + Excel

### T3.1 — Sección «Copia de seguridad» en Ajustes · `impl-ui` (lógica de store → `impl-svelte`)

**Ficheros:** `src/lib/components/ajustes/CopiaSeguridad.svelte` (NUEVO). Reutiliza `ConfirmacionDestructiva.svelte` (008).

- **Exportar**: botón → `exportarCopia()`. Sin confirmación (no destructivo).
- **Importar**: `<input type="file" accept=".json,application/json" hidden>` disparado por botón. Al elegir: `await file.text()` → `parsearBackup()` dentro de try/catch:
  - éxito → abrir `ConfirmacionDestructiva` con «Se reemplazarán tus datos actuales. La copia contiene N jornadas.» → al confirmar `importarCopia(texto)` (AC-06/08); Cancelar no toca nada (AC-11/13).
  - error → mensaje visible `aria-live` (AC-05).
- Sección separada de la Zona de peligro (no roja; acción de importar sí abre el sheet destructivo).

**ACs:** AC-01, AC-03, AC-05, AC-06, AC-08, AC-11, AC-13.
**Dependencias:** T2.1, T2.4, `ConfirmacionDestructiva` (existe). **Paralelizable con:** T3.3, Fase 4.

### T3.2 — Montar la sección en la página · `impl-svelte`

**Ficheros:** `src/routes/configuracion/+page.svelte`.

- Importar y montar `<CopiaSeguridad />` **encima** de `<AccionesConfig />` (Zona de peligro).

**ACs:** AC-01.
**Dependencias:** T3.1. **Paralelizable con:** T3.3, Fase 4.

### T3.3 — Excel usa el helper renombrado · `impl-pwa`

**Ficheros:** `src/lib/utils/excel-wrapper.ts`.

- `guardarFichero()` ya obtiene el Blob (`resultado.toBlob()`) y llama `guardarBlob(blob, nombre)`; solo cambia el **import** a `./guardar-fichero` (default `TIPO_XLSX`, comportamiento idéntico). El grueso de AC-15 se resuelve en T2.2.

**ACs:** AC-15.
**Dependencias:** T2.2. **Paralelizable con:** T3.1, T3.2.

---

## Fase 4 — Iconos

### T4.1 — Colocar assets y retirar el zip · `impl-pwa`

**Ficheros:** `static/*` (NUEVOS), `design/app-icons/*` (NUEVOS), raíz (borrar zip).

- A `static/`: `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png` (180, reemplaza placeholder), `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`.
- A `design/app-icons/`: el **resto** del set (1024, 20..167, maskable-432, favicons dup…), versionado pero **no** servido (fuera de `static/`, no lo coge el glob de precache).
- Extraer de `Icono para aplicación Fixtaketa.zip` y **eliminar el zip** de la raíz.

**ACs:** AC-16, AC-21, base de AC-22.
**Dependencias:** ninguna. **Paralelizable con:** Fase 3.

### T4.2 — Manifest · `impl-pwa`

**Ficheros:** `vite.config.ts` (`SvelteKitPWA.manifest.icons`).

```
{ src: '/icon-192.png',          sizes: '192x192', type: 'image/png' },
{ src: '/icon-512.png',          sizes: '512x512', type: 'image/png' },
{ src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
{ src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
```

**ACs:** AC-17, AC-20.
**Dependencias:** T4.1. **Paralelizable con:** T4.3.

### T4.3 — Favicons y apple-touch · `impl-ui`

**Ficheros:** `src/app.html`, `src/routes/+layout.svelte`, `src/lib/assets/favicon.svg` (borrar si queda huérfano).

- `app.html`: `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">` (+ 16). `apple-touch-icon` ya está apuntando a `/apple-touch-icon.png` (T4.1 provee el real).
- `+layout.svelte`: retirar `import favicon from '$lib/assets/favicon.svg'` y su `<link rel="icon">` (lo cubre `app.html`).

**ACs:** AC-18, AC-19.
**Dependencias:** T4.1. **Paralelizable con:** T4.2.

---

## Fase 5 — Tests / verificación

> `fake-indexeddb/auto` para Dexie; mocks de `navigator.share`/`canShare`. Un test por AC mínimo. `npm run check` sin errores.

### T5.1 — `backup.test.ts` · `tester`

`serializarBackup`/`parsearBackup` round-trip; **revivir fechas** (incl. `end_time: null`); validación: `app` distinta, `schema` 5 (rechazo), JSON inválido, campos ausentes. (AC-02, AC-05, AC-08, AC-14 parcial)

### T5.2 — `db-backup.test.ts` · `tester`

`exportarDatos` lee ambas tablas; `importarDatos` reemplaza transaccional (clear+bulkAdd), conserva `id`, re-seed si `settings` vacía; round-trip íntegro export→reset→import (AC-14). (AC-07, AC-09, AC-14)

### T5.3 — `compartir.test.ts` · `tester`

`canShare` true → `navigator.share` llamado con `File`; `canShare` ausente → fallback descarga (anchor); `AbortError` → sin error ni descarga. (AC-04, AC-05)

### T5.4 — `app-state-backup.test.ts` · `tester`

`importarCopia` recarga jornadas/settings y notifica; si la jornada abierta desaparece, estado a inactivo. (AC-10, AC-12)

### T5.5 — Verificación manual/build de iconos · `tester`

DevTools → Manifest (192/512 + maskable, sin errores); favicon de marca; iOS add-to-home; `npm run build` + `npm run size` (precache sin el set completo, budget OK); `git status` limpio (sin zip). (AC-16..AC-22)

---

## Riesgos técnicos

1. **Revivir `Date` al importar.** `JSON.parse` deja strings; hay que mapear `start_time`/`end_time`/`fecha` a `Date` a mano. _Mitigación:_ T5.1 con `end_time: null` y comparación de tipos.
2. **Helper de guardado ya existente (resuelto).** `main` ya trae `guardarBlob` (showSaveFilePicker/share/descarga) y el Excel ya usa `toBlob()`. _Resultado:_ no se crea helper nuevo; se generaliza y renombra a `guardar-fichero.ts` con `TipoFichero`. Test `excel-wrapper.test.ts` (48) sigue verde tras el cambio.
3. **Gesto de usuario para `navigator.share` (iOS).** Si se hace mucho `await` (leer IndexedDB) antes de `share()`, iOS puede invalidar el gesto → `NotAllowedError`. _Mitigación:_ en `exportarCopia` minimizar el trabajo previo; las lecturas Dexie son rápidas; si diera problemas, preparar el Blob de forma eager. `NotAllowedError` cae al fallback de descarga.
4. **Peso del precache (iconos).** El glob `client/**/*.png` precachea todo lo de `static/`. _Mitigación:_ el set completo va a `design/app-icons/` (fuera de `static/`); T5.5 valida `size`.
5. **`knip` (código muerto).** Nuevos exports (`serializar/parsearBackup`, `entregarFichero`, `exportar/importarDatos`, acciones del store) deben tener consumidor. _Mitigación:_ `app-state-backup` lo usa la UI; `npm run knip` al final.
6. **Reemplazo destructivo sin red de deshacer.** Importar borra lo actual. _Mitigación:_ validación previa (no toca la base si el fichero es inválido) + confirmación con conteo; el propio backup es la copia.

---

## Fuera de scope (reiterado de la spec)

- Entrega automática del backup (Drive/email/periódica), cifrado, **merge** al importar, sincronización multi-dispositivo.
- Generación de iconos (vienen de diseño) y base path de hospedaje (`/fitxaketa/`): se coordina en la spec de GitHub Pages.
