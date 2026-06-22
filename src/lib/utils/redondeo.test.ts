import { describe, it, expect } from 'vitest';
import { redondearMinutos, duracionEfectivaMinutos } from '$lib/utils/redondeo';
import type { Jornada, Settings } from '$lib/db';

function snap(redondeo: number): Settings {
	return {
		fecha: new Date(2000, 0, 1),
		primer_dia_semana: 1,
		min_jornada_minutos: 0,
		horas_semanales: 40,
		dias_laborables: 5,
		redondeo_minutos: redondeo
	};
}

function jornada(start: Date, end: Date | null): Jornada {
	return {
		id: 1,
		start_time: start,
		end_time: end,
		lat_start: null,
		lng_start: null,
		lat_end: null,
		lng_end: null,
		duration: end ? Math.round((end.getTime() - start.getTime()) / 60000) : null,
		status: end ? 'closed' : 'open',
		synced: 1
	};
}

describe('redondeo utils', () => {
	it('redondearMinutos al múltiplo más cercano', () => {
		expect(redondearMinutos(487, 15)).toBe(480); // 8h7m → 8h
		expect(redondearMinutos(488, 15)).toBe(495); // 8h8m → 8h15m
	});

	it('redondearMinutos con 0 no cambia', () => {
		expect(redondearMinutos(487, 0)).toBe(487);
	});

	it('duracionEfectivaMinutos redondea la duración real sin mutar la jornada', () => {
		const j = jornada(new Date(2026, 5, 21, 9, 0), new Date(2026, 5, 21, 17, 7)); // 487 min
		expect(duracionEfectivaMinutos(j, [snap(15)])).toBe(480);
		expect(j.end_time!.getMinutes()).toBe(7); // no mutada
	});

	it('duracionEfectivaMinutos sin redondeo devuelve la duración real', () => {
		const j = jornada(new Date(2026, 5, 21, 9, 0), new Date(2026, 5, 21, 17, 7));
		expect(duracionEfectivaMinutos(j, [snap(0)])).toBe(487);
	});

	it('duracionEfectivaMinutos devuelve 0 si la jornada está abierta', () => {
		expect(duracionEfectivaMinutos(jornada(new Date(2026, 5, 21, 9, 0), null), [snap(15)])).toBe(0);
	});
});
