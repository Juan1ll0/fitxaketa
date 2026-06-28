import { db } from '$lib/db';
import { seedSettingsIfEmpty } from '$lib/db-settings';

/**
 * Borra las jornadas cuyo `start_time` cae en `[desde, hasta)`. Como la
 * atribución de jornada (`diaDeJornada`) deriva del `start_time`, el corte por
 * `start_time` es equivalente a cortar por día de atribución. Devuelve el nº
 * de jornadas borradas.
 */
export async function borrarJornadasEnRango(desde: Date, hasta: Date): Promise<number> {
	return await db.jornadas.where('start_time').between(desde, hasta, true, false).delete();
}

export async function borrarJornada(id: number): Promise<void> {
	await db.jornadas.delete(id);
}

/** Vacía la configuración y vuelve a sembrar el snapshot por defecto (003.5). */
export async function borrarTodosLosSettings(): Promise<void> {
	await db.settings.clear();
	await seedSettingsIfEmpty();
}

/** Reseteo de fábrica: borra jornadas y configuración; re-siembra el default. */
export async function resetDeFabrica(): Promise<void> {
	await db.jornadas.clear();
	await db.settings.clear();
	await seedSettingsIfEmpty();
}
