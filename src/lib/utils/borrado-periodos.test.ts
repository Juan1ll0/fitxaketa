import { describe, it, expect } from 'vitest';
import type { Jornada } from '$lib/db';
import { periodosConDatos } from '$lib/utils/borrado-periodos';
import type { PeriodoConDatos } from '$lib/utils/borrado-tipos';

function j(start: Date): Jornada {
	return {
		start_time: start,
		end_time: new Date(start.getTime() + 3_600_000),
		lat_start: null,
		lng_start: null,
		lat_end: null,
		lng_end: null,
		duration: 60,
		status: 'closed',
		synced: 1
	};
}

describe('periodosConDatos', () => {
	it('lista solo los años con jornadas, ordenados y con conteo', () => {
		const jornadas = [j(new Date(2025, 5, 1)), j(new Date(2026, 0, 2)), j(new Date(2026, 3, 4))];
		const años = periodosConDatos(jornadas, 'año', 1);
		expect(años.map((p) => p.etiqueta)).toEqual(['2025', '2026']);
		expect(años.map((p) => p.conteo)).toEqual([1, 2]);
	});

	it('acota los meses al año padre', () => {
		const jornadas = [j(new Date(2025, 11, 1)), j(new Date(2026, 2, 1)), j(new Date(2026, 5, 1))];
		const año2026 = periodosConDatos(jornadas, 'año', 1).find((p) => p.etiqueta === '2026');
		const meses = periodosConDatos(jornadas, 'mes', 1, año2026 as PeriodoConDatos);
		expect(meses).toHaveLength(2);
		expect(meses.every((m) => m.desde.getFullYear() === 2026)).toBe(true);
	});

	it('la semana respeta el primer día configurado', () => {
		const miercoles = new Date(2026, 5, 24); // 2026-06-24 es miércoles
		const conLunes = periodosConDatos([j(miercoles)], 'semana', 1)[0];
		const conDomingo = periodosConDatos([j(miercoles)], 'semana', 0)[0];
		expect(conLunes.desde.getDate()).toBe(22); // lunes
		expect(conDomingo.desde.getDate()).toBe(21); // domingo
	});

	it('atribuye por start_time: una jornada que cruza fin de año cuenta en el año de inicio', () => {
		const nochevieja = new Date(2025, 11, 31, 22, 0); // termina el 1-ene 2026
		const años = periodosConDatos([j(nochevieja)], 'año', 1);
		expect(años).toHaveLength(1);
		expect(años[0].etiqueta).toBe('2025');
	});
});
