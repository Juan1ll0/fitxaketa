import type { Jornada } from '$lib/db';
import type { ResumenDia } from '$lib/utils/dashboard';

export type Periodo = 'semana' | 'mes' | 'trimestre' | 'año';

type Listener = () => void;

const listeners: Listener[] = [];

export const appState = $state({
	clockedIn: false,
	openJornadaId: null as number | null,
	startTime: null as Date | null,
	elapsed: '00:00:00',
	jornadas: [] as Jornada[],
	jornadasHoy: [] as Jornada[],
	resumenHoy: { totalHoras: 0, totalJornadas: 0 } as ResumenDia,
	periodoSeleccionado: 'mes' as Periodo,
	cargando: false
});

export function notificarCambio(): void {
	listeners.forEach((fn) => fn());
}

export function subscribe(fn: Listener): () => void {
	listeners.push(fn);
	fn();
	return () => {
		const index = listeners.indexOf(fn);
		if (index > -1) listeners.splice(index, 1);
	};
}

export function getClockedIn(): boolean {
	return appState.clockedIn;
}

export function getElapsed(): string {
	return appState.elapsed;
}

export function getJornadas(): Jornada[] {
	return appState.jornadas;
}

export function getJornadasHoy(): Jornada[] {
	return appState.jornadasHoy;
}

export function getResumenHoy(): ResumenDia {
	return appState.resumenHoy;
}

export function getPeriodoSeleccionado(): Periodo {
	return appState.periodoSeleccionado;
}
