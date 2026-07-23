# 009 - Copia de seguridad/restauración (JSON) e iconos de la app

**Status:** approved
**Creada:** 2026-07-23
**Autor:** Juan Ignacio
**Depende de:** [001](./001-pwa-setup.md) (PWA/manifest), [002](./002-almacenamiento-offline-dexie.md) (Dexie), [003.5](./003.5-configuracion.md) (Ajustes)

## Resumen

Dos bloques independientes que comparten PR:

1. **Copia de seguridad y restauración (JSON)** — exportar **toda** la base local (jornadas + settings) a un fichero `.json` descargable, e **importarla** desde un fichero. Es la funcionalidad que la spec [008](./008-ajustes-gestion-de-datos.md) dejó explícitamente **fuera de scope** («Copia de seguridad» y «Restauración/importación»), ahora resuelta con el mecanismo **más simple y sin dependencias externas**: fichero local, sin Drive/OAuth/email.

2. **Iconos de la app** — sustituir los iconos placeholder actuales (`static/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` diminutos; favicon = logo de Svelte) por el set de marca generado en diseño, y cablearlo donde una PWA lo consume: manifest, `apple-touch-icon` y favicons.

### Motivación (por qué ahora)

El almacenamiento web está **aislado por origen** (esquema+host+puerto). Al mover la PWA de la instalación local (`https://192.168.x.x:4173`, mkcert) a una URL estable (p. ej. GitHub Pages), el nuevo origen arranca con **IndexedDB vacío**: los datos NO se migran solos. Sin export/import no hay forma razonable de conservar el historial. Esta feature es el **prerrequisito de datos** para cambiar de origen de hospedaje.

## Contexto

- Persistencia offline-first en Dexie (`src/lib/db.ts`), esquema **v4**: tabla `jornadas` y tabla `settings` **append-only** (cada cambio = snapshot fechado). Tipos `Jornada` y `Settings` en `db.ts`.
- Ajustes (`/configuracion`, spec 003.5) hoy = formulario de configuración + **Zona de peligro** (008). La sección «Datos y sincronización» se eliminó en 008; esta spec añade una sección **«Copia de seguridad»** nueva y separada de la Zona de peligro.
- Patrones reutilizables:
  - Mutación + recarga reactiva del store: `src/lib/stores/app-state-borrado.ts` (llama a `cargarJornadas`, `cargarSettings`, `resetEstadoJornada`, `notificarCambio`, `stopTimer`).
  - Confirmación destructiva: `src/lib/components/ajustes/ConfirmacionDestructiva.svelte` (foco inicial en Cancelar; rojo solo en Confirmar).
  - Semilla de settings por defecto: `seedSettingsIfEmpty()` (`db-settings.ts`).
  - Descarga de fichero: hoy solo existe `guardarFichero()` en `excel-wrapper.ts`, **específica de XLSX** (usa `write-excel-file`); para JSON hace falta un helper genérico Blob+anchor.
- Iconos hoy:
  - Manifest definido **inline** en `vite.config.ts` (plugin `SvelteKitPWA`), con `icons` → `/icon-192.png`, `/icon-512.png`, `/icon-512.png` (maskable).
  - `src/app.html`: `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />` + metas `apple-mobile-web-app-*` (title `Fitxaketa`) + `theme-color`.
  - `src/routes/+layout.svelte`: `<link rel="icon" href={favicon} />` con `favicon.svg` = **logo de Svelte** (placeholder).
  - `injectManifest.globPatterns` incluye `png` → los iconos servidos se **precachean** en el service worker.
- Fuente de iconos: `Icono para aplicación Fixtaketa.zip` (raíz del repo, sin trackear). 31 PNG: favicons 16/32, `apple-touch-icon` (180), maskables 192/432/512, e `icon-{16..1024}` para todos los tamaños de iOS/Android/stores. Dimensiones verificadas correctas.

## Historias de usuario

- Como usuario, quiero **exportar toda mi información** (jornadas + configuración) a un fichero que pueda guardar, para tener una copia de seguridad y poder llevármela a otra instalación/dispositivo.
- Como usuario, quiero **importar** ese fichero en una instalación nueva (otro origen/URL) y recuperar exactamente mis datos, para no perder el historial al cambiar de hospedaje.
- Como usuario, quiero que la app tenga su **icono de marca** real en la pantalla de inicio, el navegador y al instalarla, en vez de un placeholder.

