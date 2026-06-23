import type { Jornada } from '$lib/db';

/**
 * Helpers de fecha de negocio. Todo opera en hora **local**: las fechas se
 * guardan en UTC (timestamp en IndexedDB) y se interpretan en local al usarlas.
 *
 * Reglas de negocio que centraliza este módulo:
 *  1. Una jornada se atribuye al día local de su `start_time` (aunque cruce
 *     medianoche): ver {@link diaDeJornada}.
 *  2. Las semanas empiezan en lunes y terminan en domingo: ver {@link inicioSemana}.
 */

/** Primer día de la semana. 1 = lunes (ISO). Seam de config futura. 0 = domingo. */
export const PRIMER_DIA_SEMANA = 1;

/** Copia de `fecha` a las 00:00:00.000 local. No muta el argumento. */
export function inicioDia(fecha: Date): Date {
	const d = new Date(fecha);
	d.setHours(0, 0, 0, 0);
	return d;
}

/** Clave estable 'YYYY-MM-DD' en hora local. */
export function claveDia(fecha: Date): string {
	const year = fecha.getFullYear();
	const month = String(fecha.getMonth() + 1).padStart(2, '0');
	const day = String(fecha.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/** ¿`a` y `b` caen en el mismo día natural local? */
export function mismoDia(a: Date, b: Date): boolean {
	return inicioDia(a).getTime() === inicioDia(b).getTime();
}

/**
 * Día de atribución de una jornada (regla 1): SIEMPRE el día local de
 * `start_time`. Una jornada 22:00 → 02:00 del día siguiente cuenta en el día
 * de inicio.
 */
export function diaDeJornada(jornada: Jornada): Date {
	return inicioDia(new Date(jornada.start_time));
}

/**
 * Inicio (00:00 local) de la semana que contiene `fecha` (regla 2).
 * `diasDesde = (getDay() - primerDia + 7) % 7`. Con `primerDia=1` (lunes) es
 * equivalente a `(getDay() + 6) % 7`. No muta el argumento.
 */
export function inicioSemana(fecha: Date, primerDia: number = PRIMER_DIA_SEMANA): Date {
	const diasDesde = (fecha.getDay() - primerDia + 7) % 7;
	const inicio = inicioDia(fecha);
	inicio.setDate(inicio.getDate() - diasDesde);
	return inicio;
}
