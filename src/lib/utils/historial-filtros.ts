import type { Periodo } from '$lib/stores/app-state';
import type { Jornada } from '$lib/db';

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
