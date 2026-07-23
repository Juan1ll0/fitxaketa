import type { Jornada, Settings } from '$lib/db';

/**
 * Formato del fichero de copia de seguridad (backup) de Fitxaketa. Es un JSON con
 * TODAS las jornadas y TODOS los snapshots de settings, más metadatos para poder
 * validar en la importación. Puro: sin acceso a Dexie ni al DOM (solo `type`).
 */

export const APP_ID = 'fitxaketa';
/** Versión del FORMATO del fichero (no de la app). Sube si cambia la estructura. */
export const FORMATO_BACKUP = 1;
/** Esquema Dexie de origen soportado (ver `src/lib/db.ts`). */
export const SCHEMA_DEXIE = 4;

export interface BackupData {
	app: typeof APP_ID;
	version: number;
	schema: number;
	exportado: string; // ISO
	jornadas: Jornada[];
	settings: Settings[];
}

/** Serializa la base a JSON. `JSON.stringify` convierte las `Date` a ISO. */
export function serializarBackup(jornadas: Jornada[], settings: Settings[]): string {
	const data: BackupData = {
		app: APP_ID,
		version: FORMATO_BACKUP,
		schema: SCHEMA_DEXIE,
		exportado: new Date().toISOString(),
		jornadas,
		settings
	};
	return JSON.stringify(data);
}

/**
 * Parsea y **valida** un fichero de backup, reviviendo las fechas (ISO → `Date`).
 * Lanza `Error` con mensaje legible si el fichero no es válido (lo captura la UI);
 * en ese caso el llamador NO debe tocar la base.
 */
export function parsearBackup(texto: string): BackupData {
	let crudo: unknown;
	try {
		crudo = JSON.parse(texto);
	} catch {
		throw new Error('El fichero no es un JSON válido.');
	}
	if (typeof crudo !== 'object' || crudo === null) {
		throw new Error('El fichero no es una copia de Fitxaketa.');
	}
	const obj = crudo as Record<string, unknown>;
	if (obj.app !== APP_ID) {
		throw new Error('El fichero no es una copia de Fitxaketa.');
	}
	if (typeof obj.schema !== 'number' || obj.schema > SCHEMA_DEXIE) {
		throw new Error('La copia se creó con una versión más nueva de la app.');
	}
	if (!Array.isArray(obj.jornadas) || !Array.isArray(obj.settings)) {
		throw new Error('La copia está incompleta o dañada.');
	}
	return {
		app: APP_ID,
		version: typeof obj.version === 'number' ? obj.version : FORMATO_BACKUP,
		schema: obj.schema,
		exportado: typeof obj.exportado === 'string' ? obj.exportado : '',
		jornadas: obj.jornadas.map(revivirJornada),
		settings: obj.settings.map(revivirSettings)
	};
}

function comoFecha(valor: unknown, campo: string): Date {
	const d = new Date(valor as string | number);
	if (Number.isNaN(d.getTime())) throw new Error(`Fecha inválida en la copia (${campo}).`);
	return d;
}

function revivirJornada(fila: unknown): Jornada {
	if (typeof fila !== 'object' || fila === null) throw new Error('Jornada inválida en la copia.');
	const j = fila as Record<string, unknown>;
	return {
		id: typeof j.id === 'number' ? j.id : undefined,
		start_time: comoFecha(j.start_time, 'start_time'),
		end_time: j.end_time == null ? null : comoFecha(j.end_time, 'end_time'),
		lat_start: (j.lat_start ?? null) as number | null,
		lng_start: (j.lng_start ?? null) as number | null,
		lat_end: (j.lat_end ?? null) as number | null,
		lng_end: (j.lng_end ?? null) as number | null,
		duration: (j.duration ?? null) as number | null,
		status: j.status === 'open' ? 'open' : 'closed',
		synced: j.synced === 1 ? 1 : 0
	};
}

function revivirSettings(fila: unknown): Settings {
	if (typeof fila !== 'object' || fila === null)
		throw new Error('Configuración inválida en la copia.');
	const s = fila as Record<string, unknown>;
	return {
		id: typeof s.id === 'number' ? s.id : undefined,
		fecha: comoFecha(s.fecha, 'fecha'),
		primer_dia_semana: Number(s.primer_dia_semana ?? 1),
		min_jornada_minutos: Number(s.min_jornada_minutos ?? 0),
		horas_semanales: Number(s.horas_semanales ?? 0),
		dias_laborables: Number(s.dias_laborables ?? 5),
		redondeo_minutos: Number(s.redondeo_minutos ?? 0)
	};
}
