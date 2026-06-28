import type { Jornada, Settings } from '$lib/db';
import type { BalanceDia } from '$lib/utils/dashboard-types';
import type { Cell } from 'write-excel-file/browser';
import type { Workbook } from '$lib/utils/excel-wrapper';
import {
	celdaBalanceDiario,
	celdaBalanceSemana,
	celdaTotalDia,
	celdaTotalSemana,
	escribirFila
} from '$lib/utils/excel-wrapper';
import { ultimosDiasDeCadaPeriodo } from '$lib/utils/export-agrupacion';
import type { CierrePeriodo, TipoSubPeriodo } from '$lib/utils/export-agrupacion';
import { claveDia, diaDeJornada, inicioMes, inicioSemana } from '$lib/utils/fecha-negocio';
import { duracionEfectivaMinutos } from '$lib/utils/redondeo';

const COLUMNAS_BASE = ['Fecha', 'Entrada', 'Salida', 'Duración', 'Total día'];
const F_FECHA = new Intl.DateTimeFormat('es-ES', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric'
});
const F_HORA = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

export interface ContextoFilas {
	snapshots: Settings[];
	balances: Map<string, BalanceDia>;
	tieneContrato: boolean;
	subPeriodo: TipoSubPeriodo;
	cierres?: Map<string, CierrePeriodo>;
	primerDiaSemana: number;
}

interface PosicionFila {
	esPrimeraDelDia: boolean;
	esUltimaDelDia: boolean;
	cierre: CierrePeriodo | null;
}

export function formatearDuracionHHMM(minutos: number): string {
	const h = Math.floor(minutos / 60);
	const m = minutos % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function nombreColumna(sub: TipoSubPeriodo, prefijo: string): string {
	if (sub === 'semana') return `${prefijo} Semana`;
	if (sub === 'mes') return `${prefijo} Mes`;
	return '';
}

export function determinarColumnas(tieneContrato: boolean, subPeriodo: TipoSubPeriodo): string[] {
	const cols = [...COLUMNAS_BASE];
	if (tieneContrato) cols.push('Balance diario');
	if (subPeriodo === 'ninguno') return cols;
	cols.push(nombreColumna(subPeriodo, 'Total'));
	if (tieneContrato) cols.push(nombreColumna(subPeriodo, 'Balance'));
	return cols;
}

export function totalHorasGrupo(jornadas: Jornada[], snapshots: Settings[]): number {
	return jornadas.reduce((acc, j) => acc + duracionEfectivaMinutos(j, snapshots), 0) / 60;
}

function clavePeriodo(j: Jornada, ctx: ContextoFilas): string {
	if (ctx.subPeriodo === 'semana')
		return claveDia(inicioSemana(new Date(j.start_time), ctx.primerDiaSemana));
	if (ctx.subPeriodo === 'mes') return claveDia(inicioMes(new Date(j.start_time))).slice(0, 7);
	return '';
}

function agruparPorDia(jornadas: Jornada[]): Map<string, Jornada[]> {
	const grupos = new Map<string, Jornada[]>();
	for (const j of jornadas) {
		const k = claveDia(diaDeJornada(j));
		if (!grupos.has(k)) grupos.set(k, []);
		grupos.get(k)!.push(j);
	}
	return grupos;
}

type FilaValores = Array<Cell | string | null>;

function agregarColumnasPeriodo(
	fila: FilaValores,
	ctx: ContextoFilas,
	cierre: CierrePeriodo | null
): void {
	if (cierre === null || ctx.subPeriodo === 'ninguno') return;
	fila.push(celdaTotalSemana(cierre.total));
	if (ctx.tieneContrato) fila.push(celdaBalanceSemana(cierre.balance));
}

function filaJornada(
	j: Jornada,
	ctx: ContextoFilas,
	pos: PosicionFila
): Array<Cell | string | null> {
	const bal = ctx.balances.get(claveDia(diaDeJornada(j)));
	const tot = bal ? bal.trabajado / 60 : null;
	const balH = bal ? bal.balance / 60 : null;
	const fila: Array<Cell | string | null> = [
		pos.esPrimeraDelDia ? F_FECHA.format(diaDeJornada(j)) : null,
		F_HORA.format(j.start_time),
		j.end_time ? F_HORA.format(j.end_time) : null,
		formatearDuracionHHMM(duracionEfectivaMinutos(j, ctx.snapshots)),
		celdaTotalDia(pos.esUltimaDelDia ? tot : null)
	];
	if (ctx.tieneContrato) fila.push(celdaBalanceDiario(pos.esUltimaDelDia ? balH : null));
	agregarColumnasPeriodo(fila, ctx, pos.cierre);
	return fila;
}

export function escribirJornadas(wb: Workbook, jornadas: Jornada[], ctx: ContextoFilas): void {
	const grupos = agruparPorDia(jornadas);
	const cierres = ctx.cierres ?? new Map<string, CierrePeriodo>();
	const ultimosDelPeriodo = ultimosDiasDeCadaPeriodo(grupos, ctx.subPeriodo, ctx.primerDiaSemana);
	for (const [k, lista] of grupos) {
		const ult = lista.length - 1;
		const esUltimoDelPeriodo = ultimosDelPeriodo.has(k);
		const cierre = esUltimoDelPeriodo ? (cierres.get(clavePeriodo(lista[ult], ctx)) ?? null) : null;
		for (let i = 0; i < lista.length; i++) {
			const isLast = i === ult;
			const showCierre = isLast && esUltimoDelPeriodo;
			// prettier-ignore
			escribirFila(wb, filaJornada(lista[i], ctx, { esPrimeraDelDia: i === 0, esUltimaDelDia: isLast, cierre: showCierre ? cierre : null }), { bottomBorder: showCierre });
		}
	}
}
