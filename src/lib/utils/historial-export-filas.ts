import type { Jornada, Settings } from '$lib/db';
import type { BalanceDia } from '$lib/utils/dashboard-types';
import type { Workbook } from '$lib/utils/excel-wrapper';
import { escribirFila, escribirFilaResumen, escribirSeparador } from '$lib/utils/excel-wrapper';
import { claveDia, diaDeJornada } from '$lib/utils/fecha-negocio';
import { duracionEfectivaMinutos } from '$lib/utils/redondeo';
import { calcularBalancePeriodo } from '$lib/utils/dashboard-exceso';
import { agruparPorSemana } from '$lib/utils/export-agrupacion';

const COLUMNAS_BASE = ['Fecha', 'Entrada', 'Salida', 'Duración', 'Total día'];
const FORMATO_FECHA = new Intl.DateTimeFormat('es-ES', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric'
});
const FORMATO_HORA = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

/** Estado compartido por las funciones constructoras de filas. */
export interface ContextoFilas {
	snapshots: Settings[];
	balances: Map<string, BalanceDia>;
	tieneContrato: boolean;
}

/** Minutos a horas decimales con coma como separador (formato español). */
function formatearDecimal(minutos: number): string {
	return (minutos / 60).toFixed(1).replace('.', ',');
}

/** Balance (con signo) en horas decimales. `conH=true` añade el sufijo "h". */
function formatearBalance(minutos: number, conH: boolean): string {
	const base = `${minutos >= 0 ? '+' : '-'}${formatearDecimal(Math.abs(minutos))}`;
	return conH ? `${base}h` : base;
}

function claveMes(fecha: Date): string {
	return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
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

const agruparPorMes = (j: Jornada[]): Map<string, Jornada[]> =>
	agruparPor(j, (x) => claveMes(new Date(x.start_time)));
const agruparPorDia = (j: Jornada[]): Map<string, Jornada[]> =>
	agruparPor(j, (x) => claveDia(diaDeJornada(x)));

/** Columnas según contrato. La 6ª (Balance diario) solo si hay contrato. */
export function determinarColumnas(tieneContrato: boolean): string[] {
	return tieneContrato ? [...COLUMNAS_BASE, 'Balance diario'] : [...COLUMNAS_BASE];
}

function filaJornada(
	j: Jornada,
	ctx: ContextoFilas,
	esUltimaDelDia: boolean
): Array<string | number | null> {
	const bal = ctx.balances.get(claveDia(diaDeJornada(j)));
	const fila: Array<string | number | null> = [
		FORMATO_FECHA.format(diaDeJornada(j)),
		FORMATO_HORA.format(j.start_time),
		j.end_time ? FORMATO_HORA.format(j.end_time) : null,
		formatearDecimal(duracionEfectivaMinutos(j, ctx.snapshots)),
		esUltimaDelDia && bal ? formatearDecimal(bal.trabajado) : null
	];
	if (ctx.tieneContrato) {
		fila.push(esUltimaDelDia && bal ? formatearBalance(bal.balance, false) : null);
	}
	return fila;
}

function escribirGrupo(wb: Workbook, jornadas: Jornada[], ctx: ContextoFilas): void {
	for (const lista of agruparPorDia(jornadas).values()) {
		const ultima = lista.length - 1;
		for (let i = 0; i < lista.length; i++) {
			escribirFila(wb, filaJornada(lista[i], ctx, i === ultima));
		}
	}
	const totalMin = jornadas.reduce((acc, j) => acc + duracionEfectivaMinutos(j, ctx.snapshots), 0);
	escribirFilaResumen(
		wb,
		`${formatearDecimal(totalMin)}h`,
		ctx.tieneContrato
			? formatearBalance(calcularBalancePeriodo(jornadas, ctx.snapshots), true)
			: undefined
	);
}

function escribirConAgrupador(
	wb: Workbook,
	jornadas: Jornada[],
	ctx: ContextoFilas,
	agrupador: (j: Jornada[]) => Map<string, Jornada[]>
): void {
	let primero = true;
	for (const lista of agrupador(jornadas).values()) {
		if (!primero) escribirSeparador(wb);
		primero = false;
		escribirGrupo(wb, lista, ctx);
	}
}

export const escribirAgrupadoPorMes = (
	wb: Workbook,
	jornadas: Jornada[],
	ctx: ContextoFilas
): void => escribirConAgrupador(wb, jornadas, ctx, agruparPorMes);

export const escribirAgrupadoPorSemana = (
	wb: Workbook,
	jornadas: Jornada[],
	ctx: ContextoFilas,
	primerDia: number
): void => escribirConAgrupador(wb, jornadas, ctx, (j) => agruparPorSemana(j, primerDia));

export const escribirGlobal = (wb: Workbook, jornadas: Jornada[], ctx: ContextoFilas): void =>
	escribirGrupo(wb, jornadas, ctx);
