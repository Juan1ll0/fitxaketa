---
status: approved
validated: 2026-06-27
spec: specs/features/007-exportacion-datos.md
feature: 007 - Exportación de datos a XLSX
created: 2026-06-27
phases: 5
tasks: 16
---

# Plan — 007 Exportación de datos a XLSX

## Resumen

Implementar la exportación real de jornadas cerradas a XLSX desde `/historial`, con diálogo de confirmación accesible, columnas condicionales (Balance diario, Total semana), formato de duración hh:mm, celdas numéricas para Total día y Balance diario con formato condicional (rojo/verde), fila TOTAL al final, y descarga automática. La librería `write-excel-file` se carga con import dinámico para no impactar el bundle inicial.

## Dependencias

- **Spec 003.7** (mejoras historial): botón "Exportar" ya existe como placeholder en `+page.svelte` y `historial-export.ts`.
- **Utils existentes**: `duracionEfectivaMinutos`, `balancePorDia`, `calcularBalancePeriodo`, `formatearHorasDecimal`, `settingsVigente`, `objetivoDiarioMinutos`, `claveDia`, `diaDeJornada`, `inicioSemana`.
- **Librería nueva**: `write-excel-file` (~36 KB gzip) — instalar como dependency.

## Fases

---

### Fase 1 — Tipos TypeScript y contratos de datos

**Objetivo:** Definir interfaces y tipos que usará el resto de fases.

| #    | Tarea                                                                                                                                | Asignado      | Esfuerzo | ACs |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------- | -------- | --- |
| T1.1 | Definir interfaz `Workbook` en `excel-wrapper.ts` (estado interno: filas acumuladas, columnas, nombre de hoja). Exportar tipo.       | `impl-svelte` | 15 min   | —   |
| T1.2 | Definir interfaz `ExportOptions` en `historial-export.ts`: `{ jornadas: Jornada[], snapshots: Settings[], filtro: FiltroTemporal }`. | `impl-svelte` | 10 min   | —   |
| T1.3 | Definir tipo `FilaExport` (union de fila normal y fila resumen) para uso interno del wrapper.                                        | `impl-svelte` | 10 min   | —   |

**Ficheros afectados:**

- `src/lib/utils/excel-wrapper.ts` (NUEVO — solo tipos en esta fase)
- `src/lib/utils/historial-export.ts` (MODIFICAR — añadir ExportOptions)

---

### Fase 2 — Lógica de negocio (utils, servicios)

**Objetivo:** Implementar la generación del XLSX, la agrupación por semana, y el wrapper sobre la librería.

