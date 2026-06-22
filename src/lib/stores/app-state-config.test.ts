import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, type Settings } from '$lib/db';
import {
	initAppState,
	startJornada,
	stopJornada,
	guardarSettings,
	getSettings
} from '$lib/stores/app-state';

function settingsInput(over: Partial<Settings> = {}): Omit<Settings, 'id'> {
	return {
		fecha: new Date(),
		primer_dia_semana: 1,
		min_jornada_minutos: 0,
		horas_semanales: 40,
		dias_laborables: 5,
		redondeo_minutos: 0,
		...over
	};
}

describe('app-state · settings y descarte por mínimo', () => {
	beforeEach(async () => {
		await db.delete();
		await db.open();
		await initAppState();
	});

	it('initAppState siembra y carga settings', () => {
		expect(getSettings().length).toBeGreaterThan(0);
	});

	it('descarta la jornada si dura menos del mínimo configurado', async () => {
		await guardarSettings(settingsInput({ min_jornada_minutos: 5 }));
		await startJornada();
		const descartada = await stopJornada();
		expect(descartada).toBe(true);
		expect(await db.jornadas.count()).toBe(0);
	});

	it('con mínimo 0 guarda la jornada', async () => {
		await guardarSettings(settingsInput({ min_jornada_minutos: 0 }));
		await startJornada();
		const descartada = await stopJornada();
		expect(descartada).toBe(false);
		expect(await db.jornadas.where('status').equals('closed').count()).toBe(1);
	});
});
