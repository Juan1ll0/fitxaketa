import type { Jornada } from '$lib/db';
import type { Periodo } from '$lib/stores/app-state';
import type { DatosGrafica, DatasetGrafica } from '$lib/utils/dashboard-types';
import { obtenerRangoPeriodo } from '$lib/utils/dashboard-periodo';

const NOMBRES_MES_CORTO = [
	'Ene',
	'Feb',
	'Mar',
	'Abr',
	'May',
	'Jun',
	'Jul',
	'Ago',
	'Sep',
	'Oct',
	'Nov',
	'Dic'
];

const COLOR_PRIMARIO = '#3b82f6';
const COLOR_EXITO = '#22c55e';
const COLORES_STACK = [COLOR_PRIMARIO, COLOR_EXITO];

function claveDia(fecha: Date): string {
	const year = fecha.getFullYear();
	const month = String(fecha.getMonth() + 1).padStart(2, '0');
	const day = String(fecha.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function etiquetaDia(fecha: Date, periodo: Periodo): string {
	const day = String(fecha.getDate()).padStart(2, '0');
	if (periodo === 'mes' || periodo === 'semana') {
		return day;
	}
	const month = String(fecha.getMonth() + 1).padStart(2, '0');
	return `${day}/${month}`;
}

function datosStacked(jornadas: Jornada[], periodo: Periodo): DatosGrafica {
	const hoy = new Date();
	hoy.setHours(0, 0, 0, 0);
	const { inicio, fin } = obtenerRangoPeriodo(periodo, hoy);

	const diasUnicos: string[] = [];
	const etiquetasDia = new Map<string, string>();
	const jornadasPorDia = new Map<string, Jornada[]>();

	const fechaActual = new Date(inicio);
	while (fechaActual.getTime() <= fin.getTime()) {
		const key = claveDia(fechaActual);
		diasUnicos.push(key);
		etiquetasDia.set(key, etiquetaDia(fechaActual, periodo));
		jornadasPorDia.set(key, []);
		fechaActual.setDate(fechaActual.getDate() + 1);
	}

	for (const jornada of jornadas) {
		const fecha = new Date(jornada.start_time);
		fecha.setHours(0, 0, 0, 0);
		const key = claveDia(fecha);
		if (jornadasPorDia.has(key)) {
			jornadasPorDia.get(key)!.push(jornada);
		}
	}

	const labels = diasUnicos.map((key) => etiquetasDia.get(key) ?? '');
	const maxJornadasPorDia = Math.max(
		...Array.from(jornadasPorDia.values()).map((arr) => arr.length),
		0
	);

	const datasets: DatasetGrafica[] = [];
	for (let i = 0; i < maxJornadasPorDia; i++) {
		const color = COLORES_STACK[i % COLORES_STACK.length];
		const data: number[] = [];
		const jornadasPorLabel: (Jornada | null)[] = [];

		for (const key of diasUnicos) {
			const lista = jornadasPorDia.get(key) ?? [];
			const jornada = lista[i] ?? null;
			data.push(jornada ? (jornada.duration ?? 0) / 60 : 0);
			jornadasPorLabel.push(jornada);
		}

		datasets.push({
			label: `Jornada ${i + 1}`,
			data,
			backgroundColor: color,
			jornadasPorLabel
		});
	}

	return { labels, datasets };
}

function datosPorMes(jornadas: Jornada[]): DatosGrafica {
	const porMes = new Map<number, Jornada[]>(Array.from({ length: 12 }, (_, i) => [i, []]));
	for (const jornada of jornadas) {
		const mes = new Date(jornada.start_time).getMonth();
		porMes.get(mes)!.push(jornada);
	}

	const labels = NOMBRES_MES_CORTO;
	const data: number[] = [];
	const jornadasPorLabel: Jornada[][] = [];

	for (let mes = 0; mes < 12; mes++) {
		const lista = porMes.get(mes) ?? [];
		data.push(lista.reduce((acc, j) => acc + (j.duration ?? 0), 0) / 60);
		jornadasPorLabel.push(lista);
	}

	return {
		labels,
		datasets: [
			{
				label: 'Horas',
				data,
				backgroundColor: COLOR_PRIMARIO,
				jornadasPorLabel
			}
		]
	};
}

export function prepararDatosGrafica(jornadas: Jornada[], periodo: Periodo): DatosGrafica {
	switch (periodo) {
		case 'año':
			return datosPorMes(jornadas);
		case 'semana':
		case 'mes':
		case 'trimestre':
			return datosStacked(jornadas, periodo);
	}
}
