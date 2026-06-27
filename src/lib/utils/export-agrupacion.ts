import type { Jornada } from '$lib/db';
import { claveDia, inicioSemana } from '$lib/utils/fecha-negocio';

/**
 * Agrupa jornadas por la semana que las contiene. La clave es el inicio de
 * semana en formato `YYYY-MM-DD` (hora local), respetando el `primerDiaSemana`
 * del usuario (0 = domingo, 1 = lunes, etc.). El orden de inserción del Map
 * sigue el orden ascendente de las claves, que es cronológico.
 */
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