| #    | Tarea                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Asignado      | Esfuerzo | ACs                 |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------- | ------------------- |
| T2.1 | Implementar `excel-wrapper.ts` completo: `crearWorkbook()`, `escribirCabecera()`, `escribirFila()`, `escribirFilaNumerica()` (celdas con tipo NUMERIC para Total día y Balance diario), `escribirFilaResumen()`, `escribirFilaTotal()` (fila TOTAL al final: negrita, fuente grande, borde superior grueso), `escribirSeparador()`, `aplicarFormatoCondicional()` (Balance diario: negrita, rojo si < 0, verde si >= 0), `escribirColumnaTotalSemana()` (7ª columna: negrita, fuente 4pt mayor que Balance diario, fondo verde pastel si >= 0 / rojo pastel si < 0, solo en última fila de cada semana), `guardarFichero()`. El último hace `await import('write-excel-file/browser')` internamente y guarda con `.toFile(nombre)`. Estilos: negrita en cabecera, fondo gris claro + borde superior en resumen.                                                                                                                                                                                                                                                                                                        | `impl-svelte` | 2h       | AC-05, AC-07, AC-18 |
| T2.2 | Implementar `export-agrupacion.ts`: función `agruparPorSemana(jornadas, primerDiaSemana): Map<string, Jornada[]>`. Clave formato `"YYYY-MM-DD"` (inicio de semana). Usar `inicioSemana` de `fecha-negocio.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `impl-svelte` | 45 min   | AC-16               |
| T2.3 | Implementar función auxiliar `describirPeriodo(filtro: FiltroTemporal, primerDia: number): string` en `historial-export.ts`. Formatos: "semana del 23 al 29 de junio de 2026", "mes de mayo de 2026", "año 2026", "rango del 1 al 15 de junio de 2026", "fecha 5 de junio de 2026".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `impl-svelte` | 45 min   | AC-02               |
| T2.4 | Reescribir `exportarJornadas(options: ExportOptions): Promise<void>` en `historial-export.ts`. Lógica completa: (1) filtrar solo cerradas, (2) ordenar por start_time ascendente, (3) determinar columnas según settings (5 base: Fecha/Entrada/Salida/Duración/Total día; +6 con contrato: Balance diario; +7 con contrato + export mes/año: Total semana), (4) agrupar por día — Fecha solo en primera jornada del día (vacía en siguientes jornadas del mismo día), (5) duración en formato hh:mm (ej. "04:42"), (6) Total día y Balance diario como celdas NUMÉRICAS (no strings) para permitir formato condicional en Excel, (7) formato condicional en Balance diario: negrita, rojo si < 0, verde si >= 0, (8) columna Total semana (7ª) solo en export mes/año con contrato: negra, negrita, 4pt mayor que Balance diario, fondo verde pastel si >= 0 / rojo pastel si < 0, solo en última fila de cada semana, (9) fila TOTAL al final (no resúmenes por sub-periodo): negrita, fuente grande, borde superior grueso, en columna Balance diario, (10) guardar fichero. Usa exclusivamente `excel-wrapper.ts`. | `impl-svelte` | 2h 30min | AC-05 a AC-22       |
| T2.5 | Implementar generación del nombre de fichero: `jornadas_YYYYMMDDHHmmss.xlsx` con timestamp del momento de exportación. Función interna `generarNombreFichero(): string` en `excel-wrapper.ts` o `historial-export.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `impl-svelte` | 15 min   | AC-20, AC-22        |
| T2.6 | Instalar `write-excel-file` como dependency: `npm install write-excel-file`. Verificar `npm run size` tras instalación (debe seguir dentro de presupuesto con import dinámico).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `impl-pwa`    | 15 min   | AC-24               |

**Ficheros afectados:**

- `src/lib/utils/excel-wrapper.ts` (NUEVO — implementación completa)
- `src/lib/utils/export-agrupacion.ts` (NUEVO)
- `src/lib/utils/historial-export.ts` (MODIFICAR — reescritura completa)
- `package.json` (MODIFICAR — nueva dependency)

**Decisiones de diseño:**

- `historial-export.ts` NO importa `write-excel-file` directamente (solo vía wrapper).
- La duración se formatea en hh:mm (formato hora): se crea helper interno `formatearHHMM(minutos: number): string` que convierte minutos a horas y minutos con cero a la izquierda (ej. 282 min → "04:42").
- El balance diario se calcula como: `totalDiaMinutos - objetivoDiarioMinutos(snapshots, dia)`. Solo se incluye si `horas_semanales > 0` Y `dias_laborables > 0`.
- Total día y Balance diario son celdas NUMÉRICAS (tipo NUMERIC en `write-excel-file`) para que Excel pueda aplicar formato condicional nativo.
- Formato condicional en Balance diario: negrita, color rojo si valor < 0, color verde si valor >= 0.
- Columna "Total semana" (7ª columna) solo aparece en exportación de mes/año con contrato: muestra la suma semanal, en negro, negrita, fuente 4pt mayor que Balance diario, fondo verde pastel si >= 0 / rojo pastel si < 0. Solo se escribe en la última fila de cada semana (vacía en el resto).
- Fecha agrupada: solo se muestra en la primera jornada de cada día; las siguientes jornadas del mismo día tienen la celda de Fecha vacía.
- Fila TOTAL al final del fichero (sin resúmenes intermedios por sub-periodo): negrita, fuente grande, borde superior grueso, ubicada en el área de la columna Balance diario.

---

### Fase 3 — Componentes Svelte y rutas SvelteKit

**Objetivo:** Diálogo de confirmación accesible y conexión con la exportación real.

