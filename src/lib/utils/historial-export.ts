import type { Jornada, Settings } from '$lib/db';
import type { FiltroTemporal } from '$lib/utils/historial-filtros';
import type { TotalesFila } from '$lib/utils/excel-wrapper';
import { settingsActual } from '$lib/utils/settings';
import { balancePorDia } from '$lib/utils/dashboard-exceso';
import {
	crearWorkbook,
	escribirCabecera,
	escribirFilaTotal,
	escribirTitulo,
	guardarFichero
} from '$lib/utils/excel-wrapper';
import { calcularCierresPorPeriodo, tipoSubPeriodoDeFiltro } from '$lib/utils/export-agrupacion';
import {
	determinarColumnas,
	escribirJornadas,
	totalHorasGrupo
} from '$lib/utils/historial-export-filas';
import type { ContextoFilas } from '$lib/utils/historial-export-filas';
import { generarNombreFichero, generarTitulo } from '$lib/utils/historial-export-texto';

export interface ExportOptions {
	jornadas: Jornada[];
	snapshots: Settings[];
	filtro: FiltroTemporal;
}

export { describirPeriodo, generarTitulo } from '$lib/utils/historial-export-texto';

/**
 * Genera el fichero XLSX con las jornadas cerradas del filtro, ordenadas
 * ascendentemente. Si el periodo es mes/año con contrato, agrupa por semanas
 * (mes) o meses (año) y muestra totales y balances de sub-periodo. Una sola
 * fila TOTAL al final con sumatorios. Si no hay jornadas cerradas, no genera.
 */
export async function exportarJornadas(options: ExportOptions): Promise<void> {
	const { jornadas, snapshots, filtro } = options;
	const settings = settingsActual(snapshots);
	const tieneContrato = settings.horas_semanales > 0 && settings.dias_laborables > 0;
	const subPeriodo = tipoSubPeriodoDeFiltro(filtro);

	const cerradas = jornadas.filter((j) => j.status === 'closed' && j.end_time != null);
	if (cerradas.length === 0) return;

	cerradas.sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
	const balances = balancePorDia(cerradas, snapshots);
	const cierres = calcularCierresPorPeriodo({
		jornadas: cerradas,
		tipoSubPeriodo: subPeriodo,
		snapshots,
		balances,
		primerDiaSemana: settings.primer_dia_semana
	});

	const ctx: ContextoFilas = {
		snapshots,
		balances,
		tieneContrato,
		subPeriodo,
		cierres,
		primerDiaSemana: settings.primer_dia_semana
	};

	const wb = crearWorkbook();
	const columnas = determinarColumnas(tieneContrato, subPeriodo);
	escribirTitulo(wb, generarTitulo(filtro, settings.primer_dia_semana), columnas.length);
	escribirCabecera(wb, columnas);

	escribirJornadas(wb, cerradas, ctx);
	escribirFilaTotal(wb, calcularTotalesFila(cerradas, ctx), columnas.length);

	await guardarFichero(wb, generarNombreFichero());
}

/** Suma totales y balances para la fila TOTAL final. */
function calcularTotalesFila(cerradas: Jornada[], ctx: ContextoFilas): TotalesFila {
	const totalDia = totalHorasGrupo(cerradas, ctx.snapshots);
	const balanceDiario = ctx.tieneContrato
		? [...ctx.balances.values()].reduce((acc, b) => acc + b.balance / 60, 0)
		: null;
	let totalPeriodo: number | null = null;
	let balancePeriodo: number | null = null;
	if (ctx.subPeriodo !== 'ninguno') {
		totalPeriodo = 0;
		if (ctx.tieneContrato) balancePeriodo = 0;
		for (const c of ctx.cierres?.values() ?? []) {
			totalPeriodo += c.total;
			if (ctx.tieneContrato && balancePeriodo !== null) balancePeriodo += c.balance;
		}
	}
	return { totalDia, balanceDiario, totalPeriodo, balancePeriodo };
}
