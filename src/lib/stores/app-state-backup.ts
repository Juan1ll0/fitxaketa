import { getOpenJornada } from '$lib/db';
import { exportarDatos, importarDatos } from '$lib/db-backup';
import { serializarBackup, parsearBackup } from '$lib/utils/backup';
import { entregarFichero } from '$lib/utils/compartir';
import { stopTimer } from './app-timer';
import { notificarCambio } from './app-state.svelte';
import { cargarJornadas, cargarSettings, resetEstadoJornada } from './app-state';

const MIME_JSON = 'application/json';

/** Nombre del fichero: `fitxaketa-backup-YYYYMMDDHHmmss.json` con la hora local actual. */
function nombreBackup(): string {
	const d = new Date();
	const pad = (n: number): string => String(n).padStart(2, '0');
	const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
	return `fitxaketa-backup-${ts}.json`;
}

/** Exporta toda la base y la entrega (hoja de compartir en móvil / descarga en su defecto). */
export async function exportarCopia(): Promise<void> {
	const { jornadas, settings } = await exportarDatos();
	const json = serializarBackup(jornadas, settings);
	await entregarFichero(nombreBackup(), json, MIME_JSON);
}

/**
 * Importa (reemplaza) desde el texto de un fichero de backup y recarga el estado
 * reactivo. `parsearBackup` valida y lanza si el fichero es inválido: en ese caso NO
 * se toca la base. Si la jornada abierta desaparece tras el reemplazo, el estado de
 * fichaje vuelve a inactivo.
 */
export async function importarCopia(texto: string): Promise<void> {
	const data = parsearBackup(texto);
	await importarDatos(data);
	const open = await getOpenJornada();
	if (!open || open.id == null) {
		stopTimer();
		resetEstadoJornada();
	}
	await cargarSettings();
	await cargarJornadas();
	notificarCambio();
}
