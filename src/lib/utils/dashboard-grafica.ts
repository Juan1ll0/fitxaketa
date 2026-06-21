import type { Jornada } from '$lib/db';
import type { Periodo } from '$lib/stores/app-state';
import type { BarraGrafica } from '$lib/utils/dashboard-types';

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

function claveDia(fecha: Date): string {
	const year = fecha.getFullYear();
	const month = String(fecha.getMonth() + 1).padStart(2, '0');
	const day = String(fecha.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function etiquetaDia(fecha: Date): string {
	const month = String(fecha.getMonth() + 1).padStart(2, '0');
	const day = String(fecha.getDate()).padStart(2, '0');
	return `${day}/${month}`;
}

function barrasPorJornada(jornadas: Jornada[]): BarraGrafica[] {
	const ordenadas = [...jornadas].sort(
		(a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
	);
	const conteoPorDia = new Map<string, number>();

	return ordenadas.map((jornada) => {
		const fecha = new Date(jornada.start_time);
		const key = claveDia(fecha);
		const ordenDelDia = (conteoPorDia.get(key) ?? 0) + 1;
		conteoPorDia.set(key, ordenDelDia);

		return {
			label: etiquetaDia(fecha),
			valor: (jornada.duration ?? 0) / 60,
			color: ordenDelDia === 1 ? COLOR_PRIMARIO : COLOR_EXITO,
			jornadas: [jornada]
		};
	});
}

function barrasPorMes(jornadas: Jornada[]): BarraGrafica[] {
	const porMes = new Map<number, Jornada[]>();

	for (const jornada of jornadas) {
		const mes = new Date(jornada.start_time).getMonth();
		if (!porMes.has(mes)) porMes.set(mes, []);
		porMes.get(mes)!.push(jornada);
	}

	return Array.from(porMes.entries())
		.sort(([a], [b]) => a - b)
		.map(([mes, lista]) => ({
			label: NOMBRES_MES_CORTO[mes] ?? '',
			valor: lista.reduce((acc, jornada) => acc + (jornada.duration ?? 0), 0) / 60,
			color: COLOR_PRIMARIO,
			jornadas: lista
		}));
}

export function prepararDatosGrafica(jornadas: Jornada[], periodo: Periodo): BarraGrafica[] {
	switch (periodo) {
		case 'año':
			return barrasPorMes(jornadas);
		case 'semana':
		case 'mes':
		case 'trimestre':
			return barrasPorJornada(jornadas);
	}
}
