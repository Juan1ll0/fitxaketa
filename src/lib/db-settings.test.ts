import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
	db,
	addSettingsSnapshot,
	getAllSettings,
	seedSettingsIfEmpty,
	type Settings
} from '$lib/db';

function input(fecha: Date): Omit<Settings, 'id'> {
	return {
		fecha,
		primer_dia_semana: 1,
		min_jornada_minutos: 0,
		horas_semanales: 40,
		dias_laborables: 5,
		redondeo_minutos: 0,
		redondeo_aplicar_a: 'ambas'
	};
}

describe('db settings (append-only)', () => {
	beforeEach(async () => {
		await db.delete();
		await db.open();
	});

	it('addSettingsSnapshot acumula (no borra) y getAllSettings ordena por fecha', async () => {
		await addSettingsSnapshot(input(new Date(2026, 5, 1)));
		await addSettingsSnapshot(input(new Date(2026, 0, 1)));
		const all = await getAllSettings();
		expect(all).toHaveLength(2);
		expect(all[0].fecha.getTime()).toBe(new Date(2026, 0, 1).getTime()); // ascendente
	});

	it('seedSettingsIfEmpty siembra uno si está vacío y no duplica', async () => {
		await seedSettingsIfEmpty();
		await seedSettingsIfEmpty();
		expect(await db.settings.count()).toBe(1);
	});
});
