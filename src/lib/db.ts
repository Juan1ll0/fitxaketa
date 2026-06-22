import Dexie, { type Table } from 'dexie';

export interface Jornada {
	id?: number;
	start_time: Date;
	end_time: Date | null;
	lat_start: number | null;
	lng_start: number | null;
	lat_end: number | null;
	lng_end: number | null;
	duration: number | null;
	status: 'open' | 'closed';
	synced: 0 | 1;
}

export interface JornadaInput {
	lat_start?: number | null;
	lng_start?: number | null;
}

/**
 * Configuración del usuario, colección append-only: cada cambio inserta un
 * snapshot completo fechado (nunca update/delete). Las horas diarias NO se
 * almacenan (derivadas: `horas_semanales / dias_laborables`). El token de
 * Google NO va aquí (se modela en la spec 004).
 */
export interface Settings {
	id?: number;
	fecha: Date;
	primer_dia_semana: number; // 0=domingo … 1=lunes (default) … 6=sábado
	min_jornada_minutos: number; // 0 = desactivado
	horas_semanales: number;
	dias_laborables: number; // 1..7
	redondeo_minutos: number; // 0 = desactivado; redondea la DURACIÓN de la jornada
}

class FitxaketaDB extends Dexie {
	jornadas!: Table<Jornada, number>;
	settings!: Table<Settings, number>;

	constructor() {
		super('fitxaketa');
		this.version(3).stores({
			jornadas: '++id, start_time, end_time, status, synced'
		});
		// v4: solo añade la tabla `settings` (append-only); no toca jornadas.
		this.version(4).stores({
			jornadas: '++id, start_time, end_time, status, synced',
			settings: '++id, fecha'
		});
	}
}

export const db = new FitxaketaDB();

export async function createJornada(input?: JornadaInput): Promise<number> {
	const jornada: Jornada = {
		start_time: new Date(),
		end_time: null,
		lat_start: input?.lat_start ?? null,
		lng_start: input?.lng_start ?? null,
		lat_end: null,
		lng_end: null,
		duration: null,
		status: 'open',
		synced: 0
	};
	return await db.jornadas.add(jornada);
}

export async function closeJornada(
	id: number,
	coords?: { lat: number | null; lng: number | null }
): Promise<void> {
	const jornada = await db.jornadas.get(id);
	if (!jornada) return;
	const end = new Date();
	const duration = Math.floor((end.getTime() - jornada.start_time.getTime()) / 60000);
	await db.jornadas.update(id, {
		end_time: end,
		lat_end: coords?.lat ?? null,
		lng_end: coords?.lng ?? null,
		duration,
		status: 'closed',
		synced: 0
	});
}

export async function getAllJornadas(): Promise<Jornada[]> {
	return await db.jornadas.orderBy('start_time').reverse().toArray();
}

export async function getOpenJornada(): Promise<Jornada | undefined> {
	return await db.jornadas.where('status').equals('open').last();
}

export async function getUnsyncedJornadas(): Promise<Jornada[]> {
	return await db.jornadas.where('synced').equals(0).toArray();
}

export async function markAsSynced(id: number): Promise<void> {
	await db.jornadas.update(id, { synced: 1 });
}

export async function clearSynced(): Promise<void> {
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	await db.jornadas
		.where('synced')
		.equals(1)
		.and((jornada) => jornada.start_time < thirtyDaysAgo)
		.delete();
}

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
