# 007 - Exportación de datos a XLSX

**Status:** done
**Creada:** 2026-06-27
**Autor:** sistema
**Depende de:** [003.7](./003.7-mejoras-historial.md)

## Resumen

Implementar la exportación real de jornadas a fichero XLSX desde la página de Historial. El botón "Exportar" ya existe (spec 003.7, placeholder). Esta spec conecta el botón con la generación real del fichero: muestra un diálogo de confirmación, genera un XLSX con las jornadas **cerradas** filtradas ordenadas cronológicamente, con una **fila de título** en la primera fila del XLSX (antes de la cabecera) describiendo el periodo del informe, soporte para múltiples jornadas por día (columna "Total día" numérica), duración en formato hh:mm, balance diario numérico con formato condicional (colores), columnas de total y balance del periodo (Total Semana/Mes y Balance Semana/Mes) en la última fila de cada periodo, separador entre periodos mediante borde inferior de 2pt sólido negro aplicado directamente sobre la última fila de datos de cada periodo (sin fila separadora adicional), fila "TOTAL" al final del periodo con sumatorios en todas las columnas numéricas, y descarga el fichero con un nombre basado en la fecha y hora de exportación.

## Contexto

La spec 003.7 añadió el botón "Exportar" en `/historial` con un placeholder (`exportarJornadas` vacío en `historial-export.ts`). Esta feature completa ese hueco.

El usuario tiene configurado `horas_semanales` y `dias_laborables` en settings, que se usan para calcular el balance de horas (realizadas vs obligatorias) usando `calcularBalancePeriodo` existente. Tanto la columna "Balance diario" como las columnas de total y balance del periodo (Total Semana/Mes y Balance Semana/Mes) solo se calculan y muestran cuando `horas_semanales > 0` Y `dias_laborables > 0`. Si cualquiera de los dos es 0, no se muestran estas columnas (excepto "Total Semana/Mes" en mes/año que sí se muestra sin balance).

## Decisiones de UX (cerradas)

