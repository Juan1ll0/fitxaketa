import type { Jornada, Settings } from '$lib/db';
import type { BalanceDia } from '$lib/utils/dashboard-types';
import type { FiltroTemporal } from '$lib/utils/historial-filtros';
import { claveDia, diaDeJornada, inicioMes, inicioSemana } from '$lib/utils/fecha-negocio';
import { duracionEfectivaMinutos } from '$lib/utils/redondeo';

export interface CierrePeriodo {
	total: number;
	balance: number;
}

export type TipoSubPeriodo = 'ninguno' | 'semana' | 'mes';

export function tipoSubPeriodoDeFiltro(filtro: FiltroTemporal): TipoSubPeriodo {
	if (filtro.tipo !== 'periodo') return 'ninguno';
	if (filtro.periodo === 'mes') return 'semana';
	if (filtro.periodo === 'año') return 'mes';
	return 'ninguno';
}

export interface CalcularCierresParams {
	jornadas: Jornada[];
	tipoSubPeriodo: TipoSubPeriodo;
	snapshots: Settings[];
	balances: Map<string, BalanceDia>;
	primerDiaSemana: number;
}

export function agruparPorSemana(
	jornadas: Jornada[],
	primerDiaSemana: number
): Map<string, Jornada[]> {
	const grupos = new Map<string, Jornada[]>();
	for (const jornada of jornadas) {
		const inicio = inicioSemana(new Date(jornada.start_time), primerDiaSemana);
		const clave = claveDia(inicio);
		if (!grupos.has(clave)) grupos.set(clave, []);
		grupos.get(clave)!.push(jornada);
	}
	return grupos;
}

export function agruparPorMes(jornadas: Jornada[]): Map<string, Jornada[]> {
	const grupos = new Map<string, Jornada[]>();
	for (const jornada of jornadas) {
		const inicio = inicioMes(new Date(jornada.start_time));
		const clave = claveDia(inicio).slice(0, 7);
		if (!grupos.has(clave)) grupos.set(clave, []);
		grupos.get(clave)!.push(jornada);
	}
	return grupos;
}

function totalesPorDia(
	jornadas: Jornada[],
	snapshots: Settings[],
	balances: Map<string, BalanceDia>
): Map<string, CierrePeriodo> {
	const grupos = new Map<string, Jornada[]>();
	for (const j of jornadas) {
		const k = claveDia(diaDeJornada(j));
		if (!grupos.has(k)) grupos.set(k, []);
		grupos.get(k)!.push(j);
	}
	const totales = new Map<string, CierrePeriodo>();
	for (const [k, lista] of grupos) {
		const total = lista.reduce((acc, j) => acc + duracionEfectivaMinutos(j, snapshots), 0) / 60;
		const bal = balances.get(k);
		totales.set(k, { total, balance: bal ? bal.balance / 60 : 0 });
	}
	return totales;
}

function sumarCierreUnico(lista: Jornada[], tDia: Map<string, CierrePeriodo>): CierrePeriodo {
	const diasVistos = new Set<string>();
	let total = 0;
	let balance = 0;
	for (const j of lista) {
		const dK = claveDia(diaDeJornada(j));
		if (diasVistos.has(dK)) continue;
		diasVistos.add(dK);
		const t = tDia.get(dK);
		if (!t) continue;
		total += t.total;
		balance += t.balance;
	}
	return { total, balance };
}

export function calcularCierresPorPeriodo({
	jornadas,
	tipoSubPeriodo,
	snapshots,
	balances,
	primerDiaSemana
}: CalcularCierresParams): Map<string, CierrePeriodo> {
	if (tipoSubPeriodo === 'ninguno') return new Map();
	const grupos =
		tipoSubPeriodo === 'semana'
			? agruparPorSemana(jornadas, primerDiaSemana)
			: agruparPorMes(jornadas);
	const tDia = totalesPorDia(jornadas, snapshots, balances);
	const cierres = new Map<string, CierrePeriodo>();
	for (const [k, lista] of grupos) cierres.set(k, sumarCierreUnico(lista, tDia));
	return cierres;
}

function claveSub(j: Jornada, tipo: TipoSubPeriodo, primerDia: number): string {
	if (tipo === 'semana') return claveDia(inicioSemana(new Date(j.start_time), primerDia));
	return claveDia(inicioMes(new Date(j.start_time))).slice(0, 7);
}

export function ultimosDiasDeCadaPeriodo(
	grupos: Map<string, Jornada[]>,
	tipo: TipoSubPeriodo,
	primerDia: number
): Set<string> {
	if (tipo === 'ninguno') return new Set();
	const ultimos = new Set<string>();
	let currentPeriod: string | null = null;
	let lastDayKey: string | null = null;
	for (const [k, lista] of grupos) {
		const pk = claveSub(lista[lista.length - 1], tipo, primerDia);
		if (pk !== currentPeriod && lastDayKey) ultimos.add(lastDayKey);
		currentPeriod = pk;
		lastDayKey = k;
	}
	if (lastDayKey) ultimos.add(lastDayKey);
	return ultimos;
}