## Criterios de aceptación

### Bloque A — Copia de seguridad / restauración (JSON)

La sección vive en Ajustes (`/configuracion`), **separada de la Zona de peligro**. Exportar no es destructivo; importar **sí** lo es (reemplaza) y exige confirmación.

- [ ] AC-01: En Ajustes hay una sección **«Copia de seguridad»** con dos acciones: **Exportar copia** e **Importar copia**.
- [ ] AC-02 (**Exportar**): genera y descarga un fichero `fitxaketa-backup-YYYYMMDDHHmmss.json` que contiene **todas** las jornadas y **todos** los snapshots de settings, más metadatos (`app`, `version` de formato, `schema` de Dexie, `exportado` ISO).
- [ ] AC-03: El export funciona **offline** (no requiere red) y con la base vacía (genera un backup con arrays vacíos, válido).
- [ ] AC-04 (**Entrega en móvil**): en dispositivos con Web Share de ficheros (iOS/Android), exportar invoca la **hoja de compartir del sistema** (`navigator.share({ files })`), de modo que el usuario elige destino: **Guardar en Archivos** (y ahí la carpeta), AirDrop, correo, etc. Es el equivalente móvil a «elegir dónde guardar».
- [ ] AC-05 (**Fallback de entrega**): si `navigator.canShare({ files })` no está disponible, se recurre a **descarga por enlace** (Blob + atributo `download`) a la carpeta de descargas del navegador. (Opcional: en Chromium de escritorio, `showSaveFilePicker` para elegir ruta.) Cancelar la hoja de compartir (`AbortError`) **no** muestra error ni dispara una descarga por detrás.
- [ ] AC-06 (**Importar — selección**): el usuario elige un fichero `.json` local con el **selector del sistema** (input `accept=".json,application/json"`); en iOS es la app **Archivos** (navega carpetas/iCloud y elige el fichero).
- [ ] AC-07 (**Validación**): antes de tocar nada, se valida que el fichero es un backup de Fitxaketa con estructura correcta y `schema` compatible (v4). Si no lo es (JSON inválido, `app` distinta, campos ausentes, schema incompatible), se muestra un **error claro** y **no se modifica** la base.
- [ ] AC-08 (**Confirmación destructiva**): importar **reemplaza** los datos actuales; antes de aplicar se pide confirmación (patrón 003.5: foco en Cancelar, rojo solo en Confirmar) indicando que se sobrescribirá lo existente y cuántas jornadas trae el fichero.
- [ ] AC-09 (**Aplicar**): al confirmar, se **vacían** `jornadas` y `settings` y se **reinsertan** las del fichero de forma **transaccional** (todo o nada; un fallo a mitad no deja la base a medias).
- [ ] AC-10 (**Fechas**): los campos `Date` (`start_time`, `end_time`, `settings.fecha`) se serializan a ISO y se **reviven a `Date`** al importar; las jornadas importadas conservan duración/estado y se muestran igual que las originales.
- [ ] AC-11 (**Settings tras importar**): si el fichero no trae settings (o queda vacía), se re-siembra el snapshot por defecto (`seedSettingsIfEmpty`) para que `settingsVigente()` siempre encuentre uno.
- [ ] AC-12 (**Reactividad**): tras importar, las vistas (Fichar, Historial, Estadísticas, Ajustes) reflejan los datos nuevos **sin recargar** la app; si había una jornada abierta que ya no existe, el estado vuelve a «sin jornada activa».
- [ ] AC-13 (**Cancelar**): cancelar la confirmación de importar **no modifica** la base.
- [ ] AC-14: Exportar → borrar todo (Zona de peligro) → importar el fichero exportado deja la base **equivalente** a la de partida (round-trip íntegro).
- [ ] AC-15 (**Helper de entrega compartido**): la exportación a XLSX de Historial (spec 007) y la copia JSON usan el **mismo** helper `guardarBlob()` de `guardar-fichero.ts` (generalizado desde `excel-guardar.ts`), parametrizado por `TipoFichero` (`TIPO_XLSX`/`TIPO_JSON`). Misma UX de destino en iOS («Guardar en Archivos» y elegir carpeta). No cambia el contenido ni el nombre del XLSX.

