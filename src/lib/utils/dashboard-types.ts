import type { Jornada } from '$lib/db';

export interface ResumenDia {
	totalHoras: number;
	totalJornadas: number;
}

export interface ResumenPeriodo {
	totalHoras: number; // duración efectiva (con redondeo)
	totalHorasReal: number; // suma de jornada.duration (sin redondeo)
	mediaDiaria: number;
	diasTrabajados: number;
	totalJornadas: number;
	balanceMinutos: number; // con signo (= calcularBalancePeriodo)
}

/** Balance de un día (minutos). `balance` con signo = trabajado − objetivo. */
export interface BalanceDia {
	claveDia: string;
	trabajado: number;
	objetivo: number;
	balance: number;
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
	balancePorLabel?: number[]; // por día/categoría del eje X (minutos, con signo)
	objetivoDiarioPorLabel?: number[]; // por día/categoría del eje X (horas)
}
