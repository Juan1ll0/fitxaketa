# 002 - Almacenamiento Offline con Dexie.js y Gestión de Jornadas

**Status:** done
**Creada:** 2026-06-12
**Autor:** sistema

## Resumen

Instalar Dexie.js, implementar la capa de almacenamiento offline (IndexedDB) para persistir jornadas localmente, conectar el botón de fichaje a la base de datos mediante un store global de estado, y crear una página MVP de listado (/registros) para verificar visualmente que los registros se almacenan correctamente con duración formateada.

## Contexto

La PWA necesita almacenar jornadas en el navegador para funcionar sin conexión y sincronizarlas cuando haya red. Dexie.js proporciona una capa typed sobre IndexedDB que permite operaciones CRUD asíncronas con mínima configuración.

Además, se necesita un MVP de listado de registros para validar que la persistencia funciona correctamente, mostrando la hora de inicio/fin, duración formateada, estado de sincronización y ubicación de cada jornada.

La configuración inicial (token + URL del backend) se aborda en la spec 004.

## Historias de usuario

- Como usuario, quiero que mis jornadas se guarden localmente aunque no tenga conexión a internet
- Como desarrollador, quiero una API typed con TypeScript para operar sobre IndexedDB de forma predecible
- Como usuario, quiero poder ver una lista de mis jornadas registradas para verificar que se están guardando correctamente
- Como usuario, quiero que el botón de fichar persista automáticamente los registros en la base de datos local
- Como usuario, quiero que el estado de la jornada activa persista entre navegaciones y recargas de página

## Criterios de aceptación

### Almacenamiento offline (Dexie)

- [x] Dependencia `dexie` instalada (sin otras librerías de UI por ahora)
- [x] Base de datos Dexie creada en `src/lib/db.ts` con tabla `jornadas`
- [x] Schema de `jornadas`: `id` (autoincremental), `start_time` (Date), `end_time` (Date | null), `lat_start` (number | null), `lng_start` (number | null), `lat_end` (number | null), `lng_end` (number | null), `duration` (number, minutos), `synced` (0 | 1, default 0)
- [x] Método `createJornada(jornada)` para insertar una jornada local (con `synced: 0`)
- [x] Método `closeJornada(id, endTime, latEnd, lngEnd, duration)` para cerrar una jornada abierta
- [x] Método `getAllJornadas()` para obtener todas las jornadas
- [x] Método `getOpenJornada()` para obtener la jornada actualmente abierta (end_time === null)
- [x] Método `getUnsyncedJornadas()` para obtener jornadas no sincronizadas (`synced === 0`)
- [x] Método `markAsSynced(id)` para marcar una jornada como sincronizada (`synced: 1`)
- [x] Método `clearSynced()` que elimina las jornadas ya sincronizadas (`synced === 1`) cuyo `start_time` sea anterior a 30 días. En este MVP no se invoca desde la UI; lo invocará la lógica de sincronización de la spec 004
- [x] Tipos exportados desde `src/lib/db.ts`: `Jornada` (registro completo, con `id` y `synced`) y `JornadaData` (datos de entrada para `createJornada`, sin `id` ni `synced`)
- [x] El acceso a la base de datos solo ocurre en el navegador: `npm run build` (incluido el prerender) no falla por referencias a `indexedDB` en SSR

### Store global de estado

- [x] Store global creado en `src/lib/stores/app-state.ts`
- [x] Función `initAppState()` que carga el estado desde IndexedDB al iniciar la app
- [x] Función `startJornada()` que crea una nueva jornada en la BD y actualiza el estado
- [x] Función `stopJornada()` que cierra la jornada activa en la BD y actualiza el estado
- [x] Estado persiste entre navegaciones de página y recargas (se recarga desde IndexedDB en `initAppState`)
- [x] El store expone el estado reactivo de la jornada activa (si existe) y el cronómetro

### Persistencia desde botón de fichaje

- [x] El botón "Fichar entrada" llama a `startJornada()` del store global
- [x] El botón "Fichar salida" llama a `stopJornada()` del store global
- [x] Los campos `lat_start`, `lng_start`, `lat_end`, `lng_end` se guardan como `null` por ahora (sin geolocalización en este MVP)
- [x] El contador horario del reloj sigue funcionando igual que antes

### Página de listado (/registros)

