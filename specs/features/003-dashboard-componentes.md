# 003 - Dashboard: Navegacion por Tabs y Componentes Visuales

**Status:** approved
**Creada:** 2026-06-12
**Autor:** sistema

## Resumen

Definir la estructura de navegacion de la app mediante un bottom nav con 4 tabs (Fichar, Historial, Estadisticas, Mapa) e implementar los componentes visuales del dashboard: cronometro de fichaje, grafica de barras con Chart.js, y mapa de ubicaciones con Leaflet. Todos los datos se obtienen de Dexie (IndexedDB) — la integracion con backend GAS se aborda en la spec 004.

## Contexto

La app necesita una estructura de navegacion clara tipo app movil. Actualmente existen dos rutas sueltas (`/` y `/registros`) sin navegacion unificada. Esta spec define la arquitectura de pantallas y los componentes visuales principales.

El cronometro base ya funciona via el store `app-state.ts`. Esta spec lo integra en la pestana Fichar junto con el boton Start/Stop. Las graficas y el mapa consumen datos de `getAllJornadas()` de Dexie.

## Historias de usuario

- Como usuario, quiero una navegacion por tabs inferior para moververme entre las secciones de la app
- Como usuario, quiero ver un cronometro que muestre cuanto llevo fichado y poder iniciar/parar el fichaje
- Como usuario, quiero ver un historial de mis jornadas registradas
- Como usuario, quiero ver graficas de horas trabajadas (una barra por jornada/fichaje)
- Como usuario, quiero ver en un mapa donde he fichado (ubicaciones registradas)

## Criterios de aceptacion

### Navegacion por tabs (Bottom Nav)

- [ ] Bottom nav fijo en la parte inferior con 4 tabs: Fichar, Historial, Estadisticas, Mapa
- [ ] Cada tab tiene icono + texto (iconos SVG inline o componente)
- [ ] Tab activo resaltado con color del theme (`--color-primary`)
- [ ] Navegacion entre tabs sin recarga de pagina (SvelteKit client-side routing)
- [ ] Layout compartido con `<slot />` para el contenido de cada tab
- [ ] Las rutas existentes (`/` y `/registros`) se reorganizan bajo esta estructura

### Tab Fichar (home `/`)

- [ ] Cronometro visible mostrando tiempo transcurrido desde el ultimo `start` (reutiliza `getElapsed()` del store)
- [ ] Boton Start/Stop que llama a `startJornada()` / `stopJornada()` del store global
- [ ] Estado del boton reactivo: "Fichar entrada" si no hay jornada activa, "Fichar salida" si hay jornada activa
- [ ] El cronometro persiste ante recargas (basado en `start_time` de la jornada abierta en IndexedDB)
- [ ] Indicador visual de estado: "Trabajando" / "Parado"

### Tab Historial (`/historial`)

- [ ] Listado de todas las jornadas almacenadas en Dexie
- [ ] Cada registro muestra: fecha, hora inicio, hora fin, duracion formateada, sync (✅/❌)
- [ ] Lista ordenada por `start_time` descendente (mas reciente primero)
- [ ] Reutiliza la logica existente de `/registros` (migrar a la nueva ruta)

### Tab Estadisticas (`/estadisticas`)

- [ ] Grafica de barras con Chart.js mostrando horas decimales por jornada/fichaje
- [ ] Eje X: fechas de los fichajes del mes en curso
- [ ] Eje Y: horas decimales trabajadas
- [ ] Puede haber mas de una barra por dia (una por cada jornada/fichaje)
- [ ] Datos obtenidos de `getAllJornadas()` de Dexie
- [ ] Grafica responsiva (se adapta al ancho de pantalla)
- [ ] Colores de la grafica usan tokens del theme

### Tab Mapa (`/mapa`)

- [ ] Mapa Leaflet ocupando el espacio disponible
- [ ] Pines (marcadores) en las coordenadas de los fichajes (`lat_start`, `lng_start`, `lat_end`, `lng_end`)
- [ ] Solo muestra pines para jornadas con coordenadas no nulas
- [ ] Al hacer clic en un pin, mostrar popup con: fecha, hora, accion (inicio/fin)
- [ ] Mapa centrado en la ultima ubicacion conocida (o coordenadas por defecto si no hay)
- [ ] Tile layer de OpenStreetMap (gratuito, sin API key)
- [ ] Estilo oscuro del mapa consistente con el tema de la app

### Integracion y datos

