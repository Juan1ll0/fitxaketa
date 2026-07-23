import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/db';
import { initAppState, startJornada, getJornadas, getClockedIn } from '$lib/stores/app-state';
import { importarCopia } from '$lib/stores/app-state-backup';
import { serializarBackup } from '$lib/utils/backup';
import type { Jornada, Settings } from '$lib/db';

const jCerrada = (start: Date): Jornada => ({
	start_time: start,
	end_time: new Date(start.getTime() + 3_600_000),
	lat_start: null,
	lng_start: null,
	lat_end: null,
	lng_end: null,
	duration: 60,
	status: 'closed',
	synced: 1
});

const sDefault = (): Settings => ({
	fecha: new Date('2026-01-01T00:00:00.000Z'),
	primer_dia_semana: 1,
	min_jornada_minutos: 0,
	horas_semanales: 40,
	dias_laborables: 5,
	redondeo_minutos: 0
});

beforeEach(async () => {
	await db.delete();
	await db.open();
	await initAppState();
});

describe('importarCopia (store)', () => {
	it('reemplaza y recarga las jornadas reactivamente (AC-10)', async () => {
		await startJornada();
		const texto = serializarBackup(
			[jCerrada(new Date(2026, 5, 10, 9)), jCerrada(new Date(2026, 5, 11, 9))],
			[sDefault()]
		);

		await importarCopia(texto);

		expect(getJornadas()).toHaveLength(2);
	});

	it('si la jornada abierta desaparece tras importar, el estado vuelve a inactivo (AC-12)', async () => {
		await startJornada();
		expect(getClockedIn()).toBe(true);

		const texto = serializarBackup([jCerrada(new Date(2026, 5, 10, 9))], [sDefault()]);
		await importarCopia(texto);

		expect(getClockedIn()).toBe(false);
	});
});