- **Formato XLSX:** fichero Excel nativo (.xlsx). Aunque es más pesado que CSV, el usuario lo ha solicitado explícitamente por compatibilidad con Excel/LibreOffice.
- **Diálogo de confirmación:** antes de descargar se muestra un modal con el texto "¿Vas a exportar los datos del [periodo]? ¿Estás seguro?" y botones Confirmar/Cancelar.
- **Orden cronológico ascendente:** jornadas de menor a mayor fecha (antiguas primero), a diferencia de la UI que muestra las más recientes arriba.
- **Solo jornadas cerradas:** las jornadas abiertas (`status='open'`) se excluyen de la exportación. Solo se exportan jornadas con `status='closed'`.
- **Múltiples jornadas por día:** si un día tiene más de una jornada cerrada, cada una ocupa su propia fila en el XLSX.
- **Agrupación visual por día:** cuando un día tiene múltiples jornadas, la fecha solo se muestra en la primera fila; las filas siguientes del mismo día dejan la celda de fecha vacía. Esto hace visualmente más claro que las jornadas pertenecen al mismo día.
- **Formato de duración hh:mm:** la duración se muestra en formato horas:minutos (ej. "04:42" para 4 horas 42 minutos), no en decimal. Las horas y minutos siempre con dos dígitos.
- **Formato de fecha y hora:** fecha en formato DD/MM/YYYY, hora en formato HH:MM (24 horas).
- **Columna "Total día" siempre presente:** la quinta columna del XLSX es siempre "Total día". Muestra la suma de duraciones de todas las jornadas de ese día en la **última fila** del día; el resto de filas del día muestran la celda vacía. Si el día tiene una sola jornada, "Total día" coincide con "Duración". Es una **celda numérica** (valor en horas decimales con formato de celda Excel) para permitir operaciones en Excel.
- **Balance condicional:** el balance de horas (realizadas vs obligatorias) solo se calcula y muestra cuando `horas_semanales > 0` Y `dias_laborables > 0` en settings. Si `horas_semanales = 0` O `dias_laborables = 0`, no se muestra ninguna columna de balance ni columna de total/balance del periodo. No existe el concepto de "N/A" para el balance: o se calcula, o no aparece.
- **Columna "Balance diario" condicional:** solo aparece cuando `horas_semanales > 0` Y `dias_laborables > 0`. Muestra la diferencia entre el total trabajado del día y el objetivo diario (`horas_semanales / dias_laborables`). Solo se rellena en la última fila de cada día; el resto de filas muestran la celda vacía. Es una **celda numérica** (valor en horas decimales con formato de celda Excel) con formato condicional: **negrita**, **rojo** si el valor es negativo, **verde** si es positivo o cero. Si falta cualquiera de los dos valores, no hay columna "Balance diario".
- **Columna "Total Semana/Mes" condicional (col. 7):** solo aparece cuando el periodo de exportación es **mes** o **año**. Muestra el total de horas trabajadas del sub-periodo (semana para exportación mensual, mes para exportación anual) **solo en la última fila de datos de cada periodo**; el resto de filas muestran la celda vacía. Formato: fuente **negrita**, tamaño **4pt mayor** que la fuente normal. **Sin color de fondo condicional** (siempre positivo o cero, sin fondo). El inicio de semana se determina por `primer_dia_semana` de la configuración.
- **Columna "Balance Semana/Mes" condicional (col. 8):** solo aparece cuando `horas_semanales > 0` Y `dias_laborables > 0` Y el periodo de exportación es **mes** o **año**. Se sitúa junto a "Total Semana/Mes". Muestra el balance del sub-periodo (suma de balances diarios del periodo). Solo se rellena en la **última fila de datos** de cada periodo; el resto de filas muestran la celda vacía. Es una **celda numérica** con formato condicional: **negrita**, tamaño **4pt mayor** que la fuente normal, fondo **verde pastel (#bbf7d0)** si el valor es >= 0, **rojo pastel (#fecaca)** si es < 0.
- **Separador entre periodos:** la **última fila de datos de cada periodo** (la fila que contiene los valores de Total Semana/Mes y Balance Semana/Mes) tiene un **borde inferior de 2pt, línea sólida negra**. No hay fila separadora adicional ni fila vacía entre periodos; el separador visual es únicamente el borde aplicado sobre la última fila de datos.
- **Fila TOTAL al final:** al finalizar todas las jornadas del periodo exportado, se añade una única fila "TOTAL" debajo de la última jornada. Esta fila muestra los sumatorios de todas las columnas numéricas: col. 5 (Total día) = suma de todas las horas trabajadas, col. 6 (Balance diario) = suma de todos los balances diarios, col. 7 (Total Semana/Mes) = suma de todos los totales de periodo, col. 8 (Balance Semana/Mes) = suma de todos los balances de periodo. Formato visualmente prominente: **negrita**, fuente mayor, borde superior grueso.
- **Inicio de semana configurable:** la agrupación por semanas usa `primer_dia_semana` de la configuración del usuario, de forma consistente con `filtrarPorPeriodo` y `PeriodoNavegacion`.
- **Fila de título descriptivo:** la primera fila del XLSX (fila 1) contiene un título descriptivo del informe, antes de la fila de cabecera. El título varía según el tipo de exportación:
  - **Año:** "Informe anual - 2026" (o el año de la consulta).
  - **Mes:** "Informe mensual - mayo 2026" (o el mes/año de la consulta).
  - **Semana:** "Informe personalizado - Semana 25 de abril 2026".
  - **Fecha concreta:** "Informe personalizado - 5 de junio de 2026".
  - **Rango:** "Informe personalizado - 1 al 15 de junio de 2026".
    El título se escribe fusionado (merged) en todas las columnas (A hasta la última columna del informe), en negrita, fuente mayor (16pt), centrado, con altura de fila ligeramente mayor que la normal.
- **Wrapper sobre la librería XLSX:** se crea un módulo wrapper (`excel-wrapper.ts`) que abstrae `write-excel-file`. `historial-export.ts` solo importa del wrapper, nunca directamente de la librería, permitiendo cambiarla en el futuro sin tocar la lógica de negocio.
- **Todos los filtros compatibles:** se puede exportar desde cualquier filtro activo (periodo, fecha concreta, rango personalizado).
- **Confirmación de colores:** los colores rojo pastel (<0) y verde pastel (>=0) se aplican según el valor numérico de la celda en "Balance diario" y "Balance Semana/Mes". La columna "Total Semana/Mes" **no** tiene color condicional (siempre positivo o cero, sin fondo).

## Historias de usuario

- Como usuario, quiero pulsar "Exportar" y que se me pida confirmación antes de descargar, para evitar descargas accidentales.
- Como usuario, quiero un fichero XLSX con mis jornadas cerradas ordenadas de menor a mayor fecha, para poder revisarlo en Excel.
- Como usuario, quiero que el nombre del fichero incluya la fecha y hora de exportación, para organizar mis exportaciones.
- Como usuario, quiero ver la duración en formato hh:mm (ej. "04:42"), para una lectura más natural que el decimal.
- Como usuario, quiero ver el balance diario como celda numérica con colores (rojo/verde), para poder usar el formato condicional de Excel.
- Como usuario con múltiples fichajes al día, quiero ver cada jornada en su propia fila con un total diario, para distinguir las distintas sesiones de trabajo.
- Como usuario con jornada configurada, quiero ver el balance diario (horas trabajadas vs objetivo diario), para saber si cumplo mi jornada cada día.
- Como usuario con jornada configurada, quiero ver el total y balance del periodo (semanal para exportación mensual, mensual para exportación anual) en columnas dedicadas, para controlar mis horas por periodo.
- Como usuario, quiero ver una fila TOTAL al final del fichero con los sumatorios del periodo, para tener un resumen global.
- Como usuario, quiero ver un título descriptivo en la primera fila del XLSX que identifique el periodo del informe, para saber de un vistazo qué datos contiene el fichero.

## Criterios de aceptación

### Diálogo de confirmación

- [ ] AC-01: Al pulsar "Exportar" se muestra un modal/dialog de confirmación con el texto "¿Vas a exportar los datos del [periodo]? ¿Estás seguro?".
- [ ] AC-02: El [periodo] se describe de forma legible: "semana del 23 al 29 de junio de 2026", "mes de mayo de 2026", "año 2026", o "rango del 1 al 15 de junio de 2026".
- [ ] AC-03: El modal tiene dos botones: "Cancelar" (cierra sin exportar) y "Exportar" (genera y descarga el fichero).
- [ ] AC-04: El modal es accesible: foco atrapado, cierre con Escape, `aria-labelledby` con el mensaje.

### Generación del XLSX

- [ ] AC-05: El fichero generado es un `.xlsx` válido, abierto correctamente por Excel y LibreOffice. La primera fila del XLSX contiene un título descriptivo del informe (ver AC-05a).
- [ ] AC-05a: La **fila 1** del XLSX contiene un título descriptivo fusionado (merged) en todas las columnas (A hasta la última columna del informe). El título depende del tipo de exportación:
  - **Año:** "Informe anual - {año}" (ej. "Informe anual - 2026").
  - **Mes:** "Informe mensual - {mes} {año}" (ej. "Informe mensual - mayo 2026").
  - **Semana:** "Informe personalizado - Semana {N} de {mes} {año}" (ej. "Informe personalizado - Semana 25 de abril 2026").
  - **Fecha concreta:** "Informe personalizado - {día} de {mes} {año}" (ej. "Informe personalizado - 5 de junio de 2026").
  - **Rango:** "Informe personalizado - {día_inicio} al {día_fin} de {mes} {año}" (ej. "Informe personalizado - 1 al 15 de junio de 2026").
    Formato del título: **negrita**, fuente mayor (**16pt**), **centrado**, altura de fila ligeramente mayor que la normal. La fila de cabecera de columnas se desplaza a la fila 2.
- [ ] AC-06: Las jornadas aparecen ordenadas por `start_time` ascendente (de menor a mayor fecha).
- [ ] AC-07: Columnas del fichero según configuración y periodo:
  - **Sin contrato** (`horas_semanales = 0` O `dias_laborables = 0`): **5 columnas** — Fecha (DD/MM/YYYY), Entrada (HH:MM, 24h), Salida (HH:MM, 24h), Duración (formato hh:mm), Total día (celda numérica).
  - **Con contrato** (semana/rango): **6 columnas** — las 5 anteriores + Balance diario (celda numérica con formato condicional: negrita, rojo si < 0, verde si >= 0).
  - **Con contrato** (mes): **8 columnas** — las 6 anteriores + Total Semana/Mes (col. 7, numérica, negrita, 4pt mayor, sin color condicional) + Balance Semana/Mes (col. 8, numérica, negrita, 4pt mayor, fondo verde pastel si >= 0, rojo pastel si < 0).
  - **Con contrato** (año): **8 columnas** — las 6 anteriores + Total Semana/Mes (col. 7, numérica, negrita, 4pt mayor, sin color condicional) + Balance Semana/Mes (col. 8, numérica, negrita, 4pt mayor, fondo verde pastel si >= 0, rojo pastel si < 0).
- [ ] AC-08: Solo se exportan las jornadas cerradas (`status='closed'`). Las jornadas abiertas (`status='open'`) se excluyen de la exportación.
- [ ] AC-09: La duración mostrada es la **duración efectiva** (con redondeo aplicado según configuración), usando `duracionEfectivaMinutos`, convertida a formato hh:mm (horas:minutos, dos dígitos cada uno, ej. "04:42" para 4h 42min).
- [ ] AC-10: El formato de duración es hh:mm. La fecha es DD/MM/YYYY. La hora de entrada/salida es HH:MM en formato 24h.

### Múltiples jornadas por día y columna Total día

- [ ] AC-11: Si un día tiene más de una jornada cerrada, cada jornada ocupa su propia fila en el XLSX (misma fecha, distinta entrada/salida/duración). Si un día tiene más de una jornada, la fecha solo aparece en la primera fila; las filas siguientes del mismo día tienen la celda de fecha vacía.
- [ ] AC-12: La columna "Total día" muestra la suma de duraciones de todas las jornadas de ese día, pero solo en la **última fila** del día. El resto de filas del día muestran la celda vacía en esta columna. Si el día tiene una sola jornada, "Total día" coincide con "Duración". Es una **celda numérica** (valor en horas decimales con formato de celda hh:mm de Excel) para permitir operaciones y formato condicional en Excel.

### Columna Balance diario

- [ ] AC-13: La columna "Balance diario" (6ª columna) solo se incluye en el XLSX cuando `horas_semanales > 0` Y `dias_laborables > 0` en la configuración. En cualquier otro caso, la columna no existe (el XLSX tiene 5 columnas, no 6). Si además el periodo es mes o año, se añaden las columnas 7 (Total Semana/Mes) y 8 (Balance Semana/Mes) (ver AC-15, AC-16).
- [ ] AC-14: El "Balance diario" muestra la diferencia entre el total trabajado del día (suma de todas sus jornadas) y el objetivo diario (`horas_semanales / dias_laborables`). Solo se rellena en la **última fila** de cada día; el resto de filas del día muestran la celda vacía. Es una **celda numérica** (valor en horas decimales con formato de celda Excel) con formato condicional aplicado: **negrita**, **color rojo** si el valor es negativo, **color verde** si es positivo o cero.

### Columnas Total Semana/Mes, Balance Semana/Mes y fila TOTAL

- [ ] AC-15: Si el periodo es **año** Y `horas_semanales > 0` Y `dias_laborables > 0`, se añaden dos columnas: **"Total Semana/Mes"** (7ª columna) y **"Balance Semana/Mes"** (8ª columna). El informe anual se separa por **meses** (no por semanas). "Total Semana/Mes" muestra el total de horas trabajadas del mes **solo en la última fila de datos de cada mes**; el resto de filas muestran la celda vacía. Formato: **negrita**, **4pt mayor** que la fuente normal, **sin color de fondo condicional** (siempre positivo o cero). "Balance Semana/Mes" muestra la suma de balances diarios del mes en la última fila de datos de cada mes, con **negrita**, **4pt mayor**, fondo **verde pastel (#bbf7d0)** si >= 0, **rojo pastel (#fecaca)** si < 0. La última fila de datos de cada mes tiene un **borde inferior de 2pt sólido negro** como separador visual entre meses (sin fila separadora adicional). Se añade una única fila **"TOTAL"** al final de todas las jornadas del año con sumatorios en las columnas 5 (Total día), 6 (Balance diario), 7 (Total Semana/Mes) y 8 (Balance Semana/Mes). Formato TOTAL: **negrita**, fuente mayor, borde superior grueso.
- [ ] AC-16: Si el periodo es **mes** Y `horas_semanales > 0` Y `dias_laborables > 0`, se añaden dos columnas: **"Total Semana/Mes"** (7ª columna) y **"Balance Semana/Mes"** (8ª columna). El informe mensual se separa por **semanas**. "Total Semana/Mes" muestra el total de horas trabajadas de la semana **solo en la última fila de datos de cada semana**; el resto de filas muestran la celda vacía. Formato: **negrita**, **4pt mayor** que la fuente normal, **sin color de fondo condicional** (siempre positivo o cero). "Balance Semana/Mes" muestra la suma de balances diarios de la semana en la última fila de datos de cada semana, con **negrita**, **4pt mayor**, fondo **verde pastel (#bbf7d0)** si >= 0, **rojo pastel (#fecaca)** si < 0. El inicio de semana se determina por `primer_dia_semana` de la configuración. La última fila de datos de cada semana tiene un **borde inferior de 2pt sólido negro** como separador visual entre semanas (sin fila separadora adicional). Se añade una única fila **"TOTAL"** al final con los sumatorios en las columnas 5, 6, 7 y 8.
- [ ] AC-17: Si el periodo es **semana** o un filtro no periodizado (fecha/rango), no se generan columnas de total ni balance del periodo (no aplica al ser un solo periodo). La fila "TOTAL" final muestra los sumatorios en las columnas numéricas presentes: col. 5 (Total día) = suma de todas las horas trabajadas, col. 6 (Balance diario, si existe) = suma de todos los balances diarios. Formato: **negrita**, fuente mayor, borde superior grueso.
- [ ] AC-18: La **última fila de datos de cada periodo** (la fila que contiene los valores de Total Semana/Mes y Balance Semana/Mes) tiene un **borde inferior de 2pt, línea sólida negra**. No hay fila separadora adicional ni fila vacía entre periodos; el separador visual es únicamente el borde aplicado sobre la última fila de datos. La fila "TOTAL" final se distingue visualmente con un borde superior grueso, fuente en negrita y tamaño mayor que el resto de filas.
- [ ] AC-19: Si `horas_semanales = 0` O `dias_laborables = 0` (sin contrato completo configurado), no se calcula ni muestra ningún balance: ni columna "Balance diario" (que no existe), ni columna "Balance Semana/Mes" (que no existe). Para exportación mes/año sin contrato, la columna "Total Semana/Mes" **sí** se muestra (7 columnas). La fila "TOTAL" muestra solo el total de horas trabajadas del periodo.

### Nombre del fichero

- [ ] AC-20: El nombre del fichero sigue el patrón `jornadas_YYYYMMDDHHmmss.xlsx`, donde el timestamp corresponde a la fecha y hora actual en el momento de triggerar la exportación (ej. `jornadas_20260627143025.xlsx`).

### Descarga

- [ ] AC-21: El fichero se descarga automáticamente al navegador (no se abre en nueva pestaña).
- [ ] AC-22: El nombre del fichero descargado coincide con el patrón `jornadas_YYYYMMDDHHmmss.xlsx`.

### Estado vacío

- [ ] AC-23: Si no hay jornadas cerradas en el filtro activo, el botón "Exportar" está deshabilitado o muestra un aviso "No hay datos para exportar".

### Calidad

- [ ] AC-24: `npm run check` y `npm run build` sin errores.
- [ ] AC-25: Tests unitarios para la generación del XLSX (fila de título con texto descriptivo correcto según tipo de exportación, columnas, orden, formato hh:mm, fila TOTAL con sumatorios en todas las columnas numéricas, nombre de fichero, total día numérico, balance diario numérico con colores, Total Semana/Mes sin color condicional, Balance Semana/Mes con color condicional, borde inferior 2pt en última fila de datos de cada periodo).
- [ ] AC-26: Tests del diálogo de confirmación (aparece, cancelar cierra, confirmar exporta).

## Edge cases

- **Periodo sin jornadas cerradas:** botón deshabilitado o aviso.
- **Sin configuración de contrato** (`horas_semanales = 0` O `dias_laborables = 0`): no se muestra balance en ningún sitio (ni columna "Balance diario", ni columna "Balance Semana/Mes"). La fila TOTAL muestra solo el total de horas. En exportación mes/año, la columna "Total Semana/Mes" sí se muestra (7 columnas).
- **Múltiples jornadas en un día:** cada jornada en su fila, fecha solo en la primera fila del día, "Total día" solo en la última fila del día.
- **Día con una sola jornada:** "Total día" coincide con "Duración".
- **Filtro rango muy amplio** (años): rendimiento acceptable (IndexedDB ya carga todo; el XLSX se genera en memoria).
- **Navegador sin soporte File System Access API:** se usa `URL.createObjectURL` + `<a download>` como fallback universal (gestionado por `write-excel-file` internamente).

## Fuera de scope

- **Exportación a CSV/JSON/PDF** — solo XLSX.
- **Exportación automática** (al cerrar el mes, etc.).
- **Exportación de un solo día** — se cubre con filtro fecha concreta.
- **Personalización de columnas** — columnas fijas definidas arriba.
- **Exportación del dashboard/estadísticas** — solo historial de jornadas.
- **Sincronización con backend** (spec 004).
- **Periodo "trimestre"** — los periodos soportados son: semana, mes, año, fecha concreta, rango personalizado. El trimestre no está contemplado.

## Notas técnicas

### Librería XLSX

El proyecto no tiene actualmente una librería para generar XLSX. Opciones (tamaños reales medidos en bundlephobia, no estimaciones):

| Librería           | Tamaño (gzip) | Deps | Estilos celda   | Tree-shakeable | Notas                                                            |
| ------------------ | ------------- | ---- | --------------- | -------------- | ---------------------------------------------------------------- |
| `exceljs`          | ~250 KB       | 9    | ✅ Sí           | parcial        | Más completa, pero **se come el 83 % del presupuesto de bundle** |
| `xlsx` (SheetJS)   | ~140 KB       | 7    | ❌ Solo Pro     | ❌ No          | Estándar de facto; Community **no soporta estilos**; CVEs en npm |
| `write-excel-file` | **~36 KB**    | 4    | ✅ Sí (básicos) | ✅ Sí          | Solo-escritura (nuestro caso), API declarativa, la más ligera    |

**Recomendación:** `write-excel-file`. Es ~4× más ligera que SheetJS y ~7× más que exceljs, soporta los estilos pedidos (negrita, fondo, bordes) que SheetJS Community **no** ofrece, es tree-shakeable (`sideEffects:false`) y solo-escritura (justo lo que necesitamos). Se instala como `dependencies` (no dev).

> ⚠️ **Impacto bundle:** el presupuesto real es **300 KB gzip de JS total de cliente** (`size-limit` → `_app/immutable/**/*.js` en `package.json`). Incluso con `write-excel-file` (~36 KB) el módulo **debe cargarse con import dinámico** (`await import('write-excel-file')`) dentro del wrapper, para que no entre en el bundle inicial ni dispare el límite de `size-limit`. Verificar con `npm run size` tras instalar. Las cifras de las alternativas (`xlsx` ~140 KB, `exceljs` ~250 KB) harían inviable incluso el lazy-load para una PWA offline.

### Wrapper sobre la librería (`excel-wrapper.ts`)

Se crea un módulo wrapper en `src/lib/utils/excel-wrapper.ts` que abstrae `write-excel-file`. `historial-export.ts` solo importa de este wrapper, nunca directamente de la librería. Esto permite cambiar la librería subyacente sin modificar la lógica de generación del XLSX.

Funciones del wrapper:

```typescript
// src/lib/utils/excel-wrapper.ts

export interface Workbook {
	// estado interno: filas acumuladas, definiciones de columna, nombre de hoja
}

export function crearWorkbook(): Workbook;

export function escribirTitulo(workbook: Workbook, titulo: string, numColumnas: number): void;

export function escribirCabecera(workbook: Workbook, columnas: string[]): void;

export function escribirFila(workbook: Workbook, datos: Array<string | number | null>): void;

export function escribirFilaTotal(workbook: Workbook, total: number): void;

export function escribirSeparador(workbook: Workbook): void;

export async function guardarFichero(workbook: Workbook, nombre: string): Promise<void>;
```

- `crearWorkbook()` inicializa el estado interno (array de filas, columnas, nombre de hoja).
- `escribirTitulo()` añade la fila 1 con el título descriptivo del informe. Fusiona (merged) las celdas desde la columna A hasta la columna número `numColumnas`. Aplica estilo: negrita, fuente 16pt, centrado, altura de fila ligeramente mayor.
- `escribirCabecera()` añade la fila de cabecera (fila 2) con estilo (negrita, fondo).
- `escribirFila()` añade una fila de datos normal.
- `escribirFilaTotal()` añade la fila "TOTAL" final con estilo prominente (negrita, fuente mayor, borde superior grueso) y los sumatorios de todas las columnas numéricas.
- `escribirSeparador()` aplica un borde inferior de 2pt, línea sólida negra, a la **última fila de datos del periodo** (no inserta fila vacía adicional).
- `guardarFichero()` dispara la descarga del fichero. Internamente hace `await import('write-excel-file')` (import dinámico) y llama a la librería con las filas acumuladas.

### Estructura de archivos

```
src/
├── lib/
│   ├── components/
│   │   ├── ExportConfirmModal.svelte   # NUEVO: diálogo de confirmación
│   └── utils/
│       ├── excel-wrapper.ts            # NUEVO: wrapper sobre write-excel-file
│       ├── historial-export.ts         # MODIFICAR: generar XLSX real (usa excel-wrapper)
│       └── export-agrupacion.ts        # NUEVO: agruparPorSemana y helpers de agrupación
└── routes/
    └── historial/
        └── +page.svelte                # MODIFICAR: conectar modal + export real
```

### Función principal (`historial-export.ts`)

```typescript
import type { Jornada, Settings } from '$lib/db';
import type { FiltroTemporal } from '$lib/utils/historial-filtros';

export interface ExportOptions {
	jornadas: Jornada[];
	snapshots: Settings[];
	filtro: FiltroTemporal; // unión discriminada: periodo+fechaReferencia | fecha | rango
}

export function exportarJornadas(options: ExportOptions): Promise<void>;
```

A partir de `filtro` se deriva todo lo que necesita la generación: el sub-periodo de los resúmenes (`filtro.tipo === 'periodo'` → `filtro.periodo` decide año→mes / mes→semana, con `filtro.fechaReferencia`) y el texto legible del periodo para el modal (AC-02). El nombre del fichero (timestamp) se genera dentro del wrapper, no se pasa como opción.

`historial-export.ts` usa exclusivamente las funciones de `excel-wrapper.ts`. No importa `write-excel-file` directamente.

### Generación del XLSX

1. **Filtrado:** solo jornadas con `status='closed'`. Las abiertas se descartan.
2. **Agrupación por día y periodo:** las jornadas se agrupan por fecha para calcular "Total día" y "Balance diario". Para periodos mes o año, se aplica además agrupación por periodo: `agruparPorSemana` (de `export-agrupacion.ts`) para exportación mensual (determina límites de semana usando `primer_dia_semana`), o agrupación por mes natural para exportación anual.
3. **Determinar columnas:**
   - Sin contrato (5 columnas): Fecha | Entrada | Salida | Duración | Total día
   - Con contrato, semana/rango (6 columnas): + Balance diario
   - Con contrato, mes (8 columnas): + Balance diario | Total Semana/Mes | Balance Semana/Mes
   - Con contrato, año (8 columnas): + Balance diario | Total Semana/Mes | Balance Semana/Mes
4. **Título (fila 1):** se escribe con `escribirTitulo()` pasando el texto descriptivo del periodo y el número de columnas. El título se fusiona (merged) en todas las columnas (A hasta la última), en negrita, 16pt, centrado, altura de fila ligeramente mayor. El texto del título depende del tipo de exportación: "Informe anual - {año}", "Informe mensual - {mes} {año}", "Informe personalizado - {descripción}" (semana, fecha o rango).
5. **Cabecera (fila 2):** se escribe con `escribirCabecera()` pasando los nombres de columna según la configuración. Se sitúa en la fila 2, inmediatamente después del título.
6. **Filas de datos:** cada jornada cerrada, ordenada por `start_time` ascendente. Si un día tiene múltiples jornadas, cada una en su fila; la fecha solo se muestra en la primera fila del día, las filas siguientes dejan la celda de fecha vacía. La columna "Total día" se rellena solo en la última fila del día (celda numérica con formato hh:mm). La columna "Balance diario" (si existe) se rellena solo en la última fila del día (celda numérica, negrita, color rojo si negativo, verde si positivo/cero). La columna "Total Semana/Mes" (si existe) se rellena solo en la última fila de datos de cada periodo (negrita, 4pt mayor, sin color de fondo condicional). La columna "Balance Semana/Mes" (si existe) se rellena solo en la última fila de datos de cada periodo (negrita, 4pt mayor, fondo verde pastel si >= 0, rojo pastel si < 0). La última fila de datos de cada periodo tiene un borde inferior de 2pt, línea sólida negra (sin fila separadora adicional). El informe anual separa por meses, el informe mensual separa por semanas, el informe semanal no tiene separación (un solo periodo).
7. **Fila TOTAL final:** tras la última jornada, se añade una fila "TOTAL" con los sumatorios de todas las columnas numéricas: col. 5 (Total día) = suma de todas las horas trabajadas, col. 6 (Balance diario) = suma de todos los balances diarios, col. 7 (Total Semana/Mes) = suma de todos los totales de periodo, col. 8 (Balance Semana/Mes) = suma de todos los balances de periodo. Formato: negrita, fuente mayor, borde superior grueso.
8. **Estilo:** título en fila 1 (negrita, 16pt, centrado, merged), cabecera en fila 2 (negrita, bordes finos), bordes finos en todas las celdas de datos, borde inferior 2pt sólido negro en la última fila de datos de cada periodo (sin fila separadora adicional), fila TOTAL con borde superior grueso y fuente prominente.

#### Ejemplo exportando un mes con Balance diario, Total Semana/Mes y Balance Semana/Mes (horas_semanales = 37,5 | dias_laborables = 5 → objetivo diario = 7,5h)

```
Informe mensual - junio 2026 (negrita, 16pt, centrado, merged A-H, altura mayor)
Fecha      | Entrada | Salida | Duración | Total día | Balance diario | Total Semana/Mes | Balance Semana/Mes
──────────────────────────────────────────────────────────────────────────────────────────────────────────────
01/06/2026 | 08:00   | 12:00  | 04:00    |           |                |
           | 15:00   | 19:00  | 04:00    | 08:00     | +0,5 (verde)   |
02/06/2026 | 08:00   | 16:00  | 08:00    | 08:00     | +0,5 (verde)   |
03/06/2026 | 08:00   | 16:00  | 08:00    | 08:00     | +0,5 (verde)   |
04/06/2026 | 08:00   | 16:00  | 08:00    | 08:00     | +0,5 (verde)   |
05/06/2026 | 08:00   | 16:00  | 08:00    | 08:00     | +0,5 (verde)   | 40:00 (negrita,+4pt) | +2,5 (negrita,+4pt,fondo verde pastel)
═══════════════════════════════════════ borde inferior 2pt sólido negro (en la última fila de datos) ═══════
08/06/2026 | 08:00   | 16:00  | 08:00    | 08:00     | +0,5 (verde)   |
09/06/2026 | 08:00   | 15:00  | 07:00    | 07:00     | -0,5 (rojo)    |
10/06/2026 | 08:00   | 16:00  | 08:00    | 08:00     | +0,5 (verde)   |
11/06/2026 | 08:00   | 16:00  | 08:00    | 08:00     | +0,5 (verde)   |
12/06/2026 | 08:00   | 16:00  | 08:00    | 08:00     | +0,5 (verde)   | 40:00 (negrita,+4pt) | +2,5 (negrita,+4pt,fondo verde pastel)
═══════════════════════════════════════ borde inferior 2pt sólido negro (en la última fila de datos) ═══════
TOTAL (negrita, fuente mayor, borde superior grueso)
           |         |        |          | 80:00     | +5,0           | 80:00              | +5,0
```

Notas:

- "Total día", "Balance diario", "Total Semana/Mes" y "Balance Semana/Mes" son **celdas numéricas** (valor en horas decimales con formato de celda hh:mm de Excel).
- "Balance diario": negrita + color rojo si negativo, verde si positivo/cero.
- "Total Semana/Mes": valor numérico en la **última fila de datos** de cada periodo. Negrita, 4pt mayor que la fuente normal. **Sin color de fondo condicional** (siempre positivo o cero).
- "Balance Semana/Mes": valor numérico en la **última fila de datos** de cada periodo. Negrita, 4pt mayor. Fondo verde pastel (#bbf7d0) si >= 0, rojo pastel (#fecaca) si < 0.
- Separador entre periodos: borde inferior de 2pt sólido negro aplicado directamente sobre la última fila de datos del periodo (sin fila separadora adicional).
- Fila "TOTAL" al final con sumatorios en todas las columnas numéricas (col. 5, 6, 7, 8). Negrita, fuente mayor, borde superior grueso.

#### Ejemplo exportando un mes sin contrato (horas_semanales = 0 o dias_laborables = 0)

```
Informe mensual - junio 2026 (negrita, 16pt, centrado, merged A-E, altura mayor)
Fecha      | Entrada | Salida | Duración | Total día
───────────────────────────────────────────────────
01/06/2026 | 08:00   | 12:00  | 04:00    |
           | 15:00   | 19:00  | 04:00    | 08:00
02/06/2026 | 08:00   | 16:00  | 08:00    | 08:00
03/06/2026 | 08:00   | 16:00  | 08:00    | 08:00
TOTAL (negrita, fuente mayor, borde superior grueso)
           |         |        |          | 32:00
```

(Sin columnas "Balance diario", "Total Semana/Mes" ni "Balance Semana/Mes" porque `horas_semanales = 0` o `dias_laborables = 0`. 5 columnas base.)

#### Ejemplo exportando una semana (sin columnas de periodo, sin Balance diario)

```
Informe personalizado - Semana 25 de junio 2026 (negrita, 16pt, centrado, merged A-E, altura mayor)
Fecha      | Entrada | Salida | Duración | Total día
───────────────────────────────────────────────────
01/06/2026 | 08:00   | 16:00  | 08:00    | 08:00
02/06/2026 | 08:00   | 16:00  | 08:00    | 08:00
03/06/2026 | 08:00   | 16:00  | 08:00    | 08:00
TOTAL (negrita, fuente mayor, borde superior grueso)
           |         |        |          | 24:00
```

#### Ejemplo exportando un año (con Balance diario, Total Semana/Mes y Balance Semana/Mes)

```
Informe anual - 2026 (negrita, 16pt, centrado, merged A-H, altura mayor)
Fecha      | Entrada | Salida | Duración | Total día | Balance diario | Total Semana/Mes | Balance Semana/Mes
──────────────────────────────────────────────────────────────────────────────────────────────────────────────
05/01/2026 | 08:00   | 16:00  | 08:00    | 08:00     | +0,5 (verde)   |
...        |         |        |          |           |                |
30/01/2026 | 08:00   | 16:00  | 08:00    | 08:00     | +0,5 (verde)   | 160:00 (negrita,+4pt) | +10,0 (negrita,+4pt,fondo verde pastel)
═══════════════════════════════════════ borde inferior 2pt sólido negro (en la última fila de datos) ═══════
02/02/2026 | 08:00   | 16:00  | 08:00    | 08:00     | +0,5 (verde)   |
...        |         |        |          |           |                |
27/02/2026 | 08:00   | 16:00  | 08:00    | 08:00     | +0,5 (verde)   | 152:00 (negrita,+4pt) | +8,0 (negrita,+4pt,fondo verde pastel)
═══════════════════════════════════════ borde inferior 2pt sólido negro (en la última fila de datos) ═══════
...
01/04/2026 | 08:00   | 16:00  | 08:00    | 08:00     | +0,5 (verde)   |
...        |         |        |          |           |                |
30/04/2026 | 08:00   | 16:00  | 08:00    | 08:00     | +0,5 (verde)   | 168:00 (negrita,+4pt) | +12,0 (negrita,+4pt,fondo verde pastel)
═══════════════════════════════════════ borde inferior 2pt sólido negro (en la última fila de datos) ═══════
TOTAL (negrita, fuente mayor, borde superior grueso)
           |         |        |          | 1872:00   | +150,0         | 1872:00            | +150,0
```

Notas para exportación anual:

- El informe anual separa por **meses** (no por semanas).
- La última fila de datos de cada mes tiene un **borde inferior de 2pt sólido negro** (sin fila separadora adicional).
- La columna "Total Semana/Mes" muestra el total de horas trabajadas del mes en la última fila de datos. Negrita, 4pt mayor, sin color de fondo condicional.
- La columna "Balance Semana/Mes" muestra la suma de balances diarios del mes en la última fila de datos. Negrita, 4pt mayor, fondo verde pastel si >= 0, rojo pastel si < 0.
- Una única fila "TOTAL" al final con sumatorios en las columnas 5 (Total día), 6 (Balance diario), 7 (Total Semana/Mes) y 8 (Balance Semana/Mes).

### Nombre del fichero

Patrón simplificado: `jornadas_YYYYMMDDHHmmss.xlsx`, donde el timestamp es la fecha/hora actual en el momento de triggerar la exportación.

Ejemplo: `jornadas_20260627143025.xlsx` (27 de junio de 2026, 14:30:25).

No depende del filtro activo ni del periodo seleccionado; el nombre identifica de forma única cada exportación por el instante en que se genera.

### Diálogo de confirmación

Componente `ExportConfirmModal.svelte`:

- Props: `periodo: string`, `onConfirm: () => void`, `onCancel: () => void`
- Modal nativo (`<dialog>`) o div con `role="dialog"` + backdrop
- Foco atrapado, cierre con Escape
- Accesibilidad: `aria-labelledby`, `aria-modal`

### Descarga del fichero

La descarga la gestiona internamente el wrapper (`excel-wrapper.ts`). El import dinámico de `write-excel-file` vive exclusivamente en el wrapper:

```typescript
// Implementación interna de excel-wrapper.ts
async function guardarFichero(workbook: Workbook, nombre: string): Promise<void> {
	const writeXlsxFile = (await import('write-excel-file')).default;
	await writeXlsxFile(workbook.rows, {
		columns: workbook.columns,
		fileName: nombre,
		sheet: workbook.sheetName
	});
}
```

Cada celda se define de forma declarativa (`{ value, type, fontWeight, backgroundColor, borderTopStyle, ... }`), lo que cubre los estilos de cabecera, balance diario con colores, Total Semana/Mes sin color condicional, Balance Semana/Mes con fondo pastel, borde inferior 2pt en última fila de datos de cada periodo, y fila TOTAL sin librería de pago.

### Reutilización existente

#### `$lib/utils/redondeo`

- `duracionEfectivaMinutos` — duración con redondeo aplicado según configuración.

#### `$lib/utils/dashboard-exceso`

- `calcularBalancePeriodo` — balance del periodo (realizadas vs obligatorias).
- `balancePorDia` — devuelve `Map<string, BalanceDia>` (cada valor: `{ claveDia, trabajado, objetivo, balance }`, en minutos); reutilizable para totales (`.trabajado`) y balances (`.balance`) por día en el XLSX.

#### `$lib/utils/settings`

- `settingsVigente` / `settingsActual` — snapshot de configuración aplicable en cada jornada.
- `horasDiarias` — calcula el objetivo diario a partir de `horas_semanales / dias_laborables`.
- `objetivoDiarioMinutos` — objetivo diario en minutos, derivado de settings.

#### `$lib/utils/dashboard-format`

- `formatearHorasDecimal` — formatea **horas** con coma como separador decimal (formato español). ⚠️ Ya no se usa para las columnas de duración del XLSX (ahora se usa formato hh:mm). Puede seguir siendo útil internamente para cálculos auxiliares. Se necesita una nueva función `minutosAhhmm(minutos: number): string` que convierta minutos a formato "HH:MM" (ej. 282 → "04:42").

#### `$lib/utils/fecha-negocio`

- `inicioDia` — devuelve el inicio del día (00:00) para una fecha dada.
- `mismoDia` — comprueba si dos fechas corresponden al mismo día.
- `diaDeJornada` — extrae el día de una jornada.
- `claveDia` — clave canónica (string) para agrupar jornadas por día.

#### `$lib/utils/dashboard-periodo`

- `filtrarPorPeriodo` — filtrado de jornadas por periodo.

#### `$lib/utils/dashboard-calc`

- `agruparPorDia` — agrupación de jornadas por día para resúmenes.

#### `$lib/utils/export-agrupacion` (NUEVO)

- `agruparPorSemana` — **función nueva** que agrupa jornadas por semana usando `primer_dia_semana` de settings.
  - Firma: `agruparPorSemana(jornadas: Jornada[], primerDiaSemana: number): Map<string, Jornada[]>`
  - La clave es un string con el formato `"2026-W25"` o `"2026-06-22"` (inicio de la semana).
  - Necesaria para determinar los límites de semana y calcular el "Total Semana/Mes" / "Balance Semana/Mes" al exportar un mes, y el "Total Semana/Mes" / "Balance Semana/Mes" al exportar un año (agrupando por mes natural).

#### Settings (campo)

- `primer_dia_semana` (campo de `Settings`) — inicio de semana para agrupación por sub-periodos, consistente con `filtrarPorPeriodo` y `PeriodoNavegacion`.

## Verificación

| Criterio                       | Método                                                 | Evidencia                                                                                                         |
| ------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Diálogo                        | Pulsar Exportar                                        | Modal aparece con texto correcto                                                                                  |
| Cancelar                       | Pulsar Cancelar                                        | Modal se cierra, sin descarga                                                                                     |
| Confirmar                      | Pulsar Exportar en modal                               | Fichero .xlsx se descarga                                                                                         |
| Nombre fichero                 | Mirar nombre descargado                                | Coincide con patrón `jornadas_YYYYMMDDHHmmss.xlsx`                                                                |
| Fila título                    | Abrir XLSX en Excel                                    | Fila 1 con título descriptivo merged, negrita, 16pt, centrado                                                     |
| Texto título año               | Exportar año 2026                                      | "Informe anual - 2026" en fila 1                                                                                  |
| Texto título mes               | Exportar mes junio 2026                                | "Informe mensual - junio 2026" en fila 1                                                                          |
| Texto título semana            | Exportar semana                                        | "Informe personalizado - Semana N de mes año" en fila 1                                                           |
| Columnas base                  | Abrir XLSX en Excel                                    | 5 columnas (sin contrato) o 6 (con contrato): Fecha, Entrada, Salida, Duración, Total día [, Balance diario]      |
| Formato duración               | Revisar celdas de Duración                             | Formato hh:mm (ej. "04:42"), no decimal                                                                           |
| Formato fecha                  | Revisar celdas de Fecha                                | Formato DD/MM/YYYY                                                                                                |
| Formato hora                   | Revisar celdas de Entrada/Salida                       | Formato HH:MM (24h)                                                                                               |
| Total día numérico             | Click en celda Total día en Excel                      | Celda numérica (permite sumas, formato condicional)                                                               |
| Balance diario                 | Configurar horas_semanales + dias_laborables           | 6ª columna "Balance diario" (numérica, colores); 8 columnas en mes/año con Total Semana/Mes + Balance Semana/Mes  |
| Balance negativo               | Día con menos horas del objetivo                       | Celda en rojo y negrita                                                                                           |
| Balance positivo               | Día con más horas del objetivo                         | Celda en verde y negrita                                                                                          |
| Total semana                   | Exportar mes con contrato configurado                  | 7ª columna "Total Semana/Mes" en última fila de datos de cada semana, sin color condicional                       |
| Total semana estilo            | Revisar formato de celda Total Semana/Mes              | Negrita, 4pt mayor, sin fondo condicional                                                                         |
| Balance semana                 | Exportar mes con contrato configurado                  | 8ª columna "Balance Semana/Mes" con fondo verde/rojo pastel en última fila de datos                               |
| Total mes                      | Exportar año con contrato configurado                  | 7ª columna "Total Semana/Mes" en última fila de datos de cada mes, sin color condicional                          |
| Balance mes                    | Exportar año con contrato configurado                  | 8ª columna "Balance Semana/Mes" con fondo verde/rojo pastel en última fila de datos                               |
| Separador periodos             | Revisar bordes entre semanas/meses                     | Borde inferior 2pt sólido negro en última fila de datos del periodo (sin fila separadora adicional)               |
| Fila TOTAL                     | Mirar última fila del XLSX                             | Fila TOTAL con sumatorios en col. 5, 6, 7, 8; negrita, fuente mayor, borde superior grueso                        |
| Sin balance diario             | Configurar horas_semanales, dias_laborables=0          | 5 columnas (semana) o 7 (mes/año), sin "Balance diario" ni "Balance Semana/Mes"                                   |
| Total día                      | Día con múltiples jornadas                             | Total solo en última fila del día                                                                                 |
| Orden                          | Revisar filas                                          | Fechas de menor a mayor                                                                                           |
| Duración efectiva              | Comparar con UI                                        | Coincide con duración mostrada en historial                                                                       |
| Solo cerradas                  | Exportar periodo con jornada abierta                   | La jornada abierta no aparece en el XLSX                                                                          |
| Columnas Total/Balance periodo | Exportar mes/año con contrato                          | Total Semana/Mes (col. 7, sin color condicional) + Balance Semana/Mes (col. 8, con color condicional), 8 columnas |
| Separador 2pt                  | Revisar separador entre semanas/meses                  | Borde inferior 2pt sólido negro en última fila de datos del periodo, sin fila separadora adicional                |
| Balance                        | Exportar con horas_semanales > 0 y dias_laborables > 0 | Balance = trabajadas − obligatorias (numérico)                                                                    |
| Sin contrato                   | Exportar con horas_semanales = 0 o dias_laborables = 0 | Sin balance en ningún sitio; columna Total Semana/Mes solo en mes/año; fila TOTAL                                 |
| Primer día semana              | Configurar domingo como inicio                         | Semanas agrupadas de domingo a sábado                                                                             |
| Wrapper                        | Revisar imports de historial-export.ts                 | No importa write-excel-file directamente                                                                          |
| Sin datos                      | Filtro sin jornadas cerradas                           | Botón deshabilitado o aviso                                                                                       |
| Calidad                        | `npm run check && npm run build`                       | Sin errores                                                                                                       |
