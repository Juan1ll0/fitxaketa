import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
	db,
	createJornada,
	closeJornada,
	getOpenJornada,
	getAllJornadas,
	getUnsyncedJornadas,
	markAsSynced,
	clearSynced,
	type Jornada
} from '$lib/db';

describe('db (Dexie)', () => {
	beforeEach(async () => {
		await db.delete();
		await db.open();
	});

	it('debería crear la base de datos correctamente', async () => {
		const count = await db.jornadas.count();
		expect(count).toBe(0);
	});

	it('debería permitir crear una jornada abierta', async () => {
		const id = await createJornada();
		expect(id).toBeGreaterThan(0);

		const open = await getOpenJornada();
		expect(open).toBeDefined();
		expect(open?.status).toBe('open');
		expect(open?.end_time).toBeNull();
	});

	it('debería permitir cerrar una jornada', async () => {
		const id = await createJornada();
		await closeJornada(id);

		const open = await getOpenJornada();
		expect(open).toBeUndefined();

		const all = await getAllJornadas();
		expect(all).toHaveLength(1);
		expect(all[0].status).toBe('closed');
		expect(all[0].duration).toBeGreaterThanOrEqual(0);
	});

	it('debería filtrar jornadas no sincronizadas', async () => {
		const id1 = await createJornada();
		const id2 = await createJornada();
		await closeJornada(id1);

		const unsynced = await getUnsyncedJornadas();
		expect(unsynced).toHaveLength(2);

		await markAsSynced(id1);
		const unsyncedAfter = await getUnsyncedJornadas();
		expect(unsyncedAfter).toHaveLength(1);
		expect(unsyncedAfter[0].id).toBe(id2);
	});

	// AC-06: clearSynced() elimina jornadas sincronizadas con más de 30 días
	it('debería eliminar jornadas sincronizadas con más de 30 días', async () => {
		// Crear jornada reciente y marcarla como sincronizada
		const recentId = await createJornada();
		await closeJornada(recentId);
		await markAsSynced(recentId);

		// Crear jornada de hace 31 días y marcarla como sincronizada
		const oldJornada: Jornada = {
			start_time: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
			end_time: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
			lat_start: null,
			lng_start: null,
			lat_end: null,
			lng_end: null,
			duration: 480,
			status: 'closed',
			synced: 1
		};
		const oldId = await db.jornadas.add(oldJornada);

		// Crear jornada no sincronizada de hace 31 días (no debe borrarse)
		const unsyncedOldJornada: Jornada = {
			start_time: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
			end_time: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
			lat_start: null,
			lng_start: null,
			lat_end: null,
			lng_end: null,
			duration: 480,
			status: 'closed',
			synced: 0
		};
		await db.jornadas.add(unsyncedOldJornada);

		// Ejecutar clearSynced
		await clearSynced();

		// Verificar: la reciente (sync=1, reciente) y la vieja no sincronizada deben quedar
		const remaining = await getAllJornadas();
		const remainingIds = remaining.map((j) => j.id);

		expect(remainingIds).toContain(recentId);
		expect(remainingIds).not.toContain(oldId); // vieja sincronizada debe borrarse
		expect(remaining).toHaveLength(2); // reciente + vieja no sincronizada
	});

	it('no debería eliminar jornadas sincronizadas recientes (menos de 30 días)', async () => {
		const id = await createJornada();
		await closeJornada(id);
		await markAsSynced(id);

		await clearSynced();

		const all = await getAllJornadas();
		expect(all).toHaveLength(1);
		expect(all[0].id).toBe(id);
	});

	it('no debería eliminar jornadas no sincronizadas aunque tengan más de 30 días', async () => {
		const unsyncedOldJornada: Jornada = {
			start_time: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
			end_time: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
			lat_start: null,
			lng_start: null,
			lat_end: null,
			lng_end: null,
			duration: 480,
			status: 'closed',
			synced: 0
		};
		await db.jornadas.add(unsyncedOldJornada);

		await clearSynced();

		const all = await getAllJornadas();
		expect(all).toHaveLength(1);
		expect(all[0].synced).toBe(0);
	});
});
