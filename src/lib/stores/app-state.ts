import { createJornada, closeJornada, getOpenJornada, getAllJornadas, type Jornada } from '$lib/db';
import { appState, notify, type Periodo, type ResumenDia } from './app-state.svelte';

let intervalId: ReturnType<typeof setInterval> | null = null;

function tick() {
	if (!appState.startTime) return;
	const diff = Date.now() - appState.startTime.getTime();
	const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
	const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
	const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
	appState.elapsed = `${h}:${m}:${s}`;
	notify();
}

function startTimer() {
	if (intervalId) clearInterval(intervalId);
	intervalId = setInterval(tick, 1000);
}

function stopTimer() {
	if (intervalId) clearInterval(intervalId);
	intervalId = null;
}

function calcularHoy(jornadas: Jornada[]): { hoy: Jornada[]; resumen: ResumenDia } {
	const hoy = new Date().toDateString();
	const filtradas = jornadas.filter((j) => new Date(j.start_time).toDateString() === hoy);
	const totalMinutos = filtradas.reduce(
		(acc, j) => acc + (j.duration ?? Math.floor((Date.now() - j.start_time.getTime()) / 60000)),
		0
	);
	return {
		hoy: filtradas,
		resumen: {
			totalHoras: Math.round((totalMinutos / 60) * 100) / 100,
			numeroJornadas: filtradas.length
		}
	};
}

export async function cargarJornadas(): Promise<void> {
	appState.cargando = true;
	appState.jornadas = await getAllJornadas();
	const { hoy, resumen } = calcularHoy(appState.jornadas);
	appState.jornadasHoy = hoy;
	appState.resumenHoy = resumen;
	appState.cargando = false;
	notify();
}

export function setPeriodo(periodo: Periodo): void {
	appState.periodoSeleccionado = periodo;
	notify();
}

export async function initAppState(): Promise<void> {
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

export async function startJornada(coords?: {
	lat: number | null;
	lng: number | null;
}): Promise<void> {
	const id = await createJornada({
		lat_start: coords?.lat,
		lng_start: coords?.lng
	});
	appState.clockedIn = true;
	appState.openJornadaId = id;
	appState.startTime = new Date();
	startTimer();
	tick();
	await cargarJornadas();
}

export async function stopJornada(coords?: {
	lat: number | null;
	lng: number | null;
}): Promise<void> {
	if (appState.openJornadaId == null) return;
	stopTimer();
	await closeJornada(appState.openJornadaId, {
		lat: coords?.lat ?? null,
		lng: coords?.lng ?? null
	});
	appState.clockedIn = false;
	appState.openJornadaId = null;
	appState.startTime = null;
	appState.elapsed = '00:00:00';
	await cargarJornadas();
}

export {
	appState,
	notificarCambio,
	subscribe,
	getClockedIn,
	getElapsed,
	getJornadas,
	getJornadasHoy,
	getResumenHoy,
	getPeriodoSeleccionado,
	type Periodo,
	type ResumenDia
} from './app-state.svelte';
