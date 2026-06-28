import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/db';
import { seedSettingsIfEmpty } from '$lib/db-settings';
import {
	borrarJornadasEnRango,
	borrarJornada,
	borrarTodosLosSettings,
	borrarUltimoSettings,
	resetDeFabrica
} from '$lib/db-borrado';

function snapshot(fecha: Date, horas: number) {
	return {
		fecha,
		primer_dia_semana: 1,
		min_jornada_minutos: 0,
		horas_semanales: horas,
		dias_laborables: 5,
		redondeo_minutos: 0
	};
}

async function addJornada(start: Date): Promise<number> {
	return await db.jornadas.add({
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

describe('db-borrado', () => {
	beforeEach(async () => {
		await db.delete();
		await db.open();
		await seedSettingsIfEmpty();
	});

	it('borrarJornadasEnRango borra solo el rango y devuelve el conteo', async () => {
		await addJornada(new Date(2025, 5, 1));
		await addJornada(new Date(2026, 0, 10));
		await addJornada(new Date(2026, 6, 20));
		const borradas = await borrarJornadasEnRango(new Date(2026, 0, 1), new Date(2027, 0, 1));
		expect(borradas).toBe(2);
		const restantes = await db.jornadas.toArray();
		expect(restantes).toHaveLength(1);
		expect(restantes[0].start_time.getFullYear()).toBe(2025);
	});

	it('borrarJornada elimina una jornada concreta', async () => {
		const id = await addJornada(new Date(2026, 1, 1));
		await addJornada(new Date(2026, 1, 2));
		await borrarJornada(id);
		expect(await db.jornadas.count()).toBe(1);
		expect(await db.jornadas.get(id)).toBeUndefined();
	});

	it('borrarTodosLosSettings vacía y re-siembra el default', async () => {
		await db.settings.add({
			fecha: new Date(2026, 0, 1),
			primer_dia_semana: 1,
			min_jornada_minutos: 0,
			horas_semanales: 40,
			dias_laborables: 5,
			redondeo_minutos: 0
		});
		await borrarTodosLosSettings();
		const settings = await db.settings.toArray();
		expect(settings).toHaveLength(1);
		expect(settings[0].horas_semanales).toBe(0); // el snapshot por defecto
	});

	it('borrarUltimoSettings elimina solo el último snapshot (rige el anterior)', async () => {
		await db.settings.clear();
		await db.settings.add(snapshot(new Date(2026, 0, 1), 40));
		await db.settings.add(snapshot(new Date(2026, 2, 1), 35));
		await borrarUltimoSettings();
		const settings = await db.settings.orderBy('fecha').toArray();
		expect(settings).toHaveLength(1);
		expect(settings[0].horas_semanales).toBe(40); // vuelve a regir el anterior
	});

	it('borrarUltimoSettings re-siembra el default si era el único', async () => {
		await db.settings.clear();
		await db.settings.add(snapshot(new Date(2026, 0, 1), 40));
		await borrarUltimoSettings();
		const settings = await db.settings.toArray();
		expect(settings).toHaveLength(1);
		expect(settings[0].horas_semanales).toBe(0);
	});

	it('resetDeFabrica borra jornadas y settings, y re-siembra el default', async () => {
		await addJornada(new Date(2026, 2, 1));
		await resetDeFabrica();
		expect(await db.jornadas.count()).toBe(0);
		expect(await db.settings.count()).toBe(1);
	});
});
