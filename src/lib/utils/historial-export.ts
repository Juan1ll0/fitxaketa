import type { Jornada, Settings } from '$lib/db';
import type { FiltroTemporal } from '$lib/utils/historial-filtros';
import { settingsActual } from '$lib/utils/settings';
import { claveDia, inicioSemana } from '$lib/utils/fecha-negocio';
import { balancePorDia } from '$lib/utils/dashboard-exceso';
import { crearWorkbook, escribirCabecera, guardarFichero } from '$lib/utils/excel-wrapper';
import {
	determinarColumnas,
	escribirAgrupadoPorMes,
	escribirAgrupadoPorSemana,
	escribirGlobal
} from '$lib/utils/historial-export-filas';
import type { ContextoFilas } from '$lib/utils/historial-export-filas';

export interface ExportOptions {
	jornadas: Jornada[];
	snapshots: Settings[];
	filtro: FiltroTemporal;
}

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

/**
 * Genera el fichero XLSX con las jornadas cerradas del filtro, ordenadas
 * ascendentemente, con resúmenes integrados por sub-periodo (año→mes,
 * mes→semana, otros→global). Si no hay jornadas cerradas, no genera fichero.
 */
export async function exportarJornadas(options: ExportOptions): Promise<void> {
	const { jornadas, snapshots, filtro } = options;
	const settings = settingsActual(snapshots);
	const ctx: ContextoFilas = {
		snapshots,
		balances: new Map(),
		tieneContrato: settings.horas_semanales > 0 && settings.dias_laborables > 0
	};

	const cerradas = jornadas.filter((j) => j.status === 'closed' && j.end_time != null);
	if (cerradas.length === 0) return;

	cerradas.sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
	ctx.balances = balancePorDia(cerradas, snapshots);

	const wb = crearWorkbook();
	escribirCabecera(wb, determinarColumnas(ctx.tieneContrato));

	if (filtro.tipo === 'periodo' && filtro.periodo === 'año') {
		escribirAgrupadoPorMes(wb, cerradas, ctx);
	} else if (filtro.tipo === 'periodo' && filtro.periodo === 'mes') {
		escribirAgrupadoPorSemana(wb, cerradas, ctx, settings.primer_dia_semana);
	} else {
		escribirGlobal(wb, cerradas, ctx);
	}

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
 *  Usado por el modal de confirmación en Fase 3 (spec 007 AC-02).
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
	if (filtro.tipo === 'fecha') {
		const f = filtro.fecha;
		return `fecha ${f.getDate()} de ${NOMBRES_MES[f.getMonth()]} de ${f.getFullYear()}`;
	}
	const d = filtro.desde;
	const h = filtro.hasta;
	if (claveDia(d) === claveDia(h))
		return `fecha ${d.getDate()} de ${NOMBRES_MES[d.getMonth()]} de ${d.getFullYear()}`;
	return `rango del ${d.getDate()} al ${h.getDate()} de ${NOMBRES_MES[h.getMonth()]} de ${h.getFullYear()}`;
}
