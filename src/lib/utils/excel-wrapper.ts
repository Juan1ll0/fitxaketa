import type { Cell, SheetData } from 'write-excel-file/browser';

/** Estado interno del workbook: filas acumuladas y nombre de hoja. */
export interface Workbook {
	rows: SheetData;
	sheetName: string;
}

const HOJA_POR_DEFECTO = 'Jornadas';
const FONDO_CABECERA = '#e5e7eb';
const TAMANO_FUENTE_BASE = 10;
const TAMANO_FUENTE_TOTAL = 14;
const COLOR_ROJO = '#dc2626';
const COLOR_VERDE = '#16a34a';
const COLOR_ROJO_PASTEL = '#fecaca';
const COLOR_VERDE_PASTEL = '#bbf7d0';

/** Celda numérica para "Total día" (horas decimales). `null` = celda vacía. */
export function celdaTotalDia(horas: number | null): Cell | null {
	return horas === null ? null : { value: horas, type: Number, format: '0.0' };
}

/** Celda numérica para "Balance diario": negrita + rojo si < 0, verde si >= 0. */
export function celdaBalanceDiario(balance: number | null): Cell | null {
	if (balance === null) return null;
	return {
		value: balance,
		type: Number,
		fontWeight: 'bold',
		fontSize: TAMANO_FUENTE_BASE,
		textColor: balance < 0 ? COLOR_ROJO : COLOR_VERDE,
		format: '+0.0;-0.0;0.0'
	};
}

/** Celda numérica para "Total semana" (7ª col): negrita, +4pt, fondo pastel. */
function celdaTotalSemana(horas: number | null): Cell | null {
	if (horas === null) return null;
	return {
		value: horas,
		type: Number,
		fontWeight: 'bold',
		fontSize: TAMANO_FUENTE_TOTAL,
		textColor: '#000000',
		backgroundColor: horas < 0 ? COLOR_ROJO_PASTEL : COLOR_VERDE_PASTEL,
		format: '0.0'
	};
}

export function crearWorkbook(): Workbook {
	return { rows: [], sheetName: HOJA_POR_DEFECTO };
}

export function escribirCabecera(workbook: Workbook, columnas: string[]): void {
	workbook.rows.push(
		columnas.map((texto) => ({
			value: texto,
			type: String,
			fontWeight: 'bold',
			backgroundColor: FONDO_CABECERA
		}))
	);
}

export function escribirFila(
	workbook: Workbook,
	datos: Array<Cell | string | number | null>
): void {
	workbook.rows.push(datos as SheetData[number]);
}

/** Añade una fila de celdas numéricas (cada número → Cell con type:Number, format:0.0). */
export function escribirFilaNumerica(workbook: Workbook, datos: Array<number | null>): void {
	workbook.rows.push(
		datos.map((v) => (v === null ? null : { value: v, type: Number, format: '0.0' }))
	);
}

/** Fila TOTAL: "TOTAL" en 1ª celda, valor numérico en `columnaTotalIdx`, borde grueso arriba, negrita y fuente mayor. */
export function escribirFilaTotal(
	workbook: Workbook,
	totalHoras: number,
	numColumnas: number,
	columnaTotalIdx: number
): void {
	const cells: Cell[] = [];
	for (let i = 0; i < numColumnas; i++) {
		if (i === 0) {
			cells.push({
				value: 'TOTAL',
				fontWeight: 'bold',
				fontSize: TAMANO_FUENTE_TOTAL,
				topBorderStyle: 'thick'
			});
		} else if (i === columnaTotalIdx) {
			cells.push({
				value: totalHoras,
				type: Number,
				fontWeight: 'bold',
				fontSize: TAMANO_FUENTE_TOTAL,
				topBorderStyle: 'thick',
				format: '0.0'
			});
		} else {
			cells.push({ topBorderStyle: 'thick' });
		}
	}
	workbook.rows.push(cells);
}

export function escribirSeparador(workbook: Workbook): void {
	workbook.rows.push([]);
}

/** Añade la celda de la 7ª columna (Total semana) al final de la última fila. */
export function escribirColumnaTotalSemana(workbook: Workbook, horas: number | null): void {
	const lastRow = workbook.rows[workbook.rows.length - 1];
	if (!lastRow) return;
	lastRow.push(celdaTotalSemana(horas));
}

/** Genera el fichero XLSX y dispara la descarga. `write-excel-file` se carga con import dinámico. */
export async function guardarFichero(workbook: Workbook, nombre: string): Promise<void> {
	if (workbook.rows.length === 0) return;
	const writeXlsxFile = (await import('write-excel-file/browser')).default;
	const resultado = await writeXlsxFile(workbook.rows, { sheet: workbook.sheetName });
	await resultado.toFile(nombre);
}
