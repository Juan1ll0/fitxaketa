import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/db';
import { initAppState, startJornada, getJornadas, getClockedIn } from '$lib/stores/app-state';
import { borrarRango, resetFabrica } from '$lib/stores/app-state-borrado';

async function addJornadaCerrada(start: Date): Promise<void> {
	await db.jornadas.add({
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
}

function rangoDelDia(fecha: Date): { desde: Date; hasta: Date } {
	const desde = new Date(fecha);
	desde.setHours(0, 0, 0, 0);
	const hasta = new Date(desde);
	hasta.setDate(hasta.getDate() + 1);
	return { desde, hasta };
}

describe('acciones de borrado del store', () => {
	beforeEach(async () => {
		await db.delete();
		await db.open();
		await initAppState();
	});

	it('borrarRango elimina y refresca la lista del store (AC-13)', async () => {
		await addJornadaCerrada(new Date(2026, 5, 10, 9));
		await addJornadaCerrada(new Date(2026, 5, 11, 9));
		await initAppState();
		expect(getJornadas()).toHaveLength(2);

		const { desde, hasta } = rangoDelDia(new Date(2026, 5, 10));
		await borrarRango(desde, hasta);
		expect(getJornadas()).toHaveLength(1);
	});

	it('borrar la jornada abierta vuelve al estado inactivo (AC-12)', async () => {
		await startJornada();
		expect(getClockedIn()).toBe(true);

		const { desde, hasta } = rangoDelDia(new Date());
		await borrarRango(desde, hasta);
		expect(getClockedIn()).toBe(false);
		expect(getJornadas()).toHaveLength(0);
	});

	it('resetFabrica vacía datos y resetea el estado activo (AC-02)', async () => {
		await startJornada();
		await resetFabrica();
		expect(getClockedIn()).toBe(false);
		expect(getJornadas()).toHaveLength(0);
		expect(await db.settings.count()).toBe(1);
	});
});
