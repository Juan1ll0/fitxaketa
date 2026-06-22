import type { Jornada, Settings } from '$lib/db';
import type { Periodo } from '$lib/stores/app-state';
import type { DatosGrafica } from '$lib/utils/dashboard-types';
import { obtenerRangoPeriodo } from '$lib/utils/dashboard-periodo';
import { inicioDia, claveDia, diaDeJornada } from '$lib/utils/fecha-negocio';
import { duracionEfectivaMinutos } from '$lib/utils/redondeo';
import { settingsActual } from '$lib/utils/settings';
import {
	objetivoYBalancePorLabel,
	construirDatasetsApilados
} from '$lib/utils/dashboard-grafica-objetivo';

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

function etiquetaDia(fecha: Date, periodo: Periodo): string {
	const day = String(fecha.getDate()).padStart(2, '0');
	if (periodo === 'mes' || periodo === 'semana') {
		return day;
	}
	const month = String(fecha.getMonth() + 1).padStart(2, '0');
	return `${day}/${month}`;
}

function datosStacked(jornadas: Jornada[], periodo: Periodo, snapshots: Settings[]): DatosGrafica {
	const hoy = inicioDia(new Date());
	const primerDia = settingsActual(snapshots).primer_dia_semana;
	const { inicio, fin } = obtenerRangoPeriodo(periodo, hoy, primerDia);

	const diasUnicos: string[] = [];
	const etiquetasDia = new Map<string, string>();
	const fechasPorDia = new Map<string, Date>();
	const jornadasPorDia = new Map<string, Jornada[]>();

	const fechaActual = new Date(inicio);
	while (fechaActual.getTime() <= fin.getTime()) {
		const key = claveDia(fechaActual);
		diasUnicos.push(key);
		etiquetasDia.set(key, etiquetaDia(fechaActual, periodo));
		fechasPorDia.set(key, new Date(fechaActual));
		jornadasPorDia.set(key, []);
		fechaActual.setDate(fechaActual.getDate() + 1);
	}

	for (const jornada of jornadas) {
		const key = claveDia(diaDeJornada(jornada));
		if (jornadasPorDia.has(key)) {
			jornadasPorDia.get(key)!.push(jornada);
		}
	}

	const labels = diasUnicos.map((key) => etiquetasDia.get(key) ?? '');
	const datasets = construirDatasetsApilados(diasUnicos, jornadasPorDia, snapshots);

	const { objetivoDiarioPorLabel, balancePorLabel } = objetivoYBalancePorLabel(
		diasUnicos,
		fechasPorDia,
		jornadasPorDia,
		snapshots
	);

	return { labels, datasets, objetivoDiarioPorLabel, balancePorLabel };
}

function datosPorMes(jornadas: Jornada[], snapshots: Settings[]): DatosGrafica {
	const porMes = new Map<number, Jornada[]>(Array.from({ length: 12 }, (_, i) => [i, []]));
	for (const jornada of jornadas) {
		const mes = diaDeJornada(jornada).getMonth();
		porMes.get(mes)!.push(jornada);
	}

	const labels = NOMBRES_MES_CORTO;
	const data: number[] = [];
	const jornadasPorLabel: Jornada[][] = [];

	for (let mes = 0; mes < 12; mes++) {
		const lista = porMes.get(mes) ?? [];
		data.push(lista.reduce((acc, j) => acc + duracionEfectivaMinutos(j, snapshots), 0) / 60);
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

export function prepararDatosGrafica(
	jornadas: Jornada[],
	periodo: Periodo,
	snapshots: Settings[] = []
): DatosGrafica {
	switch (periodo) {
		case 'año':
			return datosPorMes(jornadas, snapshots);
		case 'semana':
		case 'mes':
		case 'trimestre':
			return datosStacked(jornadas, periodo, snapshots);
	}
}