### Bloque B — Iconos de la app

- [ ] AC-16: Los iconos placeholder se sustituyen por el set de marca. Los iconos que **consume la web/PWA** se sirven desde `static/`; el resto del set (tamaños de store) se versiona pero **no** se sirve ni se precachea (ver Notas técnicas).
- [ ] AC-17 (**Manifest**): `icons` incluye `192` y `512` (`purpose` normal) y `192` y `512` **maskable**, apuntando a los ficheros reales.
- [ ] AC-18 (**iOS**): `apple-touch-icon` (180×180) es el icono de marca real; al «Añadir a pantalla de inicio» en iOS aparece el icono correcto (iOS ignora el manifest para el icono de inicio).
- [ ] AC-19 (**Favicon**): el favicon del navegador es el de marca (PNG 32/16), **no** el logo de Svelte; se retira el uso de `favicon.svg` placeholder.
- [ ] AC-20 (**Instalación**): al instalar la PWA (Android/desktop) el icono mostrado es el de marca, en variante normal y maskable (sin recortes feos en Android).
- [ ] AC-21: El zip fuente se retira de la raíz del repo (se conserva el set en una ruta versionada, ver Notas técnicas); `git status` queda limpio.
- [ ] AC-22 (**Peso offline**): el precache del service worker **no** se infla con el set completo de iconos; solo entran los pocos que la PWA sirve (presupuesto de `size` respetado).

## Edge cases

- **Fichero corrupto / no-JSON / de otra app**: se detecta en validación (AC-07); mensaje claro, base intacta.
- **Usuario cancela la hoja de compartir**: `navigator.share` rechaza con `AbortError`; se trata como no-op (sin error ni descarga de respaldo).
- **Web Share sin soporte de ficheros** (algún navegador/desktop): se usa el *fallback* de descarga por enlace (AC-05).
- **Backup de esquema futuro** (`schema` > 4): se rechaza con mensaje («copia creada con una versión más nueva»); no se intenta importar a ciegas.
- **Backup enorme** (miles de jornadas): la importación transaccional con `bulkAdd` debe completar sin bloquear la UI de forma perceptible; export idem.
- **`id`s en el fichero**: se conservan al reinsertar (la base destino está vacía tras el clear); no hay colisión.
- **Importar con jornada abierta en curso en el dispositivo destino**: se descarta el estado activo si tras el reemplazo esa jornada no existe (AC-10).
- **iOS y caché de icono**: iOS cachea agresivamente el icono de inicio; un cambio puede no verse hasta reinstalar (documentar, no bloquea).
- **Base path del hospedaje** (`/fitxaketa/` en GitHub Pages): los `src` de iconos del manifest deben resolverse relativos a la base; coordinar con la (futura) spec de hospedaje para no romper rutas (ver Notas técnicas).

## Fuera de scope

- **Entrega automática del backup** (a Drive/email, periódico/desatendido): sigue aparcado (ver 008 `## Fuera de scope`). Aquí es **descarga local manual**.
- **Fusión/merge** de datos al importar (combinar en vez de reemplazar): esta spec solo hace **reemplazo** con confirmación. Un merge con deduplicación sería otra spec.
- **Sincronización multi-dispositivo** en tiempo real: si se hace, va en [004](./004-backend-google-sheets.md).
- **Cifrado del fichero de backup**: el `.json` va en claro; el usuario decide dónde guardarlo.
- **Migración automática entre orígenes** sin fichero (copiar IndexedDB entre dominios): imposible por el aislamiento por origen; el fichero es el vehículo.
- **Exportar a XLSX**: ya existe en Historial (spec [007](./007-exportacion-datos.md)); no se toca.
- **Generación de iconos** (a partir de un master): los iconos vienen ya generados desde diseño.

## Notas técnicas

### Formato del backup (JSON)

```jsonc
{
  "app": "fitxaketa",
  "version": 1,            // versión del FORMATO de backup (no de la app)
  "schema": 4,             // versión del esquema Dexie de origen
  "exportado": "2026-07-23T18:00:00.000Z",
  "jornadas": [ /* filas tal cual la tabla, Date→ISO */ ],
  "settings": [ /* snapshots tal cual la tabla, Date→ISO */ ]
}
```

