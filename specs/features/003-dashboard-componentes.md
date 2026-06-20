# 003 - Dashboard: Arquitectura de Navegacion y Pantallas

**Status:** approved
**Creada:** 2026-06-12
**Actualizada:** 2026-06-21
**Autor:** sistema

## Resumen

Definir la estructura de navegacion de la app mediante un bottom nav con 3 tabs (Fichar, Historial, Estadisticas). Esta spec es el paraguas que define la arquitectura general; cada tab se implementa en su sub-spec correspondiente.

## Sub-specs

| Sub-spec | Descripcion | Estado | Dependencias |
|----------|-------------|--------|--------------|
| [003.1](./003.1-navegacion.md) | Bottom Nav + layout compartido | draft | - |
| [003.2](./003.2-tab-fichar.md) | Tab Fichar (cronometro + resumen) | draft | 003.1 |
| [003.3](./003.3-tab-historial.md) | Tab Historial (lista agrupada) | draft | 003.1 |
| [003.4](./003.4-tab-estadisticas.md) | Tab Estadisticas (graficas) | draft | 003.1 |

## Contexto

La app necesita una estructura de navegacion clara tipo app movil. Actualmente existen dos rutas sueltas (`/` y `/registros`) sin navegacion unificada. Esta spec define la arquitectura de pantallas.

El cronometro base ya funciona via el store `app-state.ts`. Las graficas consumen datos de `getAllJornadas()` de Dexie.

## Historias de usuario

- Como usuario, quiero una navegacion por tabs inferior para moververme entre las secciones de la app
- Como usuario, quiero ver un cronometro que muestre cuanto llevo fichado y poder iniciar/parar el fichaje
- Como usuario, quiero ver un historial de mis jornadas registradas
- Como usuario, quiero ver graficas de horas trabajadas (una barra por jornada/fichaje)

## Criterios de aceptacion (globales)

### Navegacion por tabs (Bottom Nav)

- [ ] Bottom nav fijo en la parte inferior con 3 tabs: Fichar, Historial, Estadisticas
- [ ] Cada tab tiene icono + texto (iconos SVG inline o componente)
- [ ] Tab activo resaltado con color del theme (`--color-primary`)
- [ ] Navegacion entre tabs sin recarga de pagina (SvelteKit client-side routing)
- [ ] Layout compartido con `<slot />` para el contenido de cada tab
- [ ] Las rutas existentes (`/` y `/registros`) se reorganizan bajo esta estructura

### Integracion y datos

- [ ] Todos los datos se leen de Dexie (`getAllJornadas()`, `getOpenJornada()`)
- [ ] No se hacen peticiones HTTP al backend (eso es spec 004)
- [ ] Los componentes son cliente-only (SSR deshabilitado donde sea necesario)

## Notas tecnicas

### Estructura de rutas

```
src/routes/
+-- +layout.svelte          # Layout raiz con BottomNav
+-- +page.svelte            # Tab Fichar (home)
+-- historial/
|   +-- +page.svelte        # Tab Historial
+-- estadisticas/
    +-- +page.svelte        # Tab Estadisticas
```

### Utilidades puras

Crear `src/lib/utils/dashboard.ts` con:
- `formatearFecha(date: Date): string` — formato "Lunes, 21 de junio de 2026"
- `formatearHora(date: Date): string` — formato "HH:MM"
- `agruparPorDia(jornadas: Jornada[]): Map<string, Jornada[]>` — agrupa por fecha
- `filtrarPorPeriodo(jornadas: Jornada[], periodo: 'semana' | 'mes' | 'ano'): Jornada[]`
- `calcularResumen(jornadas: Jornada[]): { totalHoras: number, mediaDiaria: number, diasTrabajados: number, totalJornadas: number }`

### SSR

- Dexie/IndexedDB no existe en servidor
- Las rutas que usan Dexie necesitan `export const ssr = false`
- Chart.js necesita DOM, inicializar en `onMount`

## Fuera de scope (MVP)

- **Tab Mapa** — se implementara cuando se capturen coordenadas GPS desde el dispositivo (spec futura, posiblemente tras spec 005)
- Integracion con Google Apps Script (spec 004)
- Geolocalizacion real en tiempo real (spec 005)
- Sincronizacion offline/online (spec 004)
- Configuracion de token/URL backend (spec 004)
- Automatizacion movil iOS/Android (spec 005)

## Verificacion

| Criterio | Metodo | Evidencia |
|----------|--------|-----------|
| Bottom nav | Navegar entre tabs | Tabs se resaltan, contenido cambia |
| Build | `npm run build` | Sin errores |
| Type check | `npm run check` | Sin errores |
| Quality gate | `npm run quality` | Todos los checks pasan |
