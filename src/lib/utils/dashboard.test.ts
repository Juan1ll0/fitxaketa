import { describe, it, expect } from 'vitest';
import { formatearFecha, calcularResumenDia } from '$lib/utils/dashboard';
import type { Jornada } from '$lib/db';

describe('dashboard utils', () => {
	describe('formatearFecha()', () => {
		// AC: Formato largo español correcto (e.g., "domingo, 21 de junio de 2026")
		it('debería formatear una fecha en formato largo español', () => {
			// 21 de junio de 2026 es domingo
			const date = new Date(2026, 5, 21); // mes 5 = junio (0-indexed)
			const result = formatearFecha(date);

			// Debe contener el día de la semana, día, mes y año en español
			expect(result).toMatch(/domingo/);
			expect(result).toMatch(/21/);
			expect(result).toMatch(/junio/);
			expect(result).toMatch(/2026/);
		});

		it('debería formatear correctamente fechas en diferentes meses', () => {
			const enero = new Date(2026, 0, 15); // 15 de enero
			const resultadoEnero = formatearFecha(enero);
			expect(resultadoEnero).toMatch(/enero/);
			expect(resultadoEnero).toMatch(/15/);

			const diciembre = new Date(2025, 11, 31); // 31 de diciembre
			const resultadoDiciembre = formatearFecha(diciembre);
			expect(resultadoDiciembre).toMatch(/diciembre/);
			expect(resultadoDiciembre).toMatch(/31/);
		});

		it('debería formatear correctamente fechas con cambio de año', () => {
			const finDeAnio = new Date(2025, 11, 31); // 31 de diciembre de 2025
			const principioDeAnio = new Date(2026, 0, 1); // 1 de enero de 2026

			const resultadoFin = formatearFecha(finDeAnio);
			const resultadoPrincipio = formatearFecha(principioDeAnio);

			expect(resultadoFin).toMatch(/2025/);
			expect(resultadoPrincipio).toMatch(/2026/);
			expect(resultadoPrincipio).toMatch(/enero/);
		});

		it('debería formatear correctamente años diferentes', () => {
			const date1 = new Date(2024, 3, 4); // 4 de abril de 2024
			const date2 = new Date(2027, 7, 12); // 12 de agosto de 2027

			expect(formatearFecha(date1)).toMatch(/2024/);
			expect(formatearFecha(date2)).toMatch(/2027/);
		});
	});

	describe('calcularResumenDia()', () => {
		// AC: Array vacío → { totalHoras: 0, totalJornadas: 0 }
		it('debería retornar totales en cero para array vacío', () => {
			const resultado = calcularResumenDia([]);
			expect(resultado.totalHoras).toBe(0);
			expect(resultado.totalJornadas).toBe(0);
		});

		// AC: Una jornada cerrada
		it('debería calcular correctamente con una jornada cerrada', () => {
			const jornada: Jornada = {
				id: 1,
				start_time: new Date(2026, 5, 21, 9, 0),
				end_time: new Date(2026, 5, 21, 17, 0),
				lat_start: 43.123,
				lng_start: -2.456,
				lat_end: 43.123,
				lng_end: -2.456,
				duration: 480, // 8 horas
				status: 'closed',
				synced: 1
			};

			const resultado = calcularResumenDia([jornada]);

			expect(resultado.totalJornadas).toBe(1);
			expect(resultado.totalHoras).toBe(8); // 480 min / 60 = 8 horas
		});

		// AC: Múltiples jornadas
		it('debería calcular correctamente con múltiples jornadas', () => {
			const jornadas: Jornada[] = [
				{
					id: 1,
					start_time: new Date(2026, 5, 21, 9, 0),
					end_time: new Date(2026, 5, 21, 13, 0),
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null,
					duration: 240, // 4 horas
					status: 'closed',
					synced: 1
				},
				{
					id: 2,
					start_time: new Date(2026, 5, 21, 14, 0),
					end_time: new Date(2026, 5, 21, 18, 0),
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null,
					duration: 240, // 4 horas
					status: 'closed',
					synced: 1
				}
			];

			const resultado = calcularResumenDia(jornadas);

			expect(resultado.totalJornadas).toBe(2);
			expect(resultado.totalHoras).toBe(8); // 240 + 240 = 480 min / 60 = 8 horas
		});

		// AC: Jacksonville con duration null (abiertas) no cuentan
		it('debería ignorar jornadas abiertas (duration null) en el cálculo de horas', () => {
			const jornadas: Jornada[] = [
				{
					id: 1,
					start_time: new Date(2026, 5, 21, 9, 0),
					end_time: new Date(2026, 5, 21, 13, 0),
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null,
					duration: 240, // 4 horas (cerrada)
					status: 'closed',
					synced: 1
				},
				{
					id: 2,
					start_time: new Date(2026, 5, 21, 14, 0),
					end_time: null,
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null,
					duration: null, // abierta, no cuenta
					status: 'open',
					synced: 0
				}
			];

			const resultado = calcularResumenDia(jornadas);

			// Solo la cerrada cuenta para horas
			expect(resultado.totalHoras).toBe(4);
			// Las jornadas abiertas SÍ se cuentan en el total de jornadas
			expect(resultado.totalJornadas).toBe(2);
		});

		it('debería retornar cero horas si todas las jornadas están abiertas', () => {
			const jornadas: Jornada[] = [
				{
					id: 1,
					start_time: new Date(2026, 5, 21, 9, 0),
					end_time: null,
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null,
					duration: null,
					status: 'open',
					synced: 0
				},
				{
					id: 2,
					start_time: new Date(2026, 5, 21, 15, 0),
					end_time: null,
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null,
					duration: null,
					status: 'open',
					synced: 0
				}
			];

			const resultado = calcularResumenDia(jornadas);

			expect(resultado.totalHoras).toBe(0);
			expect(resultado.totalJornadas).toBe(2);
		});
	});
});
