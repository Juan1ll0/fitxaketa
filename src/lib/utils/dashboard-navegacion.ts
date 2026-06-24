import type { Periodo } from '$lib/stores/app-state';
import { obtenerRangoPeriodo } from '$lib/utils/dashboard-periodo';
import { inicioSemana, PRIMER_DIA_SEMANA } from '$lib/utils/fecha-negocio';

export { obtenerRangoPeriodo };

/**
 * Navega al periodo anterior o siguiente a partir de una fecha de referencia.
 * Nunca muta la fecha de entrada.
 *
 * Reglas de desplazamiento:
 * - semana: ±7 días naturales.
 * - mes: se fija el día a 1 antes de sumar/restar meses para evitar desbordes
 *   (p. ej., 31 may → 1 jun en lugar de 31 jun).
 * - trimestre: igual que mes, pero con ±3 meses.
 * - año: ±1 año.
 */
export function navegarPeriodo(
	periodo: Periodo,
	fechaRef: Date,
	direccion: 'anterior' | 'siguiente',
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	primerDia: number = PRIMER_DIA_SEMANA
): Date {
	const delta = direccion === 'anterior' ? -1 : 1;
	const nuevo = new Date(fechaRef);

	switch (periodo) {
		case 'semana': {
			nuevo.setDate(nuevo.getDate() + delta * 7);
			break;
		}
		case 'mes': {
			nuevo.setDate(1);
			nuevo.setMonth(nuevo.getMonth() + delta);
			break;
		}
		case 'trimestre': {
			nuevo.setDate(1);
			nuevo.setMonth(nuevo.getMonth() + delta * 3);
			break;
		}
		case 'año': {
			nuevo.setFullYear(nuevo.getFullYear() + delta);
			break;
		}
	}

	return nuevo;
}

/**
 * Comprueba si `fechaRef` cae en el mismo periodo que `hoy`.
 * La comparación se hace a través de {@link obtenerRangoPeriodo}, lo que maneja
 * correctamente semanas que cruzan años o meses.
 */
export function esPeriodoActual(
	periodo: Periodo,
	fechaRef: Date,
	hoy: Date = new Date(),
	primerDia: number = PRIMER_DIA_SEMANA
): boolean {
	const { inicio: inicioRef } = obtenerRangoPeriodo(periodo, fechaRef, primerDia);
	const { inicio: inicioHoy } = obtenerRangoPeriodo(periodo, hoy, primerDia);
	return inicioRef.getTime() === inicioHoy.getTime();
}

/**
 * Devuelve una fecha representativa del punto medio del periodo indicado.
 * Se usa al pasar de una vista larga a una corta (p. ej., Año → Mes) para
 * situar al usuario cerca del centro del periodo anterior.
 *
 * Puntos medios:
 * - semana: jueves (día 4 desde el lunes configurado).
 * - mes: día 15.
 * - trimestre: mes central del trimestre, día 15.
 * - año: 1 de julio.
 */
export function obtenerPuntoMedioPeriodo(
	periodo: Periodo,
	fechaRef: Date,
	primerDia: number = PRIMER_DIA_SEMANA
): Date {
	const medio = new Date(fechaRef);

	switch (periodo) {
		case 'semana': {
			const lunes = inicioSemana(fechaRef, primerDia);
			medio.setTime(lunes.getTime());
			medio.setDate(lunes.getDate() + 3);
			break;
		}
		case 'mes': {
			medio.setDate(15);
			break;
		}
		case 'trimestre': {
			const mesCentral = Math.floor(fechaRef.getMonth() / 3) * 3 + 1;
			medio.setMonth(mesCentral, 15);
			break;
		}
		case 'año': {
			medio.setMonth(6, 1);
			break;
		}
	}

	return medio;
}
