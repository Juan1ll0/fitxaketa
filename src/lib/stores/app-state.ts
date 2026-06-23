import {
	db,
	createJornada,
	closeJornada,
	getOpenJornada,
	getAllJornadas,
	addSettingsSnapshot,
	getAllSettings,
	seedSettingsIfEmpty,
	type Jornada,
	type Settings
} from '$lib/db';
import { calcularHoy } from '$lib/utils/dashboard';
import { settingsActual } from '$lib/utils/settings';
import { appState, notificarCambio, type Periodo } from './app-state.svelte';
import { tick, startTimer, stopTimer } from './app-timer';

export async function cargarJornadas(): Promise<void> {
	appState.cargando = true;
	appState.jornadas = await getAllJornadas();
	const { hoy, resumen } = calcularHoy(appState.jornadas);
	appState.jornadasHoy = hoy;
	appState.resumenHoy = resumen;
	appState.cargando = false;
	notificarCambio();
}

export function setPeriodo(periodo: Periodo): void {
	appState.periodoSeleccionado = periodo;
	notificarCambio();
}

async function cargarSettings(): Promise<void> {
	appState.settings = await getAllSettings();
}

export async function guardarSettings(input: Omit<Settings, 'id'>): Promise<void> {
	await addSettingsSnapshot(input);
	await cargarSettings();
	notificarCambio();
}

export async function initAppState(): Promise<void> {
	await seedSettingsIfEmpty();
	await cargarSettings();
	const open: Jornada | undefined = await getOpenJornada();
	if (open && open.id != null) {
		appState.clockedIn = true;
		appState.openJornadaId = open.id;
		appState.startTime = open.start_time;
		startTimer();
		tick();
	} else {
		appState.clockedIn = false;
		appState.openJornadaId = null;
		appState.startTime = null;
		appState.elapsed = '00:00:00';
		stopTimer();
	}
	await cargarJornadas();
}

type Coords = { lat: number | null; lng: number | null };

function normalizarCoords(coords?: Coords): Coords {
	return { lat: coords?.lat ?? null, lng: coords?.lng ?? null };
}

function resetEstadoJornada(): void {
	appState.clockedIn = false;
	appState.openJornadaId = null;
	appState.startTime = null;
	appState.elapsed = '00:00:00';
}

export async function startJornada(coords?: Coords): Promise<void> {
	const { lat, lng } = normalizarCoords(coords);
	const id = await createJornada({ lat_start: lat, lng_start: lng });
	appState.clockedIn = true;
	appState.openJornadaId = id;
	appState.startTime = new Date();
	startTimer();
	tick();
	await cargarJornadas();
}

function minJornadaMinutos(): number {
	return appState.settings.length ? settingsActual(appState.settings).min_jornada_minutos : 0;
}

async function descartarJornada(id: number): Promise<void> {
	await db.jornadas.delete(id);
	resetEstadoJornada();
	await cargarJornadas();
}

/**
 * Cierra la jornada abierta. Si la duración real (sin redondeo) es menor que el
 * mínimo configurado, la **descarta** y devuelve `true`. `false` = guardada.
 */
export async function stopJornada(coords?: Coords): Promise<boolean> {
	const id = appState.openJornadaId;
	if (id == null) return false;
	stopTimer();
	const inicio = appState.startTime?.getTime() ?? Date.now();
	const min = minJornadaMinutos();
	if (min > 0 && (Date.now() - inicio) / 60000 < min) {
		await descartarJornada(id);
		return true;
	}
	await closeJornada(id, normalizarCoords(coords));
	resetEstadoJornada();
	await cargarJornadas();
	return false;
}

export {
	appState,
	notificarCambio,
	subscribe,
	getClockedIn,
	getElapsed,
	getJornadas,
	getSettings,
	getJornadasHoy,
	getResumenHoy,
	getPeriodoSeleccionado,
	type Periodo
} from './app-state.svelte';

export type { ResumenDia } from '$lib/utils/dashboard';
