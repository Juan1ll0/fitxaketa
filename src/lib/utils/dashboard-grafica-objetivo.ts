import type { Jornada, Settings } from '$lib/db';
import type { DatasetGrafica } from '$lib/utils/dashboard-types';
import { duracionEfectivaMinutos } from '$lib/utils/redondeo';
import { objetivoDiarioMinutos } from '$lib/utils/settings';

const COLORES_STACK = ['#3b82f6', '#22c55e'];

/** Datasets apilados (una barra por jornada del día), con duración efectiva en horas. */
export function construirDatasetsApilados(
	diasUnicos: string[],
	jornadasPorDia: Map<string, Jornada[]>,
	snapshots: Settings[]
): DatasetGrafica[] {
	const max = Math.max(...Array.from(jornadasPorDia.values(), (a) => a.length), 0);
	const datasets: DatasetGrafica[] = [];
	for (let i = 0; i < max; i++) {
		const data: number[] = [];
		const jornadasPorLabel: (Jornada | null)[] = [];
		for (const key of diasUnicos) {
			const jornada = (jornadasPorDia.get(key) ?? [])[i] ?? null;
			data.push(jornada ? duracionEfectivaMinutos(jornada, snapshots) / 60 : 0);
			jornadasPorLabel.push(jornada);
		}
		datasets.push({
			label: `Jornada ${i + 1}`,
			data,
			backgroundColor: COLORES_STACK[i % COLORES_STACK.length],
			jornadasPorLabel
		});
	}
	return datasets;
}

/**
 * Para cada día del eje X (en el orden de `diasUnicos`, claves 'YYYY-MM-DD' a
 * 00:00 local), calcula el objetivo diario (en **horas**) y el balance del día
 * (en **minutos, con signo**): Σ duración efectiva de las jornadas del día −
 * objetivo vigente de ese día. El objetivo usa el snapshot vigente del día.
 */
export function objetivoYBalancePorLabel(
	diasUnicos: string[],
	fechasPorDia: Map<string, Date>,
	jornadasPorDia: Map<string, Jornada[]>,
	snapshots: Settings[]
): { objetivoDiarioPorLabel: number[]; balancePorLabel: number[] } {
	const objetivoDiarioPorLabel: number[] = [];
	const balancePorLabel: number[] = [];

	for (const key of diasUnicos) {
		const fecha = fechasPorDia.get(key) ?? new Date(key);
		const objetivoMin = objetivoDiarioMinutos(snapshots, fecha);
		const lista = jornadasPorDia.get(key) ?? [];
		const trabajado = lista.reduce((acc, j) => acc + duracionEfectivaMinutos(j, snapshots), 0);

		objetivoDiarioPorLabel.push(objetivoMin / 60);
		balancePorLabel.push(trabajado - objetivoMin);
	}

	return { objetivoDiarioPorLabel, balancePorLabel };
}