- [x] Ruta `/registros` creada con listado de todas las jornadas almacenadas
- [x] Cada registro muestra: hora de inicio, hora de fin, duración formateada (HH:MM:SS), sync (✅/❌)
- [x] Lista ordenada por `start_time` descendente (más reciente primero)
- [x] La página principal tiene un botón/enlace para navegar a /registros
- [x] La página /registros tiene un botón para volver a la página principal

### Colores via tokens del theme

- [x] El botón de "Fichar salida" no usa colores hardcodeados (`bg-red-500`/`bg-red-600` en `src/routes/+page.svelte`): se define un token `--color-danger` (y su variante hover) en el bloque `@theme` de `src/app.css` y el botón lo consume
- [x] No se introducen nuevos colores hardcodeados en los componentes de esta spec (siempre via tokens de `@theme`)

## Notas técnicas

- Dexie v4+ (versión actual), schema definido con `db.version(1).stores({...})`
- La tabla `jornadas` usa `++id` como clave primaria autoincremental de Dexie
- En el string de `stores()` solo van los campos indexados: `'++id, start_time, end_time, synced'`
- **IndexedDB no puede indexar booleanos**: `synced` se modela como `0 | 1` (number) para que `where('synced').equals(0)` funcione. No usar `boolean`
- `start_time` y `end_time` se almacenan como Date nativo de JS
- `lat_start`, `lng_start`, `lat_end`, `lng_end` se tipan como `number | null` (null cuando el fichaje es manual sin geolocalización). No usar opcionales: el campo siempre está presente
- `duration` se almacena como número entero representando minutos
- En este MVP lat/lng van a null — la geolocalización se añadirá en spec 005
- `synced` se usará en 004 para sincronización con Google Sheets
- El token y URL del backend no se tocan aquí — se gestionan en 004
- **Store global**: `src/lib/stores/app-state.ts` gestiona el estado de la jornada activa. Se inicializa con `initAppState()` desde el layout raíz. Las funciones `startJornada()` y `stopJornada()` encapsulan la lógica de BD + estado reactivo
- **Persistencia de estado**: El store recarga la jornada abierta desde IndexedDB en cada navegación/recarga, garantizando que el cronómetro y el estado del botón persistan
- **SSR**: `indexedDB` no existe en el servidor. La instancia de Dexie no debe abrirse durante SSR/prerender: usar `export const ssr = false` en `/registros` o proteger los accesos con `browser` de `$app/environment`
- El proyecto usa Tailwind v4: los tokens de color se definen en el bloque `@theme` de `src/app.css` (que ya genera CSS custom properties), no en un `:root` manual
- La ruta `/registros` carga client-side (no necesita server data)

## Verificación

| Criterio         | Método                                                                         | Evidencia                                     |
| ---------------- | ------------------------------------------------------------------------------ | --------------------------------------------- |
| Dexie instalado  | `package.json` contiene `dexie`                                                | `npm ls dexie`                                |
| BD creada        | Importar `db` desde `$lib/db`                                                  | Sin errores de import                         |
| Create jornada   | Pulsar "Fichar entrada"                                                        | Aparece en /registros con sync ❌             |
| Close jornada    | Pulsar "Fichar salida"                                                         | Jornada cerrada con duración calculada        |
| Get open jornada | Consola DevTools: `await db.getOpenJornada()`                                  | Devuelve jornada activa o null                |
| GetAll jornadas  | Abrir /registros tras varias jornadas                                          | Lista con todos los registros                 |
| Unsynced filter  | Consola DevTools: `await db.getUnsyncedJornadas()` tras marcar uno como synced | Solo devuelve los de `synced === 0`           |
| Mark as synced   | Consola DevTools: `await db.markAsSynced(id)` y recargar /registros            | El registro pasa a sync ✅                    |
| Clear synced     | Sin verificación en este MVP (no hay registros >30 días); se verificará en 004 | —                                             |
| Store global     | Navegar entre páginas y recargar                                               | Estado de jornada activa persiste             |
| Navegación       | Botón "Ver registros" en página principal → /registros                         | Ruta cambia correctamente                     |
| Volver           | Botón "Volver" en /registros                                                   | Vuelve a página principal                     |
| Tokens de color  | Buscar `red-500`/`red-600` en `src/routes` e inspeccionar `@theme` en app.css  | Sin clases de color hardcodeadas, token usado |
| SSR seguro       | `npm run build`                                                                | Build y prerender sin errores de `indexedDB`  |
| Build            | `npm run build`                                                                | Sin errores                                   |
| Type check       | `npm run check`                                                                | Sin errores                                   |
