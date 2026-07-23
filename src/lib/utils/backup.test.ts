import { describe, it, expect } from 'vitest';
import { serializarBackup, parsearBackup, APP_ID, SCHEMA_DEXIE } from './backup';
import type { Jornada, Settings } from '$lib/db';

const jornada = (over: Partial<Jornada> = {}): Jornada => ({
	id: 1,
	start_time: new Date('2026-06-10T09:00:00.000Z'),
	end_time: new Date('2026-06-10T17:00:00.000Z'),
	lat_start: null,
	lng_start: null,
	lat_end: null,
	lng_end: null,
	duration: 480,
	status: 'closed',
	synced: 1,
	...over
});

const settings = (over: Partial<Settings> = {}): Settings => ({
	id: 1,
	fecha: new Date('2026-01-01T00:00:00.000Z'),
	primer_dia_semana: 1,
	min_jornada_minutos: 0,
	horas_semanales: 40,
	dias_laborables: 5,
	redondeo_minutos: 0,
	...over
});

describe('backup: serializar / parsear', () => {
	it('round-trip conserva datos y revive las fechas como Date (AC-02, AC-08)', () => {
		const j = [
			jornada(),
			jornada({ id: 2, end_time: null, status: 'open', synced: 0, duration: null })
		];
		const data = parsearBackup(serializarBackup(j, [settings()]));

		expect(data.app).toBe(APP_ID);
		expect(data.schema).toBe(SCHEMA_DEXIE);
		expect(data.jornadas).toHaveLength(2);
		expect(data.jornadas[0].start_time).toBeInstanceOf(Date);
		expect(data.jornadas[0].start_time.getTime()).toBe(j[0].start_time.getTime());
		expect(data.jornadas[1].end_time).toBeNull(); // end_time nullable revivido correctamente
		expect(data.settings[0].fecha).toBeInstanceOf(Date);
	});

	it('exporta/parsea con base vacía sin error (AC-03)', () => {
		const data = parsearBackup(serializarBackup([], []));
		expect(data.jornadas).toEqual([]);
		expect(data.settings).toEqual([]);
	});

	it('rechaza JSON no válido (AC-05)', () => {
		expect(() => parsearBackup('no es json {')).toThrow();
	});

	it('rechaza un fichero de otra app (AC-05)', () => {
		const texto = JSON.stringify({ app: 'otra', schema: 4, jornadas: [], settings: [] });
		expect(() => parsearBackup(texto)).toThrow();
	});

	it('rechaza una copia con schema más nuevo (AC-05)', () => {
		const texto = JSON.stringify({
			app: APP_ID,
			schema: SCHEMA_DEXIE + 1,
			jornadas: [],
			settings: []
		});
		expect(() => parsearBackup(texto)).toThrow(/nueva/i);
	});

	it('rechaza estructura incompleta (sin arrays) (AC-05)', () => {
		const texto = JSON.stringify({ app: APP_ID, schema: SCHEMA_DEXIE });
		expect(() => parsearBackup(texto)).toThrow();
	});
});
