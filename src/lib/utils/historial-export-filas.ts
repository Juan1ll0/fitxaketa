import type { Jornada, Settings } from '$lib/db';
import type { BalanceDia } from '$lib/utils/dashboard-types';
import type { Cell } from 'write-excel-file/browser';
import type { Workbook } from '$lib/utils/excel-wrapper';
import {
	celdaBalanceDiario,
	celdaTotalDia,
	escribirColumnaTotalSemana,
	escribirFila,
	escribirSeparador
} from '$lib/utils/excel-wrapper';
import { claveDia, diaDeJornada } from '$lib/utils/fecha-negocio';
import { duracionEfectivaMinutos } from '$lib/utils/redondeo';
import { agruparPorSemana } from '$lib/utils/export-agrupacion';

const COLUMNAS_BASE = ['Fecha', 'Entrada', 'Salida', 'Duración', 'Total día'];
const F_FECHA = new Intl.DateTimeFormat('es-ES', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric'
});
const F_HORA = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

/** Estado compartido por las funciones constructoras de filas. */
export interface ContextoFilas {
	snapshots: Settings[];
	balances: Map<string, BalanceDia>;
	tieneContrato: boolean;
	tieneTotalSemana: boolean;
}

/** Minutos a formato hh:mm con cero a la izquierda (ej. 282 → "04:42"). */
export function formatearDuracionHHMM(minutos: number): string {
	const h = Math.floor(minutos / 60);
	const m = minutos % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function agruparPor(jornadas: Jornada[], claveFn: (j: Jornada) => string): Map<string, Jornada[]> {
	const grupos = new Map<string, Jornada[]>();
	for (const j of jornadas) {
		const clave = claveFn(j);
		if (!grupos.has(clave)) grupos.set(clave, []);
		grupos.get(clave)!.push(j);
	}
	return grupos;
}

const agruparPorDia = (j: Jornada[]): Map<string, Jornada[]> =>
	agruparPor(j, (x) => claveDia(diaDeJornada(x)));

/** Columnas según contrato y periodo. Total semana (7ª) solo en mes/año con contrato. */
export function determinarColumnas(tieneContrato: boolean, tieneTotalSemana: boolean): string[] {
	const cols = [...COLUMNAS_BASE];
	if (tieneContrato) cols.push('Balance diario');
	if (tieneContrato && tieneTotalSemana) cols.push('Total semana');
	return cols;
}

/** Suma de horas (decimal) de un grupo de jornadas con su redondeo aplicado. */
export function totalHorasGrupo(jornadas: Jornada[], snapshots: Settings[]): number {
	return jornadas.reduce((acc, j) => acc + duracionEfectivaMinutos(j, snapshots), 0) / 60;
}

function filaJornada(
	j: Jornada,
	ctx: ContextoFilas,
	esPrimeraDelDia: boolean,
	esUltimaDelDia: boolean
): Array<Cell | string | null> {
	const bal = ctx.balances.get(claveDia(diaDeJornada(j)));
	const tot = bal ? bal.trabajado / 60 : null;
	const balH = bal ? bal.balance / 60 : null;
	const fila: Array<Cell | string | null> = [
		esPrimeraDelDia ? F_FECHA.format(diaDeJornada(j)) : null,
		F_HORA.format(j.start_time),
		j.end_time ? F_HORA.format(j.end_time) : null,
		formatearDuracionHHMM(duracionEfectivaMinutos(j, ctx.snapshots)),
		celdaTotalDia(esUltimaDelDia ? tot : null)
	];
	if (ctx.tieneContrato) fila.push(celdaBalanceDiario(esUltimaDelDia ? balH : null));
	return fila;
}

function escribirJornadas(
	wb: Workbook,
	jornadas: Jornada[],
	ctx: ContextoFilas,
	totalSemanaPorJornada: Map<Jornada, number>
): void {
	for (const lista of agruparPorDia(jornadas).values()) {
		const ult = lista.length - 1;
		for (let i = 0; i < lista.length; i++) {
			const j = lista[i];
			escribirFila(wb, filaJornada(j, ctx, i === 0, i === ult));
			const ts = totalSemanaPorJornada.get(j);
			if (ts !== undefined) escribirColumnaTotalSemana(wb, ts);
		}
	}
}

function escribirSemanas(
	wb: Workbook,
	jornadas: Jornada[],
	ctx: ContextoFilas,
	primerDia: number
): void {
	const semanas = agruparPorSemana(jornadas, primerDia);
	const claves = [...semanas.keys()];
	for (let i = 0; i < claves.length; i++) {
		const lista = semanas.get(claves[i])!;
		const mapa = new Map<Jornada, number>([
			[lista[lista.length - 1], totalHorasGrupo(lista, ctx.snapshots)]
		]);
		escribirJornadas(wb, lista, ctx, mapa);
		if (i < claves.length - 1) escribirSeparador(wb);
	}
}

const sinTotal = new Map<Jornada, number>();
export const escribirAgrupadoPorMes = (wb: Workbook, j: Jornada[], c: ContextoFilas): void =>
	escribirJornadas(wb, j, c, sinTotal);
export const escribirGlobal = (wb: Workbook, j: Jornada[], c: ContextoFilas): void =>
	escribirJornadas(wb, j, c, sinTotal);
export const escribirAgrupadoPorSemana = (
	wb: Workbook,
	j: Jornada[],
	c: ContextoFilas,
	primerDia: number
): void =>
	c.tieneTotalSemana ? escribirSemanas(wb, j, c, primerDia) : escribirJornadas(wb, j, c, sinTotal);
