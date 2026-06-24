import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

	afterEach(() => {
		vi.useRealTimers();
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

	it('aplica el mínimo vigente al INICIO aunque se reduzca a mitad de jornada', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		const t0 = new Date(2026, 0, 1, 9, 0, 0);
		vi.setSystemTime(t0);
		await guardarSettings(settingsInput({ min_jornada_minutos: 15 }));
		await startJornada();

		// 5 minutos después se baja el mínimo a 1 y se ficha salida
		vi.setSystemTime(new Date(t0.getTime() + 5 * 60 * 1000));
		await guardarSettings(settingsInput({ min_jornada_minutos: 1 }));
		const descartada = await stopJornada();

		// 5 min < 15 (mínimo del inicio) → se descarta, NO se guarda
		expect(descartada).toBe(true);
		expect(await db.jornadas.count()).toBe(0);
	});
});