| #    | Tarea                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Asignado      | Esfuerzo | ACs                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------- | ------------------- |
| T3.1 | Crear `ExportConfirmModal.svelte`: modal accesible con `<dialog>` nativo o `role="dialog"`. Props: `periodo: string`, `onConfirm: () => void`, `onCancel: () => void`. Usar `$props()` para las props: `let { periodo, onConfirm, onCancel } = $props()`. Foco atrapado, cierre con Escape, `aria-labelledby`, `aria-modal`. Texto: "¿Vas a exportar los datos del [periodo]? ¿Estás seguro?". Botones: "Cancelar" y "Exportar". Dark mode con Tailwind. | `impl-ui`     | 1h 30min | AC-01, AC-03, AC-04 |
| T3.2 | Modificar `historial/+page.svelte`: (1) importar `ExportConfirmModal`, (2) estado `$state` para controlar visibilidad del modal, (3) `handleExportar()` abre el modal en vez de llamar directamente a `exportarJornadas`, (4) `onConfirm` del modal llama a `exportarJornadas({ jornadas: jornadasFiltradas, snapshots: settings, filtro: filtroTemporal })`, (5) pasar `periodo` legible (usando `describirPeriodo` o `formatearIndicadorPeriodo`).     | `impl-svelte` | 45 min   | AC-01, AC-03, AC-21 |
| T3.3 | Deshabilitar botón "Exportar" cuando no hay jornadas cerradas en el filtro activo (AC-23). Añadir `$derived` que compute `hayCerradas = jornadasFiltradas.some(j => j.status === 'closed')`. Botón: `disabled={!hayCerradas}` con estilo `disabled:opacity-50 disabled:cursor-not-allowed`.                                                                                                                                                              | `impl-svelte` | 20 min   | AC-23               |
| T3.4 | Eliminar el aviso placeholder "Exportación próximamente disponible" y el estado `mostrarAvisoExport` de `+page.svelte`.                                                                                                                                                                                                                                                                                                                                  | `impl-svelte` | 5 min    | —                   |

**Ficheros afectados:**

- `src/lib/components/ExportConfirmModal.svelte` (NUEVO)
- `src/routes/historial/+page.svelte` (MODIFICAR)

**Decisiones de diseño:**

- El modal se renderiza condicionalmente con `{#if mostrarModal}` en la página.
- `onConfirm` es async (la exportación es `Promise<void>`). El botón "Exportar" del modal muestra estado "Exportando..." mientras se genera.
- El texto del periodo se deriva de `filtroTemporal` usando una función `describirPeriodo` (T2.3) o reutilizando `formatearIndicadorPeriodo` si encaja.

---

### Fase 4 — Backend GAS / Offline / PWA

**Objetivo:** Verificar impacto en bundle y compatibilidad PWA.

| #    | Tarea                                                                                                                                                                                                                                                  | Asignado   | Esfuerzo | ACs   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | ----- |
| T4.1 | Verificar que `write-excel-file` no entra en el bundle inicial. Ejecutar `npm run build && npm run size`. El chunk de exportación debe ser lazy (solo se carga al pulsar Exportar). Si el entry o total superan el presupuesto, investigar y resolver. | `impl-pwa` | 30 min   | AC-24 |
| T4.2 | Verificar que el Service Worker no intenta precachear el chunk de `write-excel-file` (es demasiado grande para precache). Revisar `globPatterns` en `vite.config.ts` si es necesario.                                                                  | `impl-pwa` | 20 min   | —     |
| T4.3 | Verificar que la descarga del XLSX funciona offline (IndexedDB ya tiene los datos; la generación es 100% client-side).                                                                                                                                 | `impl-pwa` | 15 min   | AC-21 |

**Ficheros afectados:**

- `vite.config.ts` (posiblemente MODIFICAR — ajustar PWA config si necesario)
- No se toca backend GAS (esta feature es 100% client-side).

---

### Fase 5 — Tests

**Objetivo:** Cobertura de ACs con tests unitarios y de componente.

