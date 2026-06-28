/**
 * Tests para export-agrupacion.ts
 *
 * Verifica la agrupación de jornadas por semana/mes, y el cálculo de cierres
 * por sub-periodo, y el mapeo filtro → tipo de sub-periodo.
 *
 * ACs cubiertos: AC-15, AC-16
 */
import { describe, it, expect } from 'vitest';
import type { Jornada } from '$lib/db';
import type { FiltroTemporal } from '$lib/utils/historial-filtros';
import {
	agruparPorMes,
	agruparPorSemana,
	calcularCierresPorPeriodo,
	tipoSubPeriodoDeFiltro
} from '$lib/utils/export-agrupacion';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeJornada(dateStr: string): Jornada {
	return {
		id: Math.random(),
		start_time: new Date(dateStr),
		end_time: new Date(dateStr),
		duration: 60,
		status: 'closed',
		synced: 0,
		lat_start: null,
		lng_start: null,
		lat_end: null,
		lng_end: null
	} as unknown as Jornada;
}

function makeJornadaConDuracion(dateStr: string, horas: number): Jornada {
	const start = new Date(dateStr);
	const end = new Date(start.getTime() + horas * 3600 * 1000);
	return {
		id: Math.random(),
		start_time: start,
		end_time: end,
		duration: horas * 60,
		status: 'closed',
		synced: 0,
		lat_start: null,
		lng_start: null,
		lat_end: null,
		lng_end: null
	} as unknown as Jornada;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('agruparPorSemana', () => {
	describe('primerDiaSemana = 1 (lunes)', () => {
		it('jornadas del lunes 22 al domingo 28 van juntas (semana starts lunes)', () => {
			const jornadas = [
				makeJornada('2026-06-22T08:00'), // lunes 22
				makeJornada('2026-06-28T10:00') // domingo 28
			];
			const resultado = agruparPorSemana(jornadas, 1);
			expect([...resultado.keys()]).toHaveLength(1);
			expect([...resultado.keys()][0]).toBe('2026-06-22');
		});

		it('jornadas de la misma semana (lunes a domingo) se agrupan juntas', () => {
			const jornadas = [
				makeJornada('2026-06-22T08:00'), // lunes
				makeJornada('2026-06-23T09:00'), // martes
				makeJornada('2026-06-28T10:00') // domingo - misma semana (22-28)
			];
			const resultado = agruparPorSemana(jornadas, 1);
			// Todas en la misma semana (lunes 22 a domingo 28)
			expect([...resultado.keys()]).toHaveLength(1);
			expect([...resultado.keys()][0]).toBe('2026-06-22');
		});

		it('dos semanas distintas no se mezclan', () => {
			const jornadas = [
				makeJornada('2026-06-22T08:00'), // semana 25 (lunes 22)
				makeJornada('2026-06-29T08:00') // semana 26 (lunes 29)
			];
			const resultado = agruparPorSemana(jornadas, 1);
			expect([...resultado.keys()]).toHaveLength(2);
			expect([...resultado.keys()]).toContain('2026-06-22');
			expect([...resultado.keys()]).toContain('2026-06-29');
		});
	});

	describe('primerDiaSemana = 0 (domingo)', () => {
		it('una semana empieza en domingo', () => {
			const jornadas = [
				makeJornada('2026-06-21T08:00'), // domingo 21
				makeJornada('2026-06-22T09:00'), // lunes 22
				makeJornada('2026-06-27T10:00') // sábado 27
			];
			const resultado = agruparPorSemana(jornadas, 0);
			// Todas en la misma semana (domingo 21 a sábado 27)
			expect([...resultado.keys()]).toHaveLength(1);
			expect([...resultado.keys()][0]).toBe('2026-06-21');
		});

		it('semana siguiente empieza en otro domingo', () => {
			const jornadas = [
				makeJornada('2026-06-21T08:00'), // semana 1 (domingo 21)
				makeJornada('2026-06-28T08:00') // semana 2 (domingo 28)
			];
			const resultado = agruparPorSemana(jornadas, 0);
			expect([...resultado.keys()]).toHaveLength(2);
			expect([...resultado.keys()]).toContain('2026-06-21');
			expect([...resultado.keys()]).toContain('2026-06-28');
		});
	});

	describe('semanas que cruzan mes/año', () => {
		it('semana que cruza de junio a julio se agrupa correctamente', () => {
			// Semana del lunes 29 junio al domingo 5 julio
			const jornadas = [
				makeJornada('2026-06-29T08:00'), // lunes 29 junio
				makeJornada('2026-07-01T09:00'), // miércoles 1 julio
				makeJornada('2026-07-05T10:00') // domingo 5 julio
			];
			const resultado = agruparPorSemana(jornadas, 1);
			// Todas en la misma semana (empezando lunes 29 junio)
			expect([...resultado.keys()]).toHaveLength(1);
			expect([...resultado.keys()][0]).toBe('2026-06-29');
		});

		it('semana que cruza de diciembre 2026 a enero 2027 se agrupa correctamente', () => {
			const jornadas = [
				makeJornada('2026-12-28T08:00'), // lunes 28 diciembre 2026
				makeJornada('2027-01-01T09:00'), // viernes 1 enero 2027
				makeJornada('2027-01-03T10:00') // domingo 3 enero 2027
			];
			const resultado = agruparPorSemana(jornadas, 1);
			expect([...resultado.keys()]).toHaveLength(1);
			expect([...resultado.keys()][0]).toBe('2026-12-28');
		});

		it('dos semanas distintas aunqueelfin de año esté entre ellas', () => {
			const jornadas = [
				makeJornada('2026-12-21T08:00'), // semana que termina 27 dic
				makeJornada('2026-12-28T08:00') // semana que empieza 28 dic
			];
			const resultado = agruparPorSemana(jornadas, 1);
			expect([...resultado.keys()]).toHaveLength(2);
		});
	});

	describe('casos límite', () => {
		it('array vacío devuelve Map vacío', () => {
			const resultado = agruparPorSemana([], 1);
			expect(resultado.size).toBe(0);
		});

		it('una sola jornada devuelve Map con una clave y un elemento', () => {
			const jornada = makeJornada('2026-06-22T08:00');
			const resultado = agruparPorSemana([jornada], 1);
			expect(resultado.size).toBe(1);
			const clave = [...resultado.keys()][0];
			expect(clave).toBe('2026-06-22');
			expect(resultado.get(clave)).toHaveLength(1);
		});

		it('jornadas del mismo día van en la misma semana', () => {
			const jornadas = [makeJornada('2026-06-22T08:00'), makeJornada('2026-06-22T14:00')];
			const resultado = agruparPorSemana(jornadas, 1);
			expect(resultado.size).toBe(1);
			expect([...resultado.values()][0]).toHaveLength(2);
		});

		it('el orden de las claves del Map sigue el orden de primera aparición en el input', () => {
			// El orden de las claves es el orden en que se insertan (preserve insertion order)
			// Primera semana encontrada: junio29 (de julio5)
			// Segunda semana encontrada: junio22 (de junio22)
			const jornadas = [
				makeJornada('2026-07-05T08:00'), // primer key: week of June 29
				makeJornada('2026-06-22T08:00'), // second key: week of June 22
				makeJornada('2026-06-29T08:00') // same week as first
			];
			const resultado = agruparPorSemana(jornadas, 1);
			const claves = [...resultado.keys()];
			expect(claves[0]).toBe('2026-06-29');
			expect(claves[1]).toBe('2026-06-22');
		});
	});
});

describe('agruparPorMes', () => {
	it('jornadas del mismo mes van juntas', () => {
		const jornadas = [
			makeJornada('2026-01-10T08:00'),
			makeJornada('2026-01-20T08:00'),
			makeJornada('2026-01-31T08:00')
		];
		const resultado = agruparPorMes(jornadas);
		expect([...resultado.keys()]).toEqual(['2026-01']);
		expect(resultado.get('2026-01')).toHaveLength(3);
	});

	it('jornadas de meses distintos van separadas', () => {
		const jornadas = [
			makeJornada('2026-01-15T08:00'),
			makeJornada('2026-02-15T08:00'),
			makeJornada('2026-03-15T08:00')
		];
		const resultado = agruparPorMes(jornadas);
		expect([...resultado.keys()]).toEqual(['2026-01', '2026-02', '2026-03']);
	});

	it('array vacío devuelve Map vacío', () => {
		expect(agruparPorMes([]).size).toBe(0);
	});

	it('preserva el orden de inserción (orden cronológico)', () => {
		const jornadas = [
			makeJornada('2026-03-15T08:00'),
			makeJornada('2026-01-15T08:00'),
			makeJornada('2026-02-15T08:00')
		];
		const resultado = agruparPorMes(jornadas);
		expect([...resultado.keys()]).toEqual(['2026-03', '2026-01', '2026-02']);
	});
});

describe('tipoSubPeriodoDeFiltro', () => {
	it('periodo=mes → "semana" (mes separa por semanas)', () => {
		const filtro: FiltroTemporal = { tipo: 'periodo', periodo: 'mes', fechaReferencia: new Date() };
		expect(tipoSubPeriodoDeFiltro(filtro)).toBe('semana');
	});

	it('periodo=año → "mes" (año separa por meses)', () => {
		const filtro: FiltroTemporal = { tipo: 'periodo', periodo: 'año', fechaReferencia: new Date() };
		expect(tipoSubPeriodoDeFiltro(filtro)).toBe('mes');
	});

	it('periodo=semana → "ninguno"', () => {
		const filtro: FiltroTemporal = {
			tipo: 'periodo',
			periodo: 'semana',
			fechaReferencia: new Date()
		};
		expect(tipoSubPeriodoDeFiltro(filtro)).toBe('ninguno');
	});

	it('filtro tipo=fecha → "ninguno"', () => {
		const filtro: FiltroTemporal = { tipo: 'fecha', fecha: new Date() };
		expect(tipoSubPeriodoDeFiltro(filtro)).toBe('ninguno');
	});

	it('filtro tipo=rango → "ninguno"', () => {
		const filtro: FiltroTemporal = { tipo: 'rango', desde: new Date(), hasta: new Date() };
		expect(tipoSubPeriodoDeFiltro(filtro)).toBe('ninguno');
	});
});

describe('calcularCierresPorPeriodo', () => {
	it('con subPeriodo="ninguno" devuelve Map vacío', () => {
		const jornadas = [makeJornada('2026-06-22T08:00')];
		const resultado = calcularCierresPorPeriodo({
			jornadas,
			tipoSubPeriodo: 'ninguno',
			snapshots: [],
			balances: new Map(),
			primerDiaSemana: 1
		});
		expect(resultado.size).toBe(0);
	});

	it('subPeriodo=semana: suma horas y balances por semana', () => {
		// Jornadas con 8h de duración: 08:00 → 16:00
		const jornadas = [
			makeJornadaConDuracion('2026-06-22T08:00', 8),
			makeJornadaConDuracion('2026-06-23T08:00', 8),
			makeJornadaConDuracion('2026-06-29T08:00', 8)
		];
		const balances = new Map([
			['2026-06-22', { claveDia: '2026-06-22', trabajado: 480, objetivo: 450, balance: 30 }],
			['2026-06-23', { claveDia: '2026-06-23', trabajado: 480, objetivo: 450, balance: 30 }],
			['2026-06-29', { claveDia: '2026-06-29', trabajado: 480, objetivo: 450, balance: 30 }]
		]);
		const resultado = calcularCierresPorPeriodo({
			jornadas,
			tipoSubPeriodo: 'semana',
			snapshots: [],
			balances,
			primerDiaSemana: 1
		});
		expect(resultado.size).toBe(2);
		const sem1 = resultado.get('2026-06-22');
		expect(sem1).toEqual({ total: 16, balance: 1 });
		const sem2 = resultado.get('2026-06-29');
		expect(sem2).toEqual({ total: 8, balance: 0.5 });
	});

	it('subPeriodo=mes: agrupa por mes natural', () => {
		const jornadas = [
			makeJornadaConDuracion('2026-01-15T08:00', 8),
			makeJornadaConDuracion('2026-02-15T08:00', 8)
		];
		const balances = new Map([
			['2026-01-15', { claveDia: '2026-01-15', trabajado: 480, objetivo: 450, balance: 30 }],
			['2026-02-15', { claveDia: '2026-02-15', trabajado: 480, objetivo: 450, balance: 30 }]
		]);
		const resultado = calcularCierresPorPeriodo({
			jornadas,
			tipoSubPeriodo: 'mes',
			snapshots: [],
			balances,
			primerDiaSemana: 1
		});
		expect(resultado.size).toBe(2);
		const enero = resultado.get('2026-01');
		expect(enero).toEqual({ total: 8, balance: 0.5 });
		const febrero = resultado.get('2026-02');
		expect(febrero).toEqual({ total: 8, balance: 0.5 });
	});

	it('suma días únicos aunque haya varias jornadas en el mismo día', () => {
		// Dos jornadas de 8h en el mismo día → 16h totales, una sola entrada de cierre
		const jornadas = [
			makeJornadaConDuracion('2026-06-22T08:00', 8),
			makeJornadaConDuracion('2026-06-22T16:00', 8)
		];
		const balances = new Map([
			['2026-06-22', { claveDia: '2026-06-22', trabajado: 960, objetivo: 450, balance: 510 }]
		]);
		const resultado = calcularCierresPorPeriodo({
			jornadas,
			tipoSubPeriodo: 'semana',
			snapshots: [],
			balances,
			primerDiaSemana: 1
		});
		const cierre = resultado.get('2026-06-22');
		expect(cierre).toEqual({ total: 16, balance: 8.5 });
	});
});
