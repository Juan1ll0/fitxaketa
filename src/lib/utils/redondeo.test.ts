import { describe, it, expect } from 'vitest';
import { redondearFecha, duracionEfectivaMinutos } from '$lib/utils/redondeo';
import type { Jornada, Settings } from '$lib/db';

function snap(over: Partial<Settings> = {}): Settings {
	return {
		fecha: new Date(2000, 0, 1),
		primer_dia_semana: 1,
		min_jornada_minutos: 0,
		horas_semanales: 40,
		dias_laborables: 5,
		redondeo_minutos: 15,
		redondeo_aplicar_a: 'ambas',
		...over
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
	it('redondearFecha al múltiplo más cercano', () => {
		expect(redondearFecha(new Date(2026, 5, 21, 21, 43), 15).getMinutes()).toBe(45);
		expect(redondearFecha(new Date(2026, 5, 21, 21, 37), 15).getMinutes()).toBe(30);
	});

	it('redondearFecha con 0 no cambia y no muta el original', () => {
		const orig = new Date(2026, 5, 21, 21, 43);
		const r = redondearFecha(orig, 0);
		expect(r.getTime()).toBe(orig.getTime());
		expect(orig.getMinutes()).toBe(43); // intacto
	});

	it('duracionEfectivaMinutos aplica redondeo a ambas marcas sin mutar', () => {
		const j = jornada(new Date(2026, 5, 21, 9, 43), new Date(2026, 5, 21, 17, 52));
		// 9:45 → 17:45 = 8h = 480 min
		expect(duracionEfectivaMinutos(j, [snap()])).toBe(480);
		expect(j.start_time.getMinutes()).toBe(43); // no mutado
	});

	it('duracionEfectivaMinutos solo entrada', () => {
		const j = jornada(new Date(2026, 5, 21, 9, 43), new Date(2026, 5, 21, 17, 52));
		// 9:45 → 17:52 = 8h7m = 487
		expect(duracionEfectivaMinutos(j, [snap({ redondeo_aplicar_a: 'entrada' })])).toBe(487);
	});

	it('duracionEfectivaMinutos devuelve 0 si la jornada está abierta', () => {
		expect(duracionEfectivaMinutos(jornada(new Date(2026, 5, 21, 9, 0), null), [snap()])).toBe(0);
	});
});
