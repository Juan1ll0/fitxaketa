import type { Cell, SheetData } from 'write-excel-file/browser';
import { BORDE_GUIONES } from './excel-wrapper-celda';
export {
	celdaBalanceDiario,
	celdaBalanceSemana,
	celdaTotalDia,
	celdaTotalSemana
} from './excel-wrapper-celda';

export interface Workbook {
	rows: SheetData;
	sheetName: string;
}

const HOJA_POR_DEFECTO = 'Jornadas';
const FONDO_CABECERA = '#e5e7eb';
const TAMANO_FUENTE_TITULO = 16;
const TAMANO_FUENTE_TOTAL = 14;
const ALTURA_FILA_TITULO = 24;
const COLOR_BORDE_INFERIOR = '#000000';

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

export interface EscribirFilaOpciones {
	/** Aplica un borde inferior 2pt sólido negro a toda la fila (separador visual de periodo). */
	bottomBorder?: boolean;
}

function conBordeInferior(cell: Cell | string | number | null): Cell {
	if (cell === null)
		return { bottomBorderStyle: 'medium', bottomBorderColor: COLOR_BORDE_INFERIOR };
	if (typeof cell !== 'object')
		return { value: cell, bottomBorderStyle: 'medium', bottomBorderColor: COLOR_BORDE_INFERIOR };
	return { ...cell, bottomBorderStyle: 'medium', bottomBorderColor: COLOR_BORDE_INFERIOR };
}

export function escribirFila(
	workbook: Workbook,
	datos: Array<Cell | string | number | null>,
	opciones: EscribirFilaOpciones = {}
): void {
	const cells = opciones.bottomBorder ? datos.map(conBordeInferior) : datos;
	workbook.rows.push(cells as SheetData[number]);
}

export interface TotalesFila {
	/** Suma de horas trabajadas (col. 5, siempre presente). */
	totalDia: number;
	/** Suma de balances diarios (col. 6) o `null` si no hay contrato. */
	balanceDiario: number | null;
	/** Suma de totales de periodo (col. 7) o `null` si no hay sub-periodo. */
	totalPeriodo: number | null;
	/** Suma de balances de periodo (col. 8) o `null` si no hay contrato o sub-periodo. */
	balancePeriodo: number | null;
}

function celdaNumeroTotal(value: number, format: string): Cell {
	return {
		...BORDE_GUIONES,
		value,
		type: Number,
		fontWeight: 'bold',
		fontSize: TAMANO_FUENTE_TOTAL,
		format
	};
}

/** Fila TOTAL: "TOTAL" en col. 1, sumatorios en cols 5-8 según disponibilidad, borde superior grueso. */
export function escribirFilaTotal(
	workbook: Workbook,
	totales: TotalesFila,
	numColumnas: number
): void {
	const cells: Cell[] = new Array(numColumnas);
	cells[0] = {
		...BORDE_GUIONES,
		value: 'TOTAL',
		fontWeight: 'bold',
		fontSize: TAMANO_FUENTE_TOTAL
	};
	if (numColumnas > 4) cells[4] = celdaNumeroTotal(totales.totalDia, '0.0');
	if (numColumnas > 5 && totales.balanceDiario !== null)
		cells[5] = celdaNumeroTotal(totales.balanceDiario, '+0.0;-0.0;0.0');
	if (numColumnas > 6 && totales.totalPeriodo !== null)
		cells[6] = celdaNumeroTotal(totales.totalPeriodo, '0.0');
	if (numColumnas > 7 && totales.balancePeriodo !== null)
		cells[7] = celdaNumeroTotal(totales.balancePeriodo, '+0.0;-0.0;0.0');
	for (let i = 0; i < numColumnas; i++) if (!cells[i]) cells[i] = BORDE_GUIONES;
	workbook.rows.push(cells);
}

/** Genera el fichero XLSX y dispara la descarga. `write-excel-file` se carga con import dinámico. */
export async function guardarFichero(workbook: Workbook, nombre: string): Promise<void> {
	if (workbook.rows.length === 0) return;
	const writeXlsxFile = (await import('write-excel-file/browser')).default;
	const resultado = await writeXlsxFile(workbook.rows, { sheet: workbook.sheetName });
	await resultado.toFile(nombre);
}