- **Serialización**: `JSON.stringify` convierte `Date`→ISO string automáticamente. Al importar hay que **revivir** explícitamente `start_time`, `end_time` (nullable) y `settings.fecha` a `Date` (no confiar en reviver implícito).
- **Validación** (import): comprobar `app === 'fitxaketa'`, `Array.isArray(jornadas)` y `settings`, y `schema === 4` (rechazar `> 4`; para `< 4` no aplica porque no hubo backups previos). Validación de forma mínima por fila (campos requeridos) para fallar pronto y con mensaje.

### Piezas de código (estimación)

```
src/lib/utils/backup.ts            # NUEVO (puro): tipos BackupData; serializar(jornadas,settings)→string;
                                   #   parsear(texto)→BackupData (valida + revive fechas). Testable sin DB.
src/lib/utils/guardar-fichero.ts   # GENERALIZAR+RENOMBRAR (era excel-guardar.ts): guardarBlob(blob, nombre, tipo)
                                   #   ya hacía showSaveFilePicker/share/descarga; se parametriza el tipo (XLSX|JSON).
src/lib/db-backup.ts               # NUEVO: exportarDatos()→BackupData (lee ambas tablas);
                                   #   importarDatos(data) → transacción rw: clear ambas + bulkAdd + seedSettingsIfEmpty.
src/lib/stores/app-state-backup.ts # NUEVO: exportarCopia() (arma+descarga); importarCopia(texto)
                                   #   (parsea+valida+aplica+recarga stores, espejo de app-state-borrado).
src/lib/components/ajustes/CopiaSeguridad.svelte  # NUEVO: sección Ajustes (botón exportar; input file importar;
                                   #   reutiliza ConfirmacionDestructiva para el reemplazo).
src/routes/configuracion/+page.svelte             # MODIFICAR: montar <CopiaSeguridad/> (encima de la Zona de peligro).
src/lib/utils/excel-wrapper.ts     # MODIFICAR (AC-15): guardarFichero() delega la entrega en entregarFichero()
                                   #   (generar el Blob del XLSX con write-excel-file, pero entregarlo vía share/fallback).
```

La recarga tras importar reutiliza el patrón de `app-state-borrado.ts`: `stopTimer()`, `resetEstadoJornada()` si procede, `cargarSettings()`, `cargarJornadas()`, `notificarCambio()`.

### Entrega del fichero (export) — helper compartido

**Corrección respecto al análisis inicial:** al implementar sobre `main` se comprobó que la exportación a Excel (Historial, spec 007) **ya** usa un helper de guardado nativo, `guardarBlob()` en `src/lib/utils/excel-guardar.ts`, con cascada **`showSaveFilePicker` (escritorio «Guardar como») → `navigator.share` (hoja de compartir en móvil) → descarga por enlace**. `write-excel-file` ya se usa vía `toBlob()`, no `toFile()`. Es decir, el Excel **ya comparte**; el supuesto previo («descarga plana, sin share») era de un estado anterior de la rama.

Por tanto, en vez de crear un helper nuevo, esta feature **generaliza y renombra** ese helper a `src/lib/utils/guardar-fichero.ts` con firma `guardarBlob(blob, nombre, tipo: TipoFichero = TIPO_XLSX)`, donde `TipoFichero` aporta `mime`/`descripcion`/`extensiones` (`TIPO_XLSX`, `TIPO_JSON`). Así **Excel y copia JSON comparten exactamente la misma UX** de guardado/compartir.

> **Decisión (2026-07-23) — ya materializada:** AC-15 = «backup y Excel comparten `guardar-fichero.ts`». `excel-wrapper.ts` pasa a importar `guardarBlob` desde la nueva ruta (sin más cambios: el tipo por defecto es XLSX); el store de backup llama `guardarBlob(blob, nombre, TIPO_JSON)`. No cambia el contenido ni el nombre del XLSX.

### Iconos — colocación y cableado

Ubicación de los ficheros (extraídos del zip):

```
static/favicon-16.png
static/favicon-32.png
static/apple-touch-icon.png        # 180×180 (reemplaza el placeholder)
static/icon-192.png                # normal
static/icon-512.png                # normal
static/icon-maskable-192.png       # maskable
static/icon-maskable-512.png       # maskable
design/app-icons/                  # set COMPLETO (1024, 20..167, maskable-432, …) versionado pero NO servido
```

