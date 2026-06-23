import { describe, it, expect } from 'vitest';
import { calcularResumenPeriodo } from '$lib/utils/dashboard';
import type { Jornada, Settings } from '$lib/db';

function contrato(semanales: number, redondeo = 0): Settings[] {
	return [
		{
			fecha: new Date(2000, 0, 1),
			primer_dia_semana: 1,
			min_jornada_minutos: 0,
			horas_semanales: semanales,
			dias_laborables: 5,
			redondeo_minutos: redondeo
		}
	];
}

function jornada(start: Date, end: Date): Jornada {
	return {
		id: start.getDate(),
		start_time: start,
		end_time: end,
		lat_start: null,
		lng_start: null,
		lat_end: null,
		lng_end: null,
		duration: Math.round((end.getTime() - start.getTime()) / 60000),
		status: 'closed',
		synced: 1
	};
}

describe('calcularResumenPeriodo (con settings)', () => {
	it('balance positivo y total real = total cuando no hay redondeo', () => {
		const r = calcularResumenPeriodo(
			[jornada(new Date(2026, 5, 15, 9, 0), new Date(2026, 5, 15, 18, 0))],
			contrato(40)
		); // 9h, objetivo 8h
		expect(r.totalHoras).toBe(9);
		expect(r.totalHorasReal).toBe(9);
		expect(r.balanceMinutos).toBe(60);
	});

	it('totalHoras (efectiva) difiere del total real cuando el redondeo aplica', () => {
		const r = calcularResumenPeriodo(
			[jornada(new Date(2026, 5, 15, 9, 43), new Date(2026, 5, 15, 17, 52))],
			contrato(40, 15)
		);
		// real 9:43→17:52 = 489min; redondeada a 15 → 495min
		expect(r.totalHoras).toBeCloseTo(495 / 60);
		expect(r.totalHorasReal).toBeCloseTo(489 / 60);
	});

	it('totalHoras es invariante al contrato; solo cambia el balance', () => {
		const js = [jornada(new Date(2026, 5, 15, 9, 0), new Date(2026, 5, 15, 18, 0))];
		const r40 = calcularResumenPeriodo(js, contrato(40)); // objetivo 8h
		const r35 = calcularResumenPeriodo(js, contrato(35)); // objetivo 7h
		expect(r35.totalHoras).toBe(r40.totalHoras);
		expect(r40.balanceMinutos).toBe(60); // 9−8
		expect(r35.balanceMinutos).toBe(120); // 9−7
	});
});
