import type { Cell } from 'write-excel-file/browser';

const TAMANO_FUENTE_BASE = 10;
const TAMANO_FUENTE_PERIODO = 14;
const COLOR_ROJO = '#dc2626';
const COLOR_VERDE = '#16a34a';
const COLOR_NEGRO = '#000000';
const COLOR_ROJO_PASTEL = '#fecaca';
const COLOR_VERDE_PASTEL = '#bbf7d0';

export const BORDE_GUIONES: Cell = { topBorderStyle: 'thick' };

/** Celda numérica para "Total día" (horas decimales). `null` = celda vacía. */
export function celdaTotalDia(horas: number | null): Cell | null {
	return horas === null ? null : { value: horas, type: Number, format: '0.0' };
}

/** Celda numérica para "Balance diario": negrita + rojo si < 0, verde si >= 0. */
export function celdaBalanceDiario(balance: number | null): Cell | null {
	if (balance === null) return null;
	return {
		type: Number,
		fontWeight: 'bold',
		value: balance,
		fontSize: TAMANO_FUENTE_BASE,
		textColor: balance < 0 ? COLOR_ROJO : COLOR_VERDE,
		format: '+0.0;-0.0;0.0'
	};
}

/** Celda numérica para "Total Semana/Mes": negrita, +4pt, sin color de fondo (siempre >= 0). */
export function celdaTotalSemana(horas: number | null): Cell | null {
	if (horas === null) return null;
	return {
		type: Number,
		fontWeight: 'bold',
		value: horas,
		fontSize: TAMANO_FUENTE_PERIODO,
		textColor: COLOR_NEGRO,
		format: '0.0'
	};
}

/** Celda numérica para "Balance Semana/Mes": negrita, +4pt, fondo pastel según signo. */
export function celdaBalanceSemana(balance: number | null): Cell | null {
	if (balance === null) return null;
	return {
		type: Number,
		fontWeight: 'bold',
		value: balance,
		fontSize: TAMANO_FUENTE_PERIODO,
		textColor: COLOR_NEGRO,
		backgroundColor: balance < 0 ? COLOR_ROJO_PASTEL : COLOR_VERDE_PASTEL,
		format: '+0.0;-0.0;0.0'
	};
}
