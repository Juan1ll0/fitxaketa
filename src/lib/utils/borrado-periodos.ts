import type { Jornada } from '$lib/db';
import type { Granularidad, PeriodoConDatos } from '$lib/utils/borrado-tipos';
import { claveDia, inicioDia, inicioSemana } from '$lib/utils/fecha-negocio';

/** Niveles con rango temporal (la jornada concreta se borra por `id`, no por rango). */
type NivelRango = Exclude<Granularidad, 'jornada'>;

const fmtMes = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

function rangoDe(nivel: NivelRango, fecha: Date, primerDia: number): { desde: Date; hasta: Date } {
	const y = fecha.getFullYear();
	if (nivel === 'año') return { desde: new Date(y, 0, 1), hasta: new Date(y + 1, 0, 1) };
	if (nivel === 'mes') {
		return { desde: new Date(y, fecha.getMonth(), 1), hasta: new Date(y, fecha.getMonth() + 1, 1) };
	}
	if (nivel === 'semana') {
		const desde = inicioSemana(fecha, primerDia);
		const hasta = new Date(desde);
		hasta.setDate(hasta.getDate() + 7);
		return { desde, hasta };
	}
	const desde = inicioDia(fecha);
	const hasta = new Date(desde);
	hasta.setDate(hasta.getDate() + 1);
	return { desde, hasta };
}

function claveDe(nivel: NivelRango, desde: Date): string {
	if (nivel === 'año') return `y-${desde.getFullYear()}`;
	if (nivel === 'mes') return `m-${desde.getFullYear()}-${desde.getMonth()}`;
	return `${nivel}-${claveDia(desde)}`;
}

function etiquetaDe(nivel: NivelRango, desde: Date): string {
	if (nivel === 'año') return String(desde.getFullYear());
	if (nivel === 'mes') return fmtMes.format(desde);
	if (nivel === 'dia') return desde.toLocaleDateString('es-ES');
	return `Semana del ${desde.toLocaleDateString('es-ES')}`;
}

function enRango(jornadas: Jornada[], desde: Date, hasta: Date): Jornada[] {
	const a = desde.getTime();
	const b = hasta.getTime();
	return jornadas.filter((j) => {
		const t = new Date(j.start_time).getTime();
		return t >= a && t < b;
	});
}

/**
 * Periodos del `nivel` que tienen al menos una jornada. Si se pasa `padre`, solo
 * se listan los periodos contenidos en él (año→meses, mes→semanas, etc.). El
 * `conteo` se calcula sobre el rango real del periodo (lo que se borrará),
 * aunque una semana se salga del mes padre.
 */
export function periodosConDatos(
	jornadas: Jornada[],
	nivel: NivelRango,
	primerDia: number,
	padre?: PeriodoConDatos
): PeriodoConDatos[] {
	const base = padre ? enRango(jornadas, padre.desde, padre.hasta) : jornadas;
	const vistos = new Map<string, PeriodoConDatos>();
	for (const j of base) {
		const { desde, hasta } = rangoDe(nivel, new Date(j.start_time), primerDia);
		const clave = claveDe(nivel, desde);
		if (vistos.has(clave)) continue;
		const conteo = enRango(jornadas, desde, hasta).length;
		vistos.set(clave, { clave, etiqueta: etiquetaDe(nivel, desde), desde, hasta, conteo });
	}
	return [...vistos.values()].sort((a, b) => a.desde.getTime() - b.desde.getTime());
}