| #    | Tarea                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Asignado | Esfuerzo | ACs                        |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | -------------------------- |
| T5.1 | Tests unitarios de `excel-wrapper.ts`: crear workbook, escribir cabecera/filas/resumen, verificar estructura interna. Mock de `write-excel-file` para `guardarFichero`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `tester` | 1h       | AC-05, AC-07, AC-18        |
| T5.2 | Tests unitarios de `export-agrupacion.ts`: agrupar por semana con `primerDiaSemana=1` (lunes) y `primerDiaSemana=0` (domingo), semanas que cruzan mes/año.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `tester` | 45 min   | AC-16                      |
| T5.3 | Tests unitarios de `historial-export.ts`: (a) solo cerradas se exportan, (b) orden ascendente, (c) 5 columnas sin contrato, (d) 6 columnas con contrato, (e) 7 columnas con contrato + export mes/año (Total semana), (f) Total día en última fila del día como celda NUMÉRICA, (g) Balance diario correcto como celda NUMÉRICA, (h) duración en formato hh:mm (ej. "04:42" no "4.7"), (i) formato condicional Balance diario: rojo si < 0, verde si >= 0, (j) columna Total semana: solo en última fila de semana, fondo verde/rojo pastel, negrita, 4pt mayor, (k) fila TOTAL al final: negrita, fuente grande, borde superior grueso, (l) Fecha solo en primera jornada de días con múltiples jornadas, (m) nombre fichero patrón, (n) sin datos → no genera. | `tester` | 2h 30min | AC-05 a AC-23              |
| T5.4 | Tests de componente `ExportConfirmModal.svelte`: (a) renderiza con texto correcto, (b) Cancelar llama `onCancel`, (c) Exportar llama `onConfirm`, (d) cierre con Escape, (e) accesibilidad (aria attributes).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `tester` | 1h       | AC-01, AC-02, AC-03, AC-04 |
| T5.5 | Test de integración en `historial/+page.svelte`: botón deshabilitado sin jornadas cerradas, botón habilitado con jornadas, click abre modal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `tester` | 45 min   | AC-23                      |
| T5.6 | Ejecutar `npm run quality` completo y resolver cualquier issue (lint, check, depcruise, knip, dup, secrets, build, size).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `tester` | 30 min   | AC-24                      |

**Ficheros de test:**

- `src/lib/utils/excel-wrapper.test.ts` (NUEVO)
- `src/lib/utils/export-agrupacion.test.ts` (NUEVO)
- `src/lib/utils/historial-export.test.ts` (NUEVO)
- `src/lib/components/ExportConfirmModal.test.svelte.ts` (NUEVO)
- `src/routes/historial/page.test.ts` (MODIFICAR — añadir tests de export)

---

## Riesgos técnicos

| #   | Riesgo                                                                                                                                                                                                                        | Probabilidad | Impacto | Mitigación                                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **Bundle size**: `write-excel-file` (~36 KB gzip) podría disparar el presupuesto si no se carga lazy. El presupuesto total es 300 KB gzip.                                                                                    | Media        | Alto    | Import dinámico (`await import`) dentro de `guardarFichero()`. Verificar con `npm run size` en T2.6 y T4.1. Si supera, evaluar carga en Web Worker.                                                                                          |
| R2  | **`write-excel-file` API declarativa**: la librería usa un formato de celda declarativo (`{ value, type, fontWeight, ... }`). Si el wrapper no mapea bien los estilos, la fila de resumen podría no distinguirse visualmente. | Baja         | Medio   | Prototipar un XLSX de prueba en T2.1 con los estilos de cabecera y resumen. Validar abriendo en Excel/LibreOffice.                                                                                                                           |
| R3  | **`historial-export.ts` supera 120 líneas**: la lógica de generación (sub-periodos, columnas condicionales, múltiples jornadas por día) es compleja.                                                                          | Alta         | Medio   | Extraer helpers internos: `construirFilasDia()`, `construirResumenSubPeriodo()`, `determinarColumnas()`. Si aun así supera 150 líneas, dividir en `historial-export.ts` (orquestador) + `historial-export-filas.ts` (constructores de fila). |
| R4  | **`export-agrupacion.ts` y semanas que cruzan mes/año**: una semana puede empezar en un mes y terminar en otro. La clave de agrupación debe ser inequívoca.                                                                   | Baja         | Bajo    | Usar la fecha de inicio de semana como clave (`YYYY-MM-DD`). La semana se atribuye al mes de su día de inicio (consistente con `inicioSemana`).                                                                                              |
| R5  | **Modal accesible con `<dialog>` nativo**: el elemento `<dialog>` tiene buen soporte pero algunas combinaciones de screen readers tienen issues con `showModal()`.                                                            | Baja         | Medio   | Fallback: si `<dialog>` da problemas, usar `div` con `role="dialog"` + focus trap manual. Verificar con `npm run check` (svelte-check detecta problemas de a11y).                                                                            |
| R6  | **`formatearHorasDecimal` no encaja para el XLSX**: la función existente retorna `"8h 30m"` pero el XLSX necesita `"08:30"` (hh:mm).                                                                                          | Alta         | Bajo    | Crear helper interno `formatearHHMM(minutos: number): string` en `historial-export.ts` que convierte minutos a formato hh:mm con cero a la izquierda (282 → "04:42"). No modificar `formatearHorasDecimal` existente.                        |
| R7  | **Dependency-cruiser**: `excel-wrapper.ts` importa dinámicamente `write-excel-file` (paquete externo). Depcruise podría marcarlo si hay reglas restrictivas sobre `node_modules`.                                             | Baja         | Bajo    | Verificar con `npm run depcruise`. Si rompe, añadir excepción en `.dependency-cruiser.cjs` para `write-excel-file`.                                                                                                                          |

