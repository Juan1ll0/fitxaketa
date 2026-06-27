import type { Jornada, Settings } from '$lib/db';
import type { FiltroTemporal } from '$lib/utils/historial-filtros';
import { settingsActual } from '$lib/utils/settings';
import { claveDia, inicioSemana } from '$lib/utils/fecha-negocio';
import { balancePorDia } from '$lib/utils/dashboard-exceso';
import {
	crearWorkbook,
	escribirCabecera,
	escribirFilaTotal,
	escribirTitulo,
	guardarFichero
} from '$lib/utils/excel-wrapper';
import {
	determinarColumnas,
	escribirAgrupadoPorSemana,
	escribirGlobal,
	totalHorasGrupo
} from '$lib/utils/historial-export-filas';
import type { ContextoFilas } from '$lib/utils/historial-export-filas';

export interface ExportOptions {
	jornadas: Jornada[];
	snapshots: Settings[];
	filtro: FiltroTemporal;
}

const COLUMNA_TOTAL_DIA = 4;
const COLUMNA_BALANCE = 5;
const NOMBRES_MES = [
	'enero',
	'febrero',
	'marzo',
	'abril',
	'mayo',
	'junio',
	'julio',
	'agosto',
	'septiembre',
	'octubre',
	'noviembre',
	'diciembre'
];

/** ¿El filtro es un periodo de mes o año? (activa la columna "Total semana"). */
function esPeriodoMesOAnio(filtro: FiltroTemporal): boolean {
	return filtro.tipo === 'periodo' && (filtro.periodo === 'mes' || filtro.periodo === 'año');
}

/** Semana ISO 8601 de la fecha (1-53). */
function numeroSemanaISO(fecha: Date): number {
	const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
	d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
	const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil(((d.getTime() - inicio.getTime()) / 86_400_000 + 1) / 7);
}

/** Formato largo en español: "5 de junio de 2026". */
function fechaLarga(d: Date): string {
	return `${d.getDate()} de ${NOMBRES_MES[d.getMonth()]} de ${d.getFullYear()}`;
}

/**
 * Genera el fichero XLSX con las jornadas cerradas del filtro, ordenadas
 * ascendentemente. Columnas condicionales según contrato y periodo. Si hay
 * Total semana (mes/año con contrato) se agrupa por semanas; en otro caso se
 * agrupa por días. Una sola fila TOTAL al final. Si no hay jornadas cerradas,
 * no genera fichero.
 */
export async function exportarJornadas(options: ExportOptions): Promise<void> {
	const { jornadas, snapshots, filtro } = options;
	const settings = settingsActual(snapshots);
	const tieneContrato = settings.horas_semanales > 0 && settings.dias_laborables > 0;
	const tieneTotalSemana = tieneContrato && esPeriodoMesOAnio(filtro);
	const ctx: ContextoFilas = {
		snapshots,
		balances: new Map(),
		tieneContrato,
		tieneTotalSemana
	};

	const cerradas = jornadas.filter((j) => j.status === 'closed' && j.end_time != null);
	if (cerradas.length === 0) return;

	cerradas.sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
	ctx.balances = balancePorDia(cerradas, snapshots);

	const wb = crearWorkbook();
	const columnas = determinarColumnas(tieneContrato, tieneTotalSemana);
	escribirTitulo(wb, generarTitulo(filtro, settings.primer_dia_semana), columnas.length);
	escribirCabecera(wb, columnas);

	if (tieneTotalSemana) {
		escribirAgrupadoPorSemana(wb, cerradas, ctx, settings.primer_dia_semana);
	} else {
		escribirGlobal(wb, cerradas, ctx);
	}

	const columnaTotalIdx = tieneContrato ? COLUMNA_BALANCE : COLUMNA_TOTAL_DIA;
	escribirFilaTotal(wb, totalHorasGrupo(cerradas, snapshots), columnas.length, columnaTotalIdx);

	await guardarFichero(wb, generarNombreFichero());
}

/** Nombre del fichero: `jornadas_YYYYMMDDHHmmss.xlsx` con la hora local actual. */
function generarNombreFichero(): string {
	const d = new Date();
	const pad = (n: number): string => String(n).padStart(2, '0');
	const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
	return `jornadas_${ts}.xlsx`;
}

/** Descripción legible del filtro: "semana del 23 al 29 de junio de 2026", etc.
 *  Usado por el modal de confirmación (spec 007 AC-02).
 */
export function describirPeriodo(filtro: FiltroTemporal, primerDia: number): string {
	if (filtro.tipo === 'periodo') {
		const ref = filtro.fechaReferencia;
		if (filtro.periodo === 'año') return `año ${ref.getFullYear()}`;
		if (filtro.periodo === 'mes')
			return `mes de ${NOMBRES_MES[ref.getMonth()]} de ${ref.getFullYear()}`;
		const inicio = inicioSemana(ref, primerDia);
		const fin = new Date(inicio);
		fin.setDate(inicio.getDate() + 6);
		return `semana del ${inicio.getDate()} al ${fin.getDate()} de ${NOMBRES_MES[fin.getMonth()]} de ${fin.getFullYear()}`;
	}
	if (filtro.tipo === 'fecha') return `fecha ${fechaLarga(filtro.fecha)}`;
	const d = filtro.desde;
	const h = filtro.hasta;
	if (claveDia(d) === claveDia(h)) return `fecha ${fechaLarga(d)}`;
	return `rango del ${d.getDate()} al ${h.getDate()} de ${NOMBRES_MES[h.getMonth()]} de ${h.getFullYear()}`;
}

/** Título descriptivo del informe (fila 1 del XLSX). Variantes según el tipo de filtro. */
export function generarTitulo(filtro: FiltroTemporal, primerDia: number): string {
	if (filtro.tipo === 'periodo') {
		const ref = filtro.fechaReferencia;
		if (filtro.periodo === 'año') return `Informe anual - ${ref.getFullYear()}`;
		if (filtro.periodo === 'mes')
			return `Informe mensual - ${NOMBRES_MES[ref.getMonth()]} ${ref.getFullYear()}`;
		const inicio = inicioSemana(ref, primerDia);
		return `Informe personalizado - Semana ${numeroSemanaISO(inicio)} de ${NOMBRES_MES[inicio.getMonth()]} ${inicio.getFullYear()}`;
	}
	if (filtro.tipo === 'fecha') return `Informe personalizado - ${fechaLarga(filtro.fecha)}`;
	const d = filtro.desde;
	const h = filtro.hasta;
	if (claveDia(d) === claveDia(h)) return `Informe personalizado - ${fechaLarga(d)}`;
	return `Informe personalizado - ${d.getDate()} al ${h.getDate()} de ${NOMBRES_MES[d.getMonth()]} de ${d.getFullYear()}`;
}