- [ ] Todos los datos se leen de Dexie (`getAllJornadas()`, `getOpenJornada()`)
- [ ] No se hacen peticiones HTTP al backend (eso es spec 004)
- [ ] Los componentes son cliente-only (SSR deshabilitado donde sea necesario)
- [ ] Chart.js y Leaflet se cargan solo en sus respectivas pestanas (lazy imports si es posible)

## Notas tecnicas

### Estructura de rutas

```
src/routes/
├── +layout.svelte          # Layout raiz con BottomNav
├── +page.svelte            # Tab Fichar (home)
├── historial/
│   └── +page.svelte        # Tab Historial
├── estadisticas/
│   └── +page.svelte        # Tab Estadisticas
└── mapa/
    └── +page.svelte        # Tab Mapa
```

### Bottom Nav

- Componente `BottomNav.svelte` en `src/lib/components/`
- Fijo en la parte inferior con `position: fixed` o `sticky`
- 4 items con icono SVG + label
- Resaltar tab activo comparando `page.url.pathname` con la ruta del tab
- Padding inferior en el layout para que el contenido no quede oculto bajo el nav

### Chart.js

- Instalar `chart.js` como dependencia
- Importar solo los componentes necesarios (BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend) para minimizar bundle
- `<canvas>` nativo en el componente
- Inicializar en `onMount` / `$effect`, destruir en cleanup
- Datos: mapear `getAllJornadas()` a `{ labels: string[], data: number[] }` (horas decimales)

### Leaflet

- Instalar `leaflet` como dependencia
- Importar CSS de Leaflet (`leaflet/dist/leaflet.css`)
- Inicializar mapa en `onMount` / `$effect` con `L.map('map').setView(...)`
- Marcadores con `L.marker([lat, lng]).addTo(map).bindPopup(...)`
- Tile layer: `L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {...})`
- Para estilo oscuro: usar filtro CSS `filter: invert(100%) hue-rotate(180deg)` sobre el contenedor del mapa, o usar tiles de CartoDB Dark Matter
- Cleanup: `map.remove()` en destroy

### Dependencias

- `chart.js` — graficas de barras
- `leaflet` — mapa de ubicaciones
- `@types/leaflet` — tipos TypeScript para Leaflet (devDependency)

### Bundle budget

- Chart.js ~70 KB gzip, Leaflet ~40 KB gzip
- Budget actual: 150 KB entry / 300 KB total
- Necesario lazy loading: importar Chart.js solo en `/estadisticas` y Leaflet solo en `/mapa`
- SvelteKit soporta `import()` dinamico para code-splitting

### Cronometro

- Ya implementado en `app-state.ts` con `getElapsed()`, `getClockedIn()`
- La pestana Fichar solo consume estos valores reactivos
- No se modifica la logica del store

### SSR

- Dexie/IndexedDB no existe en servidor
- Las rutas que usan Dexie necesitan `export const ssr = false` o proteger con `browser` de `$app/environment`
- Chart.js y Leaflet necesitan DOM, inicializar en `onMount`

## Verificacion

| Criterio         | Metodo                                          | Evidencia                                |
| ---------------- | ----------------------------------------------- | ---------------------------------------- |
| Bottom nav       | Navegar entre tabs                              | Tabs se resaltan, contenido cambia       |
| Cronometro       | Pulsar Start, esperar 5s, ver tiempo            | Tiempo mostrado correcto                 |
| Persistencia     | Recargar pagina con fichaje activo              | Cronometro continua desde el timestamp   |
| Historial        | Tener >3 jornadas y navegar a Historial          | Listado visible con datos correctos      |
| Grafica          | Tener >3 fichajes y navegar a Estadisticas      | Barras visibles por jornada              |
| Mapa             | Navegar a Mapa con jornadas con coords           | Pines visibles en el mapa                |
| Popup pin        | Click en un pin del mapa                        | Popup con fecha/hora/accion              |
| Build            | `npm run build`                                 | Sin errores                              |
| Bundle size      | `npm run size`                                  | Dentro del budget (150 KB / 300 KB)      |
| Type check       | `npm run check`                                 | Sin errores                              |

## Fuera de scope

- Integracion con Google Apps Script (spec 004)
- Geolocalizacion real en tiempo real (spec 005)
- Sincronizacion offline/online (spec 004)
- Configuracion de token/URL backend (spec 004)
- Automatizacion movil iOS/Android (spec 005)
