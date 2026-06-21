import type { Jornada } from '$lib/db';

export interface ResumenDia {
	totalHoras: number;
	totalJornadas: number;
}

export interface ResumenPeriodo {
	totalHoras: number;
	mediaDiaria: number;
	diasTrabajados: number;
	totalJornadas: number;
}

export interface BarraGrafica {
	label: string;
	valor: number;
	color: string;
	jornadas: Jornada[];
}
