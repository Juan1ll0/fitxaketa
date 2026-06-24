import type { Jornada } from '$lib/db';
import { mismoDia } from '$lib/utils/fecha-negocio';

/**
 * Devuelve la primera jornada abierta cuyo `start_time` NO es de hoy, o `null`.
 * Alimenta el aviso "Jornada sin cerrar" del dashboard (spec 003.8, E4).
 */
export function jornadaAbiertaAnterior(jornadas: Jornada[], hoy: Date): Jornada | null {
	return jornadas.find((j) => j.status === 'open' && !mismoDia(j.start_time, hoy)) ?? null;
}
