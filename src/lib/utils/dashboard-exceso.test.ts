import { describe, it, expect } from 'vitest';
import { balancePorDia, calcularBalancePeriodo } from '$lib/utils/dashboard-exceso';
import { claveDia } from '$lib/utils/fecha-negocio';
import type { Jornada, Settings } from '$lib/db';

/** Contrato 40h/5d = 8h/día, sin redondeo. */
const contrato: Settings[] = [
	{
		fecha: new Date(2000, 0, 1),
		primer_dia_semana: 1,
		min_jornada_minutos: 0,
		horas_semanales: 40,
		dias_laborables: 5,
		redondeo_minutos: 0,
		redondeo_aplicar_a: 'ambas'
	}
];

function jornada(id: number, day: number, startHour: number, horas: number): Jornada {
	return {
		id,
		start_time: new Date(2026, 5, day, startHour, 0),
		end_time: new Date(2026, 5, day, startHour + horas, 0),
		lat_start: null,
		lng_start: null,
		lat_end: null,
		lng_end: null,
		duration: horas * 60,
		status: 'closed',
		synced: 1
	};
}

describe('dashboard-exceso utils', () => {
	it('balancePorDia: con signo (positivo y negativo) vs objetivo de 8h', () => {
		const mapa = balancePorDia([jornada(1, 15, 9, 9), jornada(2, 16, 9, 6)], contrato);
		expect(mapa.get(claveDia(new Date(2026, 5, 15)))!.balance).toBe(60); // 9h − 8h = +1h
		expect(mapa.get(claveDia(new Date(2026, 5, 16)))!.balance).toBe(-120); // 6h − 8h = −2h
	});

	it('balancePorDia suma las jornadas del mismo día', () => {
		const mapa = balancePorDia([jornada(1, 15, 8, 5), jornada(2, 15, 14, 5)], contrato);
		expect(mapa.get(claveDia(new Date(2026, 5, 15)))!.balance).toBe(120); // 10h − 8h = +2h
	});

	it('calcularBalancePeriodo suma balances (puede ser negativo); días sin jornada no cuentan', () => {
		expect(calcularBalancePeriodo([jornada(1, 15, 9, 9), jornada(2, 16, 9, 6)], contrato)).toBe(
			-60
		);
	});

	it('sin contrato, el balance es todo el trabajado (objetivo 0)', () => {
		expect(calcularBalancePeriodo([jornada(1, 15, 9, 8)], [])).toBe(480);
	});
});
