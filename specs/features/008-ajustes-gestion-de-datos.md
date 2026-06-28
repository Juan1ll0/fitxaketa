# 008 - Ajustes: gestión de datos (borrado y limpieza de acciones)

**Status:** done
**Creada:** 2026-06-28
**Autor:** Juan Ignacio
**Depende de:** [003.5](./003.5-configuracion.md)

## Resumen

Implementar las acciones de la página de **Ajustes** (`/configuracion`) que en la spec [003.5](./003.5-configuracion.md) quedaron como **diseño UX/placeholder** (`AccionesConfig.svelte`), y limpiar las opciones que ya no aportan. Dos bloques:

1. **Borrado de datos (Zona de peligro)** — reseteo de fábrica, borrado granular de jornadas (año/mes/semana/día/jornada concreta, ofreciendo únicamente periodos con datos) y borrado solo de la configuración.
2. **Limpieza de acciones obsoletas** — eliminar por completo la sección "Datos y sincronización" (Sincronizar / Exportar datos / Copia de seguridad) y la sección "Histórico de horas semanales" de la página de Ajustes.

> **Copia de seguridad: fuera de scope.** El backup (Excel periódico + entrega por Drive/email) se **aparca** y se moverá a su propia spec futura, una vez se decida el mecanismo de entrega (cliente OAuth `drive.file`, GAS relé o GAS autónomo — ver `## Fuera de scope`). Por eso esta spec ya **no depende de [007](./007-exportacion-datos.md)** ni introduce Drive/OAuth/ZIP.

## Contexto

`/configuracion` es el 4º tab "Ajustes" (003.5). La persistencia es offline-first en Dexie (`src/lib/db.ts`): tabla `jornadas` y tabla `settings` **append-only** (cada cambio = un snapshot fechado; ver 003.5). Estado reactivo en `src/lib/stores/app-state.*`.

Estado actual de las piezas que toca esta spec:

- `src/lib/components/AccionesConfig.svelte` — filas **deshabilitadas** ("Próximamente"): grupo "Datos y sincronización" (Sincronizar / Exportar datos / Copia de seguridad) y "Zona de peligro" (Restablecer y borrar datos).
- `src/routes/configuracion/+page.svelte` — incluye una sección **"Histórico de horas semanales"** (`historicoCampo(snapshots, 'horas_semanales')`).
- La consulta/filtrado de datos y la descarga XLSX viven en la pantalla de **Historial** (exportación implementada en la spec [007](./007-exportacion-datos.md)); por eso "Exportar datos" sobra como acción suelta de Ajustes.

Decisiones tomadas con el usuario (entrevista 2026-06-28):

- Se **elimina la sección "Datos y sincronización" entera**: "Sincronizar" y "Copia de seguridad" se aparcan (el backup a su propia spec); "Exportar datos" ya está cubierto por Historial. Ajustes queda con el formulario de configuración + "Zona de peligro".
- Se **elimina "Histórico de horas semanales"**: es ruido en una pantalla de ajustes/acciones; no aporta información accionable.
- El borrado se atribuye por **`diaDeJornada(start_time)`** (003.5): una jornada que cruza medianoche cuenta en su día de inicio.

## Historias de usuario

- Como usuario, quiero **borrar** mis jornadas con la granularidad que necesite (un año, un mes, una semana, un día o una jornada concreta) para corregir errores o limpiar periodos, sin tener que borrarlo todo.
- Como usuario, quiero poder **resetear la app de fábrica** (todas las jornadas + configuración) para empezar de cero.
- Como usuario, quiero poder **borrar solo la configuración** y conservar mis jornadas.
- Como usuario, quiero que el borrado solo me deje elegir **periodos que realmente tienen datos**, para no navegar por meses vacíos.
- Como usuario, quiero que la pantalla de Ajustes **no muestre acciones que no hacen nada** ni información que no aporta.

## Criterios de aceptación

### Borrado de datos — Zona de peligro (NEW)

Todas las acciones de borrado exigen **confirmación** mediante bottom sheet con foco inicial en **Cancelar**, rojo sólido solo en **Confirmar**, y muestran el **número de jornadas afectadas** antes de confirmar (003.5 ya define el patrón de la Zona de peligro).

