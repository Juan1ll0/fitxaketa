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

export interface DatasetGrafica {
	label: string;
	data: number[];
	backgroundColor: string;
	jornadasPorLabel: (Jornada | Jornada[] | null)[];
}

export interface DatosGrafica {
	labels: string[];
	datasets: DatasetGrafica[];
}
