import { getOpenJornada } from '$lib/db';
import {
	borrarJornada,
	borrarJornadasEnRango,
	borrarTodosLosSettings,
	resetDeFabrica
} from '$lib/db-borrado';
import { stopTimer } from './app-timer';
import { notificarCambio } from './app-state.svelte';
import { cargarJornadas, cargarSettings, resetEstadoJornada } from './app-state';

/**
 * Tras borrar jornadas: si la jornada abierta cayó en el borrado, vuelve al
 * estado inactivo. Refresca listas/resumen (notifica reactividad).
 */
async function trasBorrarJornadas(): Promise<void> {
	const open = await getOpenJornada();
	if (!open || open.id == null) {
		stopTimer();
		resetEstadoJornada();
	}
	await cargarJornadas();
}

export async function borrarRango(desde: Date, hasta: Date): Promise<void> {
	await borrarJornadasEnRango(desde, hasta);
	await trasBorrarJornadas();
}

export async function borrarJornadaPorId(id: number): Promise<void> {
	await borrarJornada(id);
	await trasBorrarJornadas();
}

export async function borrarSoloSettings(): Promise<void> {
	await borrarTodosLosSettings();
	await cargarSettings();
	notificarCambio();
}

export async function resetFabrica(): Promise<void> {
	await resetDeFabrica();
	stopTimer();
	resetEstadoJornada();
	await cargarSettings();
	await cargarJornadas();
}
