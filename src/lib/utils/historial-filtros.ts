import type { Periodo } from '$lib/stores/app-state';
import type { Jornada } from '$lib/db';
import { filtrarPorPeriodo } from '$lib/utils/dashboard';
import { inicioDia, mismoDia } from '$lib/utils/fecha-negocio';

export type FiltroTemporal =
	| { tipo: 'periodo'; periodo: Periodo; fechaReferencia: Date }
	| { tipo: 'fecha'; fecha: Date }
	| { tipo: 'rango'; desde: Date; hasta: Date };

export type FiltroEstado = 'todas' | 'abiertas' | 'cerradas';

export type FiltrarPorFecha = (jornadas: Jornada[], fecha: Date) => Jornada[];
export type FiltrarPorRango = (jornadas: Jornada[], desde: Date, hasta: Date) => Jornada[];
export type FiltrarPorEstado = (jornadas: Jornada[], estado: FiltroEstado) => Jornada[];
export type AplicarFiltroTemporal = (
	jornadas: Jornada[],
	filtro: FiltroTemporal,
	primerDiaSemana?: number
) => Jornada[];

/** Convierte 'YYYY-MM-DD' a Date en hora local, evitando desplazamientos UTC. */
export function parseFechaLocal(yyyyMmDd: string): Date {
	const [y, m, d] = yyyyMmDd.split('-').map(Number);
	return new Date(y, m - 1, d);
}

export const filtrarPorFecha: FiltrarPorFecha = (jornadas, fecha) =>
	jornadas.filter((jornada) => mismoDia(jornada.start_time, fecha));

export const filtrarPorRango: FiltrarPorRango = (jornadas, desde, hasta) => {
	const ini = inicioDia(desde);
	const fin = inicioDia(hasta);
	fin.setDate(fin.getDate() + 1);
	return jornadas.filter((jornada) => jornada.start_time >= ini && jornada.start_time < fin);
};

export const filtrarPorEstado: FiltrarPorEstado = (jornadas, estado) => {
	if (estado === 'todas') return jornadas;
	const esperado = estado === 'abiertas' ? 'open' : 'closed';
	return jornadas.filter((jornada) => jornada.status === esperado);
};

export const aplicarFiltroTemporal: AplicarFiltroTemporal = (jornadas, filtro, primerDiaSemana) => {
	switch (filtro.tipo) {
		case 'periodo':
			return filtrarPorPeriodo(
				jornadas,
				filtro.periodo,
				primerDiaSemana ?? 1,
				filtro.fechaReferencia
			);
		case 'fecha':
			return filtrarPorFecha(jornadas, filtro.fecha);
		case 'rango':
			return filtrarPorRango(jornadas, filtro.desde, filtro.hasta);
	}
};