- [ ] AC-01: La Zona de peligro presenta tres acciones diferenciadas: **Reseteo de fábrica**, **Borrar jornadas** y **Borrar solo la configuración**.
- [ ] AC-02 (**Reseteo de fábrica**): borra **todas** las jornadas y **todos** los snapshots de `settings`. Tras borrar, se siembra un snapshot por defecto (como en primer arranque, 003.5) para que `settingsVigente()` siempre encuentre uno; el estado vuelve a "sin jornada activa".
- [ ] AC-03 (**Borrar solo configuración**): vacía la tabla `settings` y siembra de nuevo el snapshot por defecto; **no toca** las jornadas. El histórico de settings se pierde (queda solo el snapshot por defecto).
- [ ] AC-04 (**Borrar jornadas — selección de alcance**): el usuario elige granularidad **Año / Mes / Semana / Día / Jornada** y luego el valor concreto.
- [ ] AC-05: En cada nivel, **solo se ofrecen opciones con jornadas registradas** (años con datos; dentro del año, meses con datos; etc.). Niveles sin datos no se muestran o quedan deshabilitados.
- [ ] AC-06 (**Borrar 1 año**): elimina todas las jornadas **atribuidas** (por `diaDeJornada`) a ese año.
- [ ] AC-07 (**Borrar 1 mes**): elimina las jornadas atribuidas a ese mes/año.
- [ ] AC-08 (**Borrar 1 semana**): elimina las jornadas de esa semana, respetando el **primer día de semana** vigente (`settingsActual().primer_dia_semana`).
- [ ] AC-09 (**Borrar 1 día**): elimina las jornadas atribuidas a ese día.
- [ ] AC-10 (**Borrar 1 jornada concreta**): elimina una única jornada por `id`, identificada por su fecha y horas de inicio/fin en la lista.
- [ ] AC-11: La atribución temporal usa **`diaDeJornada(start_time)`** (cruce de medianoche cuenta en el día de inicio), nunca `end_time`.
- [ ] AC-12: Si hay una **jornada abierta** dentro del rango a borrar, se borra igual que las cerradas y, si era la activa, el estado vuelve a "sin jornada activa".
- [ ] AC-13: Tras cualquier borrado, las vistas (Fichar, Historial, Estadísticas) se actualizan **reactivamente** sin recargar (se recarga el store de jornadas).
- [ ] AC-14: Cancelar en la confirmación no borra nada.

### Limpieza de acciones obsoletas (NEW)

- [ ] AC-15: La sección **"Datos y sincronización"** se elimina por completo de Ajustes (`AccionesConfig.svelte`): desaparecen las filas "Sincronizar", "Exportar datos" y "Copia de seguridad".
- [ ] AC-16: Ajustes queda compuesto por el **formulario de configuración** (003.5) y la **"Zona de peligro"** (este spec); no hay grupo intermedio de datos/sincronización.
- [ ] AC-17: La sección **"Histórico de horas semanales"** se elimina de `configuracion/+page.svelte` (y, si queda muerto, el `historicoCampo` asociado **en esa vista**; la función sigue exportada para otros usos/tests).
- [ ] AC-18: Los **tests** que afirmaban la presencia de esas filas/secciones se actualizan o eliminan.

## Edge cases

- **Sin datos**: borrar con la base vacía no ofrece ningún periodo; las acciones de borrado granular quedan deshabilitadas o muestran "no hay jornadas".
- **Jornada que cruza medianoche / fin de mes / fin de año**: se atribuye por `start_time` (AC-11); una jornada 31-dic 22:00 → 1-ene 02:00 cuenta en el año que termina.
- **Semana a caballo entre dos meses/años**: el borrado por semana usa el rango real de la semana (lunes→domingo por defecto), no se recorta al mes.
- **Cambio del primer día de semana** entre que se listan las semanas y se borra: el rango se recalcula con `settingsActual()` en el momento del borrado.
- **Reseteo de fábrica con jornada abierta**: debe cerrar/limpiar el estado activo además de borrar la fila.
- **Zona horaria**: los rangos de borrado se calculan en **local** (coherente con 003.5: timestamps UTC interpretados en local).

## Fuera de scope

- **Copia de seguridad** (Excel periódico mensual/anual + entrega): aparcada a una **spec futura**. Quedó analizado el mecanismo de entrega: (a) **OAuth de cliente** con scope `drive.file` (sube directo a Drive, no requiere verificación de Google, no depende de 004, pero requiere abrir la app); (b) **GAS relé** (el cliente genera el ZIP reutilizando 007 y GAS solo lo guarda en Drive; `no-cors` impide leer el estado); (c) **GAS autónomo** (trigger temporal server-side, único modo realmente desatendido y con email, pero reimplementa el Excel en Apps Script y exige sincronizar los settings a Sheets). La spec futura retomará esta decisión.
- **Exportar datos / descarga de fichero**: ya vive en Historial (spec [007](./007-exportacion-datos.md)); no se duplica en Ajustes.
- **Sincronización bidireccional** real (multi-dispositivo con merge): si se hace, va en [004](./004-backend-google-sheets.md).
- **Restauración/importación** de datos.
- **Borrado por criterios arbitrarios** (p. ej. "jornadas de menos de 1h"): la granularidad es la temporal listada.
- **Papelera / deshacer** tras el borrado: el borrado es definitivo (con confirmación previa).

