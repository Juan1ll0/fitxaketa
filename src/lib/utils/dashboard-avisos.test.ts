import { describe, it, expect } from 'vitest';
import type { Jornada } from '$lib/db';
import { jornadaAbiertaAnterior } from '$lib/utils/dashboard-avisos';

function jornada(start: Date, status: 'open' | 'closed'): Jornada {
	return {
		id: Math.random(),
		start_time: start,
		end_time: status === 'closed' ? new Date(start.getTime() + 3600000) : null,
		lat_start: null,
		lng_start: null,
		lat_end: null,
		lng_end: null,
		duration: status === 'closed' ? 60 : null,
		status,
		synced: 0
	};
}

describe('jornadaAbiertaAnterior', () => {
	const hoy = new Date(2026, 5, 24, 12, 0, 0);
	const ayer = new Date(2026, 5, 23, 9, 0, 0);

	it('detecta una jornada abierta de un día anterior', () => {
		const res = jornadaAbiertaAnterior([jornada(ayer, 'open')], hoy);
		expect(res?.start_time).toBe(ayer);
	});

	it('ignora la jornada abierta de hoy', () => {
		expect(jornadaAbiertaAnterior([jornada(hoy, 'open')], hoy)).toBeNull();
	});

	it('ignora jornadas cerradas de días anteriores', () => {
		expect(jornadaAbiertaAnterior([jornada(ayer, 'closed')], hoy)).toBeNull();
	});

	it('devuelve null si no hay jornadas', () => {
		expect(jornadaAbiertaAnterior([], hoy)).toBeNull();
	});
});
