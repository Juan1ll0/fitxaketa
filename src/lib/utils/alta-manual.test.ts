import { describe, it, expect } from 'vitest';
import type { Jornada } from '$lib/db';
import { combinarFechaHora, validarAltaManual, solapaConJornadas } from '$lib/utils/alta-manual';

function jornada(start: Date, end: Date | null): Jornada {
	return {
		id: 1,
		start_time: start,
		end_time: end,
		lat_start: null,
		lng_start: null,
		lat_end: null,
		lng_end: null,
		duration: end ? Math.floor((end.getTime() - start.getTime()) / 60000) : null,
		status: end ? 'closed' : 'open',
		synced: 0
	};
}

describe('combinarFechaHora', () => {
	it('combina fecha + "HH:MM" en hora local sin desfase de día', () => {
		const d = combinarFechaHora(new Date(2026, 5, 1), '09:30');
		expect(d.getFullYear()).toBe(2026);
		expect(d.getMonth()).toBe(5);
		expect(d.getDate()).toBe(1);
		expect(d.getHours()).toBe(9);
		expect(d.getMinutes()).toBe(30);
		expect(d.getSeconds()).toBe(0);
	});
});

describe('validarAltaManual', () => {
	const ayer = (h: number, m = 0) => {
		const d = new Date();
		d.setDate(d.getDate() - 1);
		d.setHours(h, m, 0, 0);
		return d;
	};

	it('acepta una jornada válida (fin > inicio, sin mínimo)', () => {
		expect(validarAltaManual(ayer(9), ayer(13), 0)).toBeNull();
	});

	it('rechaza fin anterior o igual a inicio', () => {
		expect(validarAltaManual(ayer(13), ayer(9), 0)).toMatch(/posterior/i);
		expect(validarAltaManual(ayer(9), ayer(9), 0)).toMatch(/posterior/i);
	});

	it('rechaza inicio en el futuro', () => {
		const start = new Date(Date.now() + 60 * 60 * 1000);
		const end = new Date(Date.now() + 2 * 60 * 60 * 1000);
		expect(validarAltaManual(start, end, 0)).toMatch(/futur/i);
	});

	it('bloquea si la duración no alcanza el mínimo configurado', () => {
		expect(validarAltaManual(ayer(9, 0), ayer(9, 20), 30)).toMatch(/al menos/i);
	});

	it('no bloquea por mínimo cuando min = 0', () => {
		expect(validarAltaManual(ayer(9, 0), ayer(9, 5), 0)).toBeNull();
	});

	it('rechaza una hora de fin en el futuro', () => {
		const start = new Date(Date.now() - 2 * 60 * 60 * 1000);
		const end = new Date(Date.now() + 60 * 60 * 1000);
		expect(validarAltaManual(start, end, 0)).toMatch(/futur/i);
	});
});

describe('solapaConJornadas', () => {
	const ex = jornada(new Date(2026, 0, 2, 9, 0), new Date(2026, 0, 2, 13, 0));

	it('detecta solape parcial', () => {
		const r = solapaConJornadas(new Date(2026, 0, 2, 12, 0), new Date(2026, 0, 2, 14, 0), [ex]);
		expect(r).toBe(ex);
	});

	it('no solapa si es adyacente (fin = inicio del siguiente)', () => {
		const r = solapaConJornadas(new Date(2026, 0, 2, 13, 0), new Date(2026, 0, 2, 15, 0), [ex]);
		expect(r).toBeNull();
	});

	it('una jornada abierta ocupa hasta ahora', () => {
		const abierta = jornada(new Date(Date.now() - 3 * 60 * 60 * 1000), null);
		const r = solapaConJornadas(
			new Date(Date.now() - 60 * 60 * 1000),
			new Date(Date.now() - 30 * 60 * 1000),
			[abierta]
		);
		expect(r).toBe(abierta);
	});

	it('devuelve null si no hay solape ni jornadas', () => {
		expect(
			solapaConJornadas(new Date(2026, 0, 3, 9, 0), new Date(2026, 0, 3, 10, 0), [ex])
		).toBeNull();
		expect(
			solapaConJornadas(new Date(2026, 0, 3, 9, 0), new Date(2026, 0, 3, 10, 0), [])
		).toBeNull();
	});
});
