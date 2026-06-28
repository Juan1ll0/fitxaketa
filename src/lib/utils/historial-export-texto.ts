import type { FiltroTemporal } from '$lib/utils/historial-filtros';
import { claveDia, inicioSemana } from '$lib/utils/fecha-negocio';

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

function fechaLarga(d: Date): string {
	return `${d.getDate()} de ${NOMBRES_MES[d.getMonth()]} de ${d.getFullYear()}`;
}

function numeroSemanaISO(fecha: Date): number {
	const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
	d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
	const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil(((d.getTime() - inicio.getTime()) / 86_400_000 + 1) / 7);
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

/** Nombre del fichero: `jornadas_YYYYMMDDHHmmss.xlsx` con la hora local actual. */
export function generarNombreFichero(): string {
	const d = new Date();
	const pad = (n: number): string => String(n).padStart(2, '0');
	const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
	return `jornadas_${ts}.xlsx`;
}
