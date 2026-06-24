import type { Jornada } from '$lib/db';
import { formatearHora } from '$lib/utils/dashboard-format';

/**
 * Utilidades puras para el alta manual de fichajes (spec 003.8).
 * Sin side effects: no tocan Dexie ni el store; solo construyen y validan.
 */

export type ResultadoAlta = { start: Date; end: Date } | { error: string };

export interface AltaManualInput {
	fechaStr: string;
	horaInicio: string;
	horaFin: string;
	diaSiguiente: boolean;
	minJornadaMinutos: number;
	jornadas: Jornada[];
}

function parseFechaLocal(value: string): Date {
	const [y, m, d] = value.split('-').map(Number);
	return new Date(y, m - 1, d);
}

function mensajeSolape(j: Jornada): string {
	if (j.end_time) {
		return `Se solapa con la jornada de ${formatearHora(j.start_time)}–${formatearHora(j.end_time)}.`;
	}
	return `Se solapa con la jornada abierta de ${formatearHora(j.start_time)}.`;
}

/**
 * Prepara un alta manual: construye `start`/`end` (con cruce de medianoche si
 * `diaSiguiente`), valida y comprueba solapamiento. Devuelve `{ start, end }`
 * listos para persistir, o `{ error }` con el mensaje a mostrar.
 */
export function prepararAltaManual(input: AltaManualInput): ResultadoAlta {
	const { fechaStr, horaInicio, horaFin, diaSiguiente, minJornadaMinutos, jornadas } = input;
	if (!fechaStr || !horaInicio || !horaFin) {
		return { error: 'Completa fecha, hora de inicio y hora de fin.' };
	}
	const fechaInicio = parseFechaLocal(fechaStr);
	const fechaFin = new Date(fechaInicio);
	if (diaSiguiente) fechaFin.setDate(fechaFin.getDate() + 1);
	const start = combinarFechaHora(fechaInicio, horaInicio);
	const end = combinarFechaHora(fechaFin, horaFin);

	const err = validarAltaManual(start, end, minJornadaMinutos);
	if (err) return { error: err };
	const conflicto = solapaConJornadas(start, end, jornadas);
	if (conflicto) return { error: mensajeSolape(conflicto) };
	return { start, end };
}

/**
 * Combina una fecha y una hora `"HH:MM"` en un `Date` en hora **local**.
 * Se construye con `setHours` (no `new Date("YYYY-MM-DDTHH:MM")`) para evitar
 * que el string se interprete como UTC y desfase el día.
 */
export function combinarFechaHora(fecha: Date, hora: string): Date {
	const [h, m] = hora.split(':').map(Number);
	const d = new Date(fecha);
	d.setHours(h, m, 0, 0);
	return d;
}

/**
 * Valida un alta manual. Devuelve `null` si es válida o un mensaje de error.
 * - inicio y fin no pueden ser futuros (fin incluye el cruce a un día siguiente
 *   aún no transcurrido)
 * - fin debe ser posterior a inicio (el cruce de medianoche se modela poniendo
 *   `end` en el día siguiente antes de llamar; aquí solo se compara start < end)
 * - si hay mínimo configurado (> 0), la duración debe alcanzarlo (bloquea)
 */
export function validarAltaManual(
	start: Date,
	end: Date,
	minJornadaMinutos: number
): string | null {
	const ahora = Date.now();
	if (start.getTime() > ahora) {
		return 'La fecha y hora de inicio no pueden ser futuras.';
	}
	if (end.getTime() <= start.getTime()) {
		return 'La hora de fin debe ser posterior a la de inicio.';
	}
	if (end.getTime() > ahora) {
		return 'La hora de fin no puede ser futura.';
	}
	const duracion = (end.getTime() - start.getTime()) / 60000;
	if (minJornadaMinutos > 0 && duracion < minJornadaMinutos) {
		return `La jornada debe durar al menos ${minJornadaMinutos} minutos.`;
	}
	return null;
}

/**
 * Devuelve la primera jornada existente que se solapa con `[start, end)`, o `null`.
 * Una jornada abierta (sin `end_time`) ocupa `[start_time, ahora]`.
 */
export function solapaConJornadas(start: Date, end: Date, jornadas: Jornada[]): Jornada | null {
	const s = start.getTime();
	const e = end.getTime();
	for (const j of jornadas) {
		const js = j.start_time.getTime();
		const je = (j.end_time ?? new Date()).getTime();
		if (s < je && e > js) return j;
	}
	return null;
}
