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

export function agruparPorDia(jornadas: Jornada[]): Map<string, Jornada[]> {
	const jornadasOrdenadas = [...jornadas].sort(
		(a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
	);

	const grupos = new Map<string, Jornada[]>();
	const hoy = new Date();
	hoy.setHours(0, 0, 0, 0);
	const ayer = new Date(hoy);
	ayer.setDate(ayer.getDate() - 1);

	for (const jornada of jornadasOrdenadas) {
		const fecha = new Date(jornada.start_time);
		fecha.setHours(0, 0, 0, 0);

		let key: string;
		if (fecha.getTime() === hoy.getTime()) {
			key = 'Hoy';
		} else if (fecha.getTime() === ayer.getTime()) {
			key = 'Ayer';
		} else {
			key = new Intl.DateTimeFormat('es-ES', {
				day: '2-digit',
				month: 'short',
				year: 'numeric'
			}).format(fecha);
		}

		if (!grupos.has(key)) grupos.set(key, []);
		grupos.get(key)!.push(jornada);
	}

	return grupos;
}

export function formatearHora(date: Date): string {
	return new Intl.DateTimeFormat('es-ES', {
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

export function formatearDuracion(minutos: number | null): string {
	if (minutos === null) return 'En curso';
	const h = Math.floor(minutos / 60);
	const m = minutos % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}
