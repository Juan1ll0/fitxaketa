import type { Cell, SheetData } from 'write-excel-file/browser';

/**
 * Estado interno del workbook: filas acumuladas, nombre de hoja y nº de
 * columnas de la cabecera (para que la fila resumen ocupe todo el ancho).
 */
export interface Workbook {
	rows: SheetData;
	sheetName: string;
	numColumnas: number;
}

const HOJA_POR_DEFECTO = 'Jornadas';
const FONDO_CABECERA = '#e5e7eb';
const FONDO_RESUMEN = '#f3f4f6';

function celdaCabecera(texto: string): Cell {
	return { value: texto, type: String, fontWeight: 'bold', backgroundColor: FONDO_CABECERA };
}

function celdaResumenVacia(): Cell {
	return { backgroundColor: FONDO_RESUMEN, topBorderStyle: 'thin' };
}

function celdaResumenValor(texto: string): Cell {
	return {
		value: texto,
		type: String,
		backgroundColor: FONDO_RESUMEN,
		topBorderStyle: 'thin'
	};
}

/** Inicializa un workbook vacío con la hoja por defecto. */
export function crearWorkbook(): Workbook {
	return { rows: [], sheetName: HOJA_POR_DEFECTO, numColumnas: 0 };
}

/** Añade la fila de cabecera (negrita, fondo gris claro) con los nombres dados. */
export function escribirCabecera(workbook: Workbook, columnas: string[]): void {
	workbook.numColumnas = columnas.length;
	workbook.rows.push(columnas.map(celdaCabecera));
}

/** Añade una fila de datos normal. `null` representa celda vacía. */
export function escribirFila(workbook: Workbook, datos: Array<string | number | null>): void {
	workbook.rows.push(datos as SheetData[number]);
}

/**
 * Añade una fila de resumen: celdas vacías en Fecha/Entrada/Salida/Total día,
 * y `total` (opcionalmente seguido de ` | Balance: balance`) en Duración.
 * Fondo gris claro y borde superior la distinguen visualmente. Si el
 * workbook tiene más columnas (Balance diario), también las rellena vacías
 * con el mismo estilo para mantener la coherencia visual.
 */
export function escribirFilaResumen(workbook: Workbook, total: string, balance?: string): void {
	const texto = balance !== undefined ? `${total} | Balance: ${balance}` : total;
	const celdas: Cell[] = [
		celdaResumenVacia(),
		celdaResumenVacia(),
		celdaResumenVacia(),
		celdaResumenValor(texto),
		celdaResumenVacia()
	];
	while (celdas.length < workbook.numColumnas) celdas.push(celdaResumenVacia());
	workbook.rows.push(celdas);
}

/** Añade una fila vacía como separador visual entre sub-periodos. */
export function escribirSeparador(workbook: Workbook): void {
	workbook.rows.push([]);
}

/**
 * Genera el fichero XLSX y dispara la descarga al navegador.
 * La librería `write-excel-file` se carga con import dinámico para no
 * impactar el bundle inicial. Si el workbook no tiene filas, no se genera.
 */
export async function guardarFichero(workbook: Workbook, nombre: string): Promise<void> {
	if (workbook.rows.length === 0) return;
	const writeXlsxFile = (await import('write-excel-file/browser')).default;
	const resultado = await writeXlsxFile(workbook.rows, { sheet: workbook.sheetName });
	await resultado.toFile(nombre);
}