Rationale de peso (AC-19): `static/` se copia al cliente y el glob `client/**/*.png` lo **precachea**. Meter el set completo (~1 MB) inflaría la instalación offline. Solo van a `static/` los ~7 iconos que la web/iOS realmente piden; el resto («todos los stores») se conserva en `design/app-icons/` para cuando se empaquete como app nativa, sin servirse.

Cambios de cableado:

- `vite.config.ts` → `SvelteKitPWA.manifest.icons`:
  ```
  { src: '/icon-192.png',          sizes: '192x192', type: 'image/png' },
  { src: '/icon-512.png',          sizes: '512x512', type: 'image/png' },
  { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
  { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ```
- `src/app.html` → añadir favicons (`<link rel="icon" sizes="32x32" href="/favicon-32.png">` y 16); `apple-touch-icon` ya está (repuntar si cambia el nombre).
- `src/routes/+layout.svelte` → retirar `import favicon from '$lib/assets/favicon.svg'` y su `<link rel="icon">` (lo cubre app.html), o repuntarlo al PNG de marca. Eliminar el `favicon.svg` de Svelte si queda huérfano.
- Retirar `Icono para aplicación Fixtaketa.zip` de la raíz.

**Coordinación con el hospedaje (base path):** cuando la app se sirva bajo `/fitxaketa/` (GitHub Pages), los `src` absolutos (`/icon-192.png`) deben pasar a resolverse contra la base. Se deja anotado para la spec de hospedaje; en esta feature los iconos van con rutas de raíz (como el resto de la app hoy).

## Verificación

| Criterio                     | Método                                                        | Evidencia                                                        |
| ---------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| Exportar copia               | Con datos, pulsar Exportar                                     | Genera `fitxaketa-backup-*.json` con jornadas + settings        |
| Entrega en iOS (share)       | Exportar en iPhone instalado                                   | Se abre la hoja de compartir; «Guardar en Archivos» pide carpeta |
| Fallback de entrega          | Navegador sin Web Share de ficheros                           | Descarga por enlace a Descargas                                 |
| Cancelar compartir           | Abrir hoja de compartir y cancelar                            | Sin error ni descarga de respaldo                              |
| Importar — elegir fichero    | iOS: pulsar Importar                                          | Abre Archivos; se navega y elige el `.json`                     |
| Export offline / vacío       | Modo avión y base vacía                                       | Genera JSON válido (arrays vacíos), sin error                   |
| Validación de fichero        | Importar un `.json` cualquiera / de otra app                  | Error claro; base intacta                                       |
| Schema futuro                | Importar backup con `schema` 5                                | Rechazado con mensaje; base intacta                             |
| Importar + confirmar         | Importar backup válido y confirmar                            | `jornadas`/`settings` reemplazadas por las del fichero          |
| Fechas revividas             | Revisar Historial tras importar                               | Fechas/horas/duración correctas (Date, no string)              |
| Reactividad                  | Importar y navegar a Historial/Estadísticas                   | Reflejan lo importado sin recargar                              |
| Round-trip                   | Exportar → reset de fábrica → importar el fichero             | Base equivalente a la de partida (AC-14)                        |
| Excel unificado (AC-15)      | Exportar XLSX en Historial (iOS)                             | Abre hoja de compartir; contenido/nombre del XLSX intactos      |
| Cancelar import              | Abrir confirmación y Cancelar                                 | No se modifica nada                                             |
| Manifest icons               | DevTools → Application → Manifest                              | 192/512 normal + 192/512 maskable, sin errores de icono         |
| apple-touch-icon             | iOS: Añadir a pantalla de inicio                              | Icono de marca correcto                                         |
| Favicon                      | Pestaña del navegador                                         | Icono de marca (no logo Svelte)                                 |
| Peso offline                 | `npm run build` + `npm run size`                              | Precache sin el set completo; dentro de budget                  |
| Zip retirado                 | `git status`                                                  | Sin el `.zip` en raíz; set en `design/app-icons/`               |
| Type check / lint / tests    | `npm run check`, `lint`, `test:unit`, e2e afectados          | Verde                                                           |
```
