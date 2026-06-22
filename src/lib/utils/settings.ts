import type { Settings } from '$lib/db';

/** Config neutra usada cuando aún no hay ningún snapshot (sin contrato ni redondeo). */
const SETTINGS_DEFECTO: Settings = {
	fecha: new Date(0),
	primer_dia_semana: 1,
	min_jornada_minutos: 0,
	horas_semanales: 0,
	dias_laborables: 5,
	redondeo_minutos: 0,
	redondeo_aplicar_a: 'ambas'
};

/** Snapshots ordenados por `fecha` ascendente (defensivo: no asume orden). */
function ordenados(snapshots: Settings[]): Settings[] {
	return [...snapshots].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

/** Snapshot más reciente (mayor `fecha`). Config por defecto si no hay ninguno. */
export function settingsActual(snapshots: Settings[]): Settings {
	if (snapshots.length === 0) return SETTINGS_DEFECTO;
	const orden = ordenados(snapshots);
	return orden[orden.length - 1];
}

/**
 * Snapshot vigente en `fecha`: el de mayor `fecha` ≤ `fecha`. Si ninguno es
 * anterior (todos posteriores), fallback al más antiguo. Config por defecto si
 * no hay snapshots.
 */
export function settingsVigente(snapshots: Settings[], fecha: Date): Settings {
	if (snapshots.length === 0) return SETTINGS_DEFECTO;
	const orden = ordenados(snapshots);
	let vigente = orden[0];
	for (const s of orden) {
		if (s.fecha.getTime() <= fecha.getTime()) vigente = s;
		else break;
	}
	return vigente;
}

/**
 * Histórico de un campo: proyecta su valor por snapshot, colapsando valores
 * iguales consecutivos (solo se conserva el snapshot donde el valor cambia).
 */
export function historicoCampo<K extends keyof Settings>(
	snapshots: Settings[],
	campo: K
): { valor: Settings[K]; desde: Date }[] {
	const orden = ordenados(snapshots);
	const resultado: { valor: Settings[K]; desde: Date }[] = [];
	for (const s of orden) {
		const ultimo = resultado[resultado.length - 1];
		if (!ultimo || ultimo.valor !== s[campo]) {
			resultado.push({ valor: s[campo], desde: s.fecha });
		}
	}
	return resultado;
}

/** Horas diarias derivadas del contrato (`horas_semanales / dias_laborables`). */
export function horasDiarias(s: Settings): number {
	if (s.dias_laborables <= 0) return 0;
	return s.horas_semanales / s.dias_laborables;
}

/**
 * Objetivo diario en minutos para `fecha`, según el snapshot vigente. 0 si no
 * hay contrato definido (`horas_semanales` o `dias_laborables` a 0).
 */
export function objetivoDiarioMinutos(snapshots: Settings[], fecha: Date): number {
	const s = settingsVigente(snapshots, fecha);
	if (s.horas_semanales <= 0 || s.dias_laborables <= 0) return 0;
	return horasDiarias(s) * 60;
}
