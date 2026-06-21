import type { Jornada } from '$lib/db';

export interface ResumenDia {
	totalHoras: number;
	totalJornadas: number;
}

export function formatearFecha(date: Date): string {
	return new Intl.DateTimeFormat('es-ES', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}).format(date);
}

export function calcularResumenDia(jornadas: Jornada[]): ResumenDia {
	const totalMinutos = jornadas.reduce((acc, jornada) => acc + (jornada.duration ?? 0), 0);
	return {
		totalHoras: totalMinutos / 60,
		totalJornadas: jornadas.length
	};
}
