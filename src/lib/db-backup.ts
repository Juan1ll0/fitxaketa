import { db, getAllJornadas, type Jornada, type Settings } from '$lib/db';
import { getAllSettings, seedSettingsIfEmpty } from '$lib/db-settings';
import type { BackupData } from '$lib/utils/backup';

/** Lee TODA la base (ambas tablas) para exportar. */
export async function exportarDatos(): Promise<{ jornadas: Jornada[]; settings: Settings[] }> {
	const [jornadas, settings] = await Promise.all([getAllJornadas(), getAllSettings()]);
	return { jornadas, settings };
}

/**
 * **Reemplaza** la base por la del backup, de forma transaccional (todo o nada): vacía
 * ambas tablas y reinserta las filas del fichero conservando sus `id`. Si el backup no
 * trae settings, re-siembra el snapshot por defecto para que `settingsVigente()` siempre
 * encuentre uno.
 */
export async function importarDatos(data: BackupData): Promise<void> {
	await db.transaction('rw', db.jornadas, db.settings, async () => {
		await db.jornadas.clear();
		await db.settings.clear();
		if (data.jornadas.length > 0) await db.jornadas.bulkAdd(data.jornadas);
		if (data.settings.length > 0) await db.settings.bulkAdd(data.settings);
	});
	await seedSettingsIfEmpty();
}
