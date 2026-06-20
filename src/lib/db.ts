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

class FitxaketaDB extends Dexie {
	jornadas!: Table<Jornada, number>;

	constructor() {
		super('fitxaketa');
		this.version(3).stores({
			jornadas: '++id, start_time, end_time, status, synced'
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
