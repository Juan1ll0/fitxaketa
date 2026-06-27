import type { Cell, SheetData } from 'write-excel-file/browser';
import { BORDE_GUIONES, celdaTotalSemana } from './excel-wrapper-celda';
export { celdaTotalDia, celdaBalanceDiario } from './excel-wrapper-celda';

export interface Workbook {
	rows: SheetData;
	sheetName: string;
}

const HOJA_POR_DEFECTO = 'Jornadas';
const FONDO_CABECERA = '#e5e7eb';
const TAMANO_FUENTE_TITULO = 16;
const TAMANO_FUENTE_TOTAL = 14;
const ALTURA_FILA_TITULO = 24;

export function crearWorkbook(): Workbook {
	return { rows: [], sheetName: HOJA_POR_DEFECTO };
}

/** Fila 1: título del informe fusionado en todas las columnas. Llamar ANTES de `escribirCabecera`. */
export function escribirTitulo(workbook: Workbook, titulo: string, numColumnas: number): void {
	const cells: Cell[] = [
		{
			value: titulo,
			fontWeight: 'bold',
			fontSize: TAMANO_FUENTE_TITULO,
			align: 'center',
			alignVertical: 'center',
			columnSpan: numColumnas,
			height: ALTURA_FILA_TITULO
		}
	];
	for (let i = 1; i < numColumnas; i++) cells.push(null);
	workbook.rows.push(cells);
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
		if (i === 0)
			cells.push({
				...BORDE_GUIONES,
				value: 'TOTAL',
				fontWeight: 'bold',
				fontSize: TAMANO_FUENTE_TOTAL
			});
		else if (i === columnaTotalIdx)
			cells.push({
				...BORDE_GUIONES,
				value: totalHoras,
				type: Number,
				fontWeight: 'bold',
				fontSize: TAMANO_FUENTE_TOTAL,
				format: '0.0'
			});
		else cells.push(BORDE_GUIONES);
	}
	workbook.rows.push(cells);
}

/** Separador entre periodos: fila con borde inferior 2pt sólido negro, sin contenido; nº de celdas = fila previa. */
export function escribirSeparador(workbook: Workbook): void {
	const prev = workbook.rows[workbook.rows.length - 1];
	if (!prev || prev.length === 0) {
		workbook.rows.push([]);
		return;
	}
	const cells: Cell[] = [];
	for (let i = 0; i < prev.length; i++) {
		cells.push({ bottomBorderStyle: 'medium', bottomBorderColor: '#000000' });
	}
	workbook.rows.push(cells);
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