## Notas técnicas

### Helpers de borrado (`src/lib/db.ts`)

No requiere migración de esquema (las operaciones de borrado trabajan sobre la v4 actual). Añadir, junto a los existentes (`getAllJornadas`, etc.):

```typescript
// Borra jornadas cuyo diaDeJornada(start_time) cae en [desde, hasta).
borrarJornadasEnRango(desde: Date, hasta: Date): Promise<number>;   // nº borradas
borrarJornada(id: number): Promise<void>;
borrarTodasLasJornadas(): Promise<void>;                            // db.jornadas.clear()
borrarTodosLosSettings(): Promise<void>;                            // db.settings.clear() + seedSettingsIfEmpty()
resetDeFabrica(): Promise<void>;                                    // jornadas.clear + settings.clear + seed default
```

El cálculo de rangos (año/mes/semana/día) reutiliza `fecha-negocio.ts` (`inicioDia`, `inicioSemana`, `PRIMER_DIA_SEMANA`) y el `primer_dia_semana` de `settingsActual()` para la semana. La atribución usa `diaDeJornada`. Como `diaDeJornada` deriva de `start_time`, el corte por rango es efectivamente sobre `start_time`.

### Periodos con datos (para la selección)

Derivar de `getAllJornadas()` los años/meses/semanas/días con al menos una jornada (agrupando por `diaDeJornada(start_time)`), para poblar selectores en cascada que **solo** ofrezcan periodos no vacíos. Mostrar el **conteo** por periodo ayuda a la confirmación.

### UX de la selección de alcance

Selector en cascada **Año → Mes → Semana → Día → Jornada**; el usuario puede **detenerse en cualquier nivel** y borrar ese nivel completo, o bajar hasta una jornada concreta. Cada nivel filtra al subconjunto con datos del nivel superior. La acción final abre la confirmación destructiva (003.5) mostrando "Se borrarán N jornadas".

### Archivos afectados (estimación)

```
src/lib/db.ts                                # MODIFICAR: helpers de borrado (sin cambio de esquema)
src/lib/utils/borrado-periodos.ts            # NUEVO (puro): periodosConDatos, rangoDe
src/lib/utils/borrado-tipos.ts               # NUEVO (puro): Granularidad, PeriodoConDatos
src/lib/components/AccionesConfig.svelte     # MODIFICAR: quitar "Datos y sincronización"; activar Zona de peligro
src/lib/components/ajustes/SelectorAlcance.svelte        # NUEVO: cascada de alcance
src/lib/components/ajustes/ConfirmacionDestructiva.svelte # NUEVO: bottom sheet destructivo
src/routes/configuracion/+page.svelte        # MODIFICAR: quitar "Histórico de horas semanales"
src/lib/stores/app-state.*                   # MODIFICAR: acciones de borrado + recarga reactiva
```

## Verificación

| Criterio                  | Método                                        | Evidencia                                                        |
| ------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| Reseteo de fábrica        | Con datos, ejecutar reset y confirmar         | `jornadas` y `settings` vacías; re-seed default; estado inactivo |
| Borrar solo config        | Ejecutar y revisar Dexie                      | `settings` solo con snapshot default; jornadas intactas          |
| Borrar 1 año              | Datos en 2025 y 2026; borrar 2025             | Solo desaparecen las de 2025                                     |
| Borrar 1 mes/semana/día   | Borrar cada granularidad                      | Desaparece exactamente el rango; resto intacto                   |
| Solo periodos con datos   | Abrir selector con meses vacíos               | Los vacíos no aparecen/están deshabilitados                      |
| Cruce de medianoche       | Jornada 31-dic→1-ene; borrar el año de inicio | Se borra con el año de `start_time`                              |
| Borrar 1 jornada          | Seleccionar una concreta y borrar             | Solo esa desaparece                                              |
| Confirmación              | Cancelar en el bottom sheet                   | No se borra nada                                                 |
| Reactividad               | Borrar y volver a Historial/Estadísticas      | Reflejan el borrado sin recargar                                 |
| Sección datos eliminada   | Abrir Ajustes                                 | No aparece "Datos y sincronización" (ni Sync/Export/Backup)      |
| Histórico horas eliminado | Abrir Ajustes con >1 snapshot                 | No aparece "Histórico de horas semanales"                        |
| Tests                     | `npm run test:unit` y e2e afectados           | Verde (borrado, rangos, limpieza)                                |
| Type check / lint / size  | `npm run check`, `lint`, `size`               | Sin errores; dentro de budget                                    |