## Orden de ejecución

```
Fase 1 (tipos)  ──►  Fase 2 (lógica)  ──►  Fase 3 (UI)  ──►  Fase 4 (PWA)  ──►  Fase 5 (tests)
    T1.1-T1.3         T2.1-T2.6           T3.1-T3.4         T4.1-T4.3         T5.1-T5.6
```

- **Fase 1 y 2** pueden solaparse parcialmente (T1.1 + T2.1 en paralelo con T1.2 + T2.3).
- **Fase 3** depende de que `exportarJornadas` y `describirPeriodo` estén implementadas (Fase 2).
- **Fase 4** puede empezar tras la instalación de `write-excel-file` (T2.6).
- **Fase 5** empieza tras Fase 3, pero T5.1 y T5.2 pueden empezar tras Fase 2.

## Estimación total

| Fase            | Esfuerzo  |
| --------------- | --------- |
| Fase 1 — Tipos  | ~35 min   |
| Fase 2 — Lógica | ~6h 30min |
| Fase 3 — UI     | ~2h 40min |
| Fase 4 — PWA    | ~1h 5min  |
| Fase 5 — Tests  | ~6h 40min |
| **Total**       | **~17h**  |

## Notas para implementadores

1. **`impl-svelte`**: Fases 1, 2 y 3 son tu responsabilidad principal. El wrapper (`excel-wrapper.ts`) es el módulo más delicado: prototipa pronto con datos reales.
2. **`impl-ui`**: El modal (`ExportConfirmModal.svelte`) debe seguir el dark mode del proyecto (`bg-surface`, `text-text`, `border-border`). Revisa componentes existentes como referencia.
3. **`impl-pwa`**: Tu foco es T2.6 (instalar librería) y Fase 4 (verificar bundle y SW). No tocas lógica de negocio.
4. **`tester`**: Los tests de `historial-export.ts` (T5.3) son los más críticos. Usa `fake-indexeddb/auto` si necesitas Dexie en tests. Mockea `write-excel-file` en tests del wrapper.
5. **Commit por fase**: cada fase = un commit convencional (`feat:`, `test:`). El VCS creará la rama `feat/007-exportacion-xlsx` desde `main`.

## Notas de validación (architect)

**Veredicto:** APPROVED
**Validado:** 2026-06-27

### Cambios aplicados durante la validación

1. **T2.1** — Actualizado import de `write-excel-file` a API v4: `'write-excel-file/browser'` + `.toFile(nombre)` (en vez de sintaxis v3 con `{ fileName }`)
2. **T3.1** — Especificado `$props()` para el modal en Svelte 5: `let { periodo, onConfirm, onCancel } = $props()`

### Sin issues bloqueantes

- ✅ Todas las dependencias de utils verificadas contra sus firmas reales
- ✅ `write-excel-file` v4.1.1 incluye tipos TypeScript (`index.d.ts`)
- ✅ El patrón wrapper aísla completamente la librería
