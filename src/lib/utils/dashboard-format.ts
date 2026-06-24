import type { Periodo } from '$lib/stores/app-state';
import { inicioSemana, PRIMER_DIA_SEMANA } from '$lib/utils/fecha-negocio';

export function formatearFecha(date: Date): string {
	return new Intl.DateTimeFormat('es-ES', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}).format(date);
}

export function formatearFechaLarga(date: Date): string {
	const formatter = new Intl.DateTimeFormat('es-ES', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
	return formatter
		.formatToParts(date)
		.map((part) =>
			part.type === 'month'
				? `${part.value.charAt(0).toUpperCase()}${part.value.slice(1)}`
				: part.value
		)
		.join('');
}

export function formatearHora(date: Date): string {
	return new Intl.DateTimeFormat('es-ES', {
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

export function formatearDuracion(minutos: number | null): string {
	if (minutos === null) return 'En curso';
	const h = Math.floor(minutos / 60);
	const m = minutos % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatearHorasDecimal(horas: number): string {
	const totalMinutos = Math.round(horas * 60);
	const h = Math.floor(totalMinutos / 60);
	const m = totalMinutos % 60;
	return `${h}h ${m}m`;
}

export function formatearHorasCorto(horas: number): string {
	const redondeado = Math.round(horas * 10) / 10;
	if (Number.isInteger(redondeado)) return `${redondeado}h`;
	return `${redondeado.toFixed(1).replace('.', ',')}h`;
}

function capitalizar(texto: string): string {
	return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;
}

function mesCorto(fecha: Date): string {
	const mes = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(fecha);
	return mes.replace('.', '');
}

function formatoIndicadorSemana(fechaRef: Date, primerDia: number): string {
	const inicio = inicioSemana(fechaRef, primerDia);
	const fin = new Date(inicio);
	fin.setDate(inicio.getDate() + 6);

	if (inicio.getFullYear() !== fin.getFullYear()) {
		return `Semana del ${inicio.getDate()} ${mesCorto(inicio)} ${inicio.getFullYear()} al ${fin.getDate()} ${mesCorto(fin)} ${fin.getFullYear()}`;
	}

	return `Semana del ${inicio.getDate()} ${mesCorto(inicio)} al ${fin.getDate()} ${mesCorto(fin)}`;
}

function formatoIndicadorMes(fechaRef: Date): string {
	const partes = new Intl.DateTimeFormat('es-ES', {
		month: 'long',
		year: 'numeric'
	}).formatToParts(fechaRef);
	const mes = partes.find((p) => p.type === 'month')?.value ?? '';
	const ano = partes.find((p) => p.type === 'year')?.value ?? '';
	return `${capitalizar(mes)} ${ano}`;
}

/** Label humano del periodo: "Semana del 10 al 16 jun", "Junio 2026", "2026". */
export function formatearIndicadorPeriodo(
	periodo: Periodo,
	fechaRef: Date,
	primerDia: number = PRIMER_DIA_SEMANA
): string {
	switch (periodo) {
		case 'semana':
			return formatoIndicadorSemana(fechaRef, primerDia);
		case 'mes':
			return formatoIndicadorMes(fechaRef);
		case 'trimestre': {
			const trimestre = Math.floor(fechaRef.getMonth() / 3) + 1;
			return `Trimestre ${trimestre} ${fechaRef.getFullYear()}`;
		}
		case 'año':
			return String(fechaRef.getFullYear());
	}
}
