import type { Jornada, Settings } from '$lib/db';
import type { ResumenDia, ResumenPeriodo } from '$lib/utils/dashboard-types';
import { inicioDia, diaDeJornada, mismoDia } from '$lib/utils/fecha-negocio';
import { duracionEfectivaMinutos } from '$lib/utils/redondeo';
import { calcularBalancePeriodo } from '$lib/utils/dashboard-exceso';

export function calcularResumenDia(jornadas: Jornada[]): ResumenDia {
	const totalMinutos = jornadas.reduce((acc, jornada) => acc + (jornada.duration ?? 0), 0);
	return {
		totalHoras: totalMinutos / 60,
		totalJornadas: jornadas.length
	};
}

/** Jornadas de hoy (por fecha de inicio) y su resumen, incluyendo la abierta en curso. */
export function calcularHoy(jornadas: Jornada[]): { hoy: Jornada[]; resumen: ResumenDia } {
	const ahora = new Date();
	const filtradas = jornadas.filter((j) => mismoDia(diaDeJornada(j), ahora));
	const resumenCerradas = calcularResumenDia(filtradas.filter((j) => j.status === 'closed'));
	const abierta = filtradas.find((j) => j.status === 'open');
	const minutosAbierta = abierta
		? Math.floor((Date.now() - abierta.start_time.getTime()) / 60000)
		: 0;
	const totalHoras =
		Math.round(((resumenCerradas.totalHoras * 60 + minutosAbierta) / 60) * 100) / 100;
	return {
		hoy: filtradas,
		resumen: { totalHoras, totalJornadas: resumenCerradas.totalJornadas + (abierta ? 1 : 0) }
	};
}

export function agruparPorDia(jornadas: Jornada[]): Map<string, Jornada[]> {
	const jornadasOrdenadas = [...jornadas].sort(
		(a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
	);

	const grupos = new Map<string, Jornada[]>();
	const hoy = inicioDia(new Date());
	const ayer = new Date(hoy);
	ayer.setDate(ayer.getDate() - 1);

	for (const jornada of jornadasOrdenadas) {
		const fecha = diaDeJornada(jornada);

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

export function calcularResumenPeriodo(
	jornadas: Jornada[],
	snapshots: Settings[] = []
): ResumenPeriodo {
	if (jornadas.length === 0)
		return {
			totalHoras: 0,
			totalHorasReal: 0,
			mediaDiaria: 0,
			diasTrabajados: 0,
			totalJornadas: 0,
			balanceMinutos: 0
		};

	const cerradas = jornadas.filter((j) => j.status === 'closed');

	// Total efectivo (con redondeo): cuadra con la suma de las barras.
	const totalMinutos = cerradas.reduce((acc, j) => acc + duracionEfectivaMinutos(j, snapshots), 0);
	// Total real (sin redondeo): para el secundario en gris.
	const totalMinutosReal = cerradas.reduce((acc, j) => acc + (j.duration ?? 0), 0);

	const diasTrabajados = new Set(cerradas.map((j) => diaDeJornada(j).getTime())).size;
	const totalHoras = totalMinutos / 60;

	return {
		totalHoras,
		totalHorasReal: totalMinutosReal / 60,
		mediaDiaria: diasTrabajados > 0 ? totalHoras / diasTrabajados : 0,
		diasTrabajados,
		totalJornadas: jornadas.length,
		balanceMinutos: calcularBalancePeriodo(jornadas, snapshots)
	};
}
