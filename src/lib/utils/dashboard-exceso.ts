import type { Jornada, Settings } from '$lib/db';
import type { BalanceDia } from '$lib/utils/dashboard-types';
import { claveDia, diaDeJornada } from '$lib/utils/fecha-negocio';
import { duracionEfectivaMinutos } from '$lib/utils/redondeo';
import { objetivoDiarioMinutos } from '$lib/utils/settings';

/**
 * Balance por día (minutos, con signo) de las jornadas cerradas. Solo entran
 * días con jornada: `trabajado` = Σ duración efectiva; `objetivo` = objetivo
 * diario vigente; `balance` = trabajado − objetivo.
 */
export function balancePorDia(jornadas: Jornada[], snapshots: Settings[]): Map<string, BalanceDia> {
	const grupos = new Map<string, Jornada[]>();
	for (const jornada of jornadas) {
		if (jornada.status !== 'closed') continue;
		const dia = diaDeJornada(jornada);
		const key = claveDia(dia);
		if (!grupos.has(key)) grupos.set(key, []);
		grupos.get(key)!.push(jornada);
	}

	const resultado = new Map<string, BalanceDia>();
	for (const [key, lista] of grupos) {
		const trabajado = lista.reduce((acc, j) => acc + duracionEfectivaMinutos(j, snapshots), 0);
		const objetivo = objetivoDiarioMinutos(snapshots, diaDeJornada(lista[0]));
		resultado.set(key, { claveDia: key, trabajado, objetivo, balance: trabajado - objetivo });
	}
	return resultado;
}

/** Balance del periodo (minutos, con signo): Σ de los balances diarios. */
export function calcularBalancePeriodo(jornadas: Jornada[], snapshots: Settings[]): number {
	let total = 0;
	for (const dia of balancePorDia(jornadas, snapshots).values()) {
		total += dia.balance;
	}
	return total;
}
