/**
 * Tests para export-agrupacion.ts
 *
 * Verifica la agrupación de jornadas por semana con distintos primerDiaSemana.
 *
 * ACs cubiertos: AC-16
 */
import { describe, it, expect } from 'vitest';
import type { Jornada } from '$lib/db';
import { agruparPorSemana } from '$lib/utils/export-agrupacion';

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
