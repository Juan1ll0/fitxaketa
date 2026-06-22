import type { Jornada, Settings } from '$lib/db';
import { settingsVigente } from '$lib/utils/settings';

/**
 * Redondea `fecha` al múltiplo más cercano de `minutos`. No muta el argumento.
 * `minutos === 0` → copia sin cambio. Ej.: 21:43 con 15 → 21:45; 21:37 → 21:30.
 */
export function redondearFecha(fecha: Date, minutos: number): Date {
	if (minutos <= 0) return new Date(fecha);
	const intervaloMs = minutos * 60000;
	const redondeado = Math.round(fecha.getTime() / intervaloMs) * intervaloMs;
	return new Date(redondeado);
}

/**
 * Duración efectiva (minutos) de una jornada cerrada aplicando el redondeo del
 * snapshot vigente a su `start_time`. No muta la jornada. Si `end_time` es null
 * → 0.
 */
export function duracionEfectivaMinutos(jornada: Jornada, snapshots: Settings[]): number {
	if (jornada.end_time == null) return 0;
	const s = settingsVigente(snapshots, jornada.start_time);
	const aplicar = s.redondeo_minutos;
	const aEntrada = s.redondeo_aplicar_a === 'entrada' || s.redondeo_aplicar_a === 'ambas';
	const aSalida = s.redondeo_aplicar_a === 'salida' || s.redondeo_aplicar_a === 'ambas';

	const startR = aEntrada ? redondearFecha(jornada.start_time, aplicar) : jornada.start_time;
	const endR = aSalida ? redondearFecha(jornada.end_time, aplicar) : jornada.end_time;

	return (endR.getTime() - startR.getTime()) / 60000;
}
