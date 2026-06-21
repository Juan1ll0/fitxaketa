import type { Jornada } from '$lib/db';
import type { Periodo } from '$lib/stores/app-state';

function obtenerRangoPeriodo(periodo: Periodo, hoy: Date): { inicio: Date; fin: Date } {
	const inicio = new Date(hoy);
	const fin = new Date(hoy);

	switch (periodo) {
		case 'semana': {
			const diaSemana = hoy.getDay();
			const diasDesdeLunes = (diaSemana + 6) % 7;
			inicio.setDate(hoy.getDate() - diasDesdeLunes);
			fin.setDate(inicio.getDate() + 6);
			break;
		}
		case 'mes': {
			inicio.setDate(1);
			fin.setMonth(hoy.getMonth() + 1, 0);
			break;
		}
		case 'año': {
			inicio.setMonth(0, 1);
			fin.setMonth(11, 31);
			break;
		}
		case 'trimestre': {
			inicio.setMonth(hoy.getMonth() - 3);
			break;
		}
	}

	inicio.setHours(0, 0, 0, 0);
	fin.setHours(0, 0, 0, 0);
	return { inicio, fin };
}

export function filtrarPorPeriodo(jornadas: Jornada[], periodo: Periodo): Jornada[] {
	const hoy = new Date();
	hoy.setHours(0, 0, 0, 0);
	const { inicio, fin } = obtenerRangoPeriodo(periodo, hoy);

	return jornadas.filter((jornada) => {
		if (jornada.status !== 'closed') return false;
		const fecha = new Date(jornada.start_time);
		fecha.setHours(0, 0, 0, 0);
		return fecha.getTime() >= inicio.getTime() && fecha.getTime() <= fin.getTime();
	});
}
