import { createJornada, closeJornada, getOpenJornada, type Jornada } from '$lib/db';

type Listener = () => void;

let clockedIn = false;
let openJornadaId: number | null = null;
let startTime: Date | null = null;
let elapsed = '00:00:00';
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<Listener>();

function notify() {
	listeners.forEach((fn) => fn());
}

function tick() {
	if (!startTime) return;
	const diff = Date.now() - startTime.getTime();
	const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
	const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
	const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
	elapsed = `${h}:${m}:${s}`;
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

export async function initAppState(): Promise<void> {
	const open: Jornada | undefined = await getOpenJornada();
	if (open && open.id != null) {
		clockedIn = true;
		openJornadaId = open.id;
		startTime = open.start_time;
		startTimer();
		tick();
	} else {
		clockedIn = false;
		openJornadaId = null;
		startTime = null;
		elapsed = '00:00:00';
		stopTimer();
	}
	notify();
}

export async function startJornada(coords?: {
	lat: number | null;
	lng: number | null;
}): Promise<void> {
	const id = await createJornada({
		lat_start: coords?.lat,
		lng_start: coords?.lng
	});
	clockedIn = true;
	openJornadaId = id;
	startTime = new Date();
	startTimer();
	tick();
	notify();
}

export async function stopJornada(coords?: {
	lat: number | null;
	lng: number | null;
}): Promise<void> {
	if (openJornadaId == null) return;
	stopTimer();
	await closeJornada(openJornadaId, { lat: coords?.lat ?? null, lng: coords?.lng ?? null });
	clockedIn = false;
	openJornadaId = null;
	startTime = null;
	elapsed = '00:00:00';
	notify();
}

export function subscribe(fn: Listener): () => void {
	listeners.add(fn);
	fn();
	return () => listeners.delete(fn);
}

export function getClockedIn(): boolean {
	return clockedIn;
}

export function getElapsed(): string {
	return elapsed;
}
