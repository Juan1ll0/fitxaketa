import type { Jornada } from '$lib/db';
import type { ResumenDia, ResumenPeriodo } from '$lib/utils/dashboard-types';

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

export function calcularResumenPeriodo(jornadas: Jornada[]): ResumenPeriodo {
	if (jornadas.length === 0)
		return { totalHoras: 0, mediaDiaria: 0, diasTrabajados: 0, totalJornadas: 0 };

	const totalMinutos = jornadas.reduce((acc, jornada) => acc + (jornada.duration ?? 0), 0);
	const diasTrabajados = new Set(
		jornadas.map((jornada) => {
			const fecha = new Date(jornada.start_time);
			fecha.setHours(0, 0, 0, 0);
			return fecha.getTime();
		})
	).size;
	const totalHoras = totalMinutos / 60;

	return {
		totalHoras,
		mediaDiaria: diasTrabajados > 0 ? totalHoras / diasTrabajados : 0,
		diasTrabajados,
		totalJornadas: jornadas.length
	};
}
