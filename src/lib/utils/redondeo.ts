import type { Jornada, Settings } from '$lib/db';
import { settingsVigente } from '$lib/utils/settings';

/**
 * Redondea una cantidad de minutos al múltiplo más cercano de `intervalo`.
 * `intervalo <= 0` → sin cambio. Ej.: 487 con 15 → 480; 488 con 15 → 495.
 */
export function redondearMinutos(minutos: number, intervalo: number): number {
	if (intervalo <= 0) return minutos;
	return Math.round(minutos / intervalo) * intervalo;
}

/**
 * Duración efectiva (minutos) de una jornada cerrada: la duración real
 * redondeada al intervalo del snapshot vigente en su `start_time` (histórico).
 * No muta la jornada. Si `end_time` es null → 0.
 */
export function duracionEfectivaMinutos(jornada: Jornada, snapshots: Settings[]): number {
	if (jornada.end_time == null) return 0;
	const real = (jornada.end_time.getTime() - jornada.start_time.getTime()) / 60000;
	return redondearMinutos(real, settingsVigente(snapshots, jornada.start_time).redondeo_minutos);
}
