import { db, type Settings } from '$lib/db';

/** Inserta un snapshot de configuración (append-only: nunca update/delete). */
export async function addSettingsSnapshot(s: Omit<Settings, 'id'>): Promise<number> {
	return await db.settings.add(s);
}

/** Todos los snapshots de configuración ordenados por `fecha` ascendente. */
export async function getAllSettings(): Promise<Settings[]> {
	return await db.settings.orderBy('fecha').toArray();
}

/**
 * Siembra un snapshot por defecto (contrato neutro → objetivo 0 → sin exceso)
 * si la tabla está vacía. `fecha` temprana para que `settingsVigente` siempre
 * encuentre uno.
 */
export async function seedSettingsIfEmpty(): Promise<void> {
	if ((await db.settings.count()) > 0) return;
	await db.settings.add({
		fecha: new Date(2000, 0, 1),
		primer_dia_semana: 1,
		min_jornada_minutos: 0,
		horas_semanales: 0,
		dias_laborables: 5,
		redondeo_minutos: 0
	});
}
