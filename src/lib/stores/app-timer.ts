import { appState, notificarCambio } from './app-state.svelte';

let intervalId: ReturnType<typeof setInterval> | null = null;

/** Actualiza `appState.elapsed` (HH:MM:SS) desde `startTime` y notifica. */
export function tick(): void {
	if (!appState.startTime) return;
	const diff = Date.now() - appState.startTime.getTime();
	const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
	const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
	const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
	appState.elapsed = `${h}:${m}:${s}`;
	notificarCambio();
}

export function startTimer(): void {
	if (intervalId) clearInterval(intervalId);
	intervalId = setInterval(tick, 1000);
}

export function stopTimer(): void {
	if (intervalId) clearInterval(intervalId);
	intervalId = null;
}
