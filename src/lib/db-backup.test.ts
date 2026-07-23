import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/db';
import { exportarDatos, importarDatos } from '$lib/db-backup';
import { seedSettingsIfEmpty } from '$lib/db-settings';
import type { BackupData } from '$lib/utils/backup';

const backup = (over: Partial<BackupData> = {}): BackupData => ({
	app: 'fitxaketa',
	version: 1,
	schema: 4,
	exportado: new Date().toISOString(),
	jornadas: [],
	settings: [],
	...over
});

beforeEach(async () => {
	await db.delete();
	await db.open();
});

describe('db-backup', () => {
	it('exportarDatos lee ambas tablas', async () => {
		await db.jornadas.add({
			start_time: new Date(),
			end_time: null,
			lat_start: null,
			lng_start: null,
			lat_end: null,
			lng_end: null,
			duration: null,
			status: 'open',
			synced: 0
		});
		await seedSettingsIfEmpty();

		const { jornadas, settings } = await exportarDatos();
		expect(jornadas).toHaveLength(1);
		expect(settings.length).toBeGreaterThan(0);
	});

	it('importarDatos reemplaza y conserva los ids (AC-07)', async () => {
		await db.jornadas.add({
			start_time: new Date(),
			end_time: null,
			lat_start: null,
			lng_start: null,
			lat_end: null,
			lng_end: null,
			duration: null,
			status: 'open',
			synced: 0
		});

		await importarDatos(
			backup({
				jornadas: [
					{
						id: 42,
						start_time: new Date('2026-06-10T09:00:00.000Z'),
						end_time: new Date('2026-06-10T17:00:00.000Z'),
						lat_start: null,
						lng_start: null,
						lat_end: null,
						lng_end: null,
						duration: 480,
						status: 'closed',
						synced: 1
					}
				],
				settings: [
					{
						id: 7,
						fecha: new Date('2026-01-01T00:00:00.000Z'),
						primer_dia_semana: 1,
						min_jornada_minutos: 0,
						horas_semanales: 40,
						dias_laborables: 5,
						redondeo_minutos: 0
					}
				]
			})
		);

		const jornadas = await db.jornadas.toArray();
		expect(jornadas).toHaveLength(1);
		expect(jornadas[0].id).toBe(42);
		expect(jornadas[0].status).toBe('closed');

		const settings = await db.settings.toArray();
		expect(settings).toHaveLength(1);
		expect(settings[0].id).toBe(7);
	});

	it('re-siembra la configuración por defecto si el backup no trae settings (AC-09)', async () => {
		await importarDatos(backup({ jornadas: [], settings: [] }));
		const settings = await db.settings.toArray();
		expect(settings.length).toBeGreaterThan(0);
	});
});
