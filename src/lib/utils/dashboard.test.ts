import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	formatearFecha,
	calcularResumenDia,
	agruparPorDia,
	formatearHora,
	formatearDuracion,
	filtrarPorPeriodo,
	calcularResumenPeriodo,
	formatearHorasDecimal
} from '$lib/utils/dashboard';
import type { Periodo } from '$lib/stores/app-state';
import type { Jornada } from '$lib/db';

/** Factory de jornada cerrada con coords null. duration en minutos, startHour en hora del día. */
function jornadaCerrada(id: number, startHour: number, duration: number): Jornada {
	return {
		id,
		start_time: new Date(2026, 5, 21, startHour, 0),
		end_time: new Date(2026, 5, 21, startHour + duration / 60, 0),
		lat_start: null,
		lng_start: null,
		lat_end: null,
		lng_end: null,
		duration,
		status: 'closed',
		synced: 1
	};
}

/** Factory de jornada abierta (duration null, end_time null). */
function jornadaAbierta(id: number, startHour: number): Jornada {
	return {
		id,
		start_time: new Date(2026, 5, 21, startHour, 0),
		end_time: null,
		lat_start: null,
		lng_start: null,
		lat_end: null,
		lng_end: null,
		duration: null,
		status: 'open',
		synced: 0
	};
}

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
			const jornadas: Jornada[] = [jornadaCerrada(1, 9, 240), jornadaCerrada(2, 14, 240)];

			const resultado = calcularResumenDia(jornadas);

			expect(resultado.totalJornadas).toBe(2);
			expect(resultado.totalHoras).toBe(8); // 240 + 240 = 480 min / 60 = 8 horas
		});

		// AC: Jacksonville con duration null (abiertas) no cuentan
		it('debería ignorar jornadas abiertas (duration null) en el cálculo de horas', () => {
			const jornadas: Jornada[] = [jornadaCerrada(1, 9, 240), jornadaAbierta(2, 14)];

			const resultado = calcularResumenDia(jornadas);

			// Solo la cerrada cuenta para horas
			expect(resultado.totalHoras).toBe(4);
			// Las jornadas abiertas SÍ se cuentan en el total de jornadas
			expect(resultado.totalJornadas).toBe(2);
		});

		it('debería retornar cero horas si todas las jornadas están abiertas', () => {
			const jornadas: Jornada[] = [jornadaAbierta(1, 9), jornadaAbierta(2, 15)];

			const resultado = calcularResumenDia(jornadas);

			expect(resultado.totalHoras).toBe(0);
			expect(resultado.totalJornadas).toBe(2);
		});
	});

	describe('agruparPorDia()', () => {
		it('agrupa jornadas bajo "Hoy" para fecha actual', () => {
			const hoy = new Date();
			const jornadas: Jornada[] = [
				{
					id: 1,
					start_time: hoy,
					end_time: hoy,
					duration: 60,
					synced: 1,
					status: 'closed',
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null
				}
			];
			const grupos = agruparPorDia(jornadas);
			expect(grupos.has('Hoy')).toBe(true);
			expect(grupos.get('Hoy')?.length).toBe(1);
		});

		it('agrupa jornadas bajo "Ayer" para fecha de ayer', () => {
			const ayer = new Date();
			ayer.setDate(ayer.getDate() - 1);
			ayer.setHours(12, 0, 0, 0);
			const jornadas: Jornada[] = [
				{
					id: 1,
					start_time: ayer,
					end_time: ayer,
					duration: 60,
					synced: 1,
					status: 'closed',
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null
				}
			];
			const grupos = agruparPorDia(jornadas);
			expect(grupos.has('Ayer')).toBe(true);
		});

		it('formatea fechas antiguas como "DD MMM YYYY"', () => {
			const fecha = new Date('2026-06-15T12:00:00');
			const jornadas: Jornada[] = [
				{
					id: 1,
					start_time: fecha,
					end_time: fecha,
					duration: 60,
					synced: 1,
					status: 'closed',
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null
				}
			];
			const grupos = agruparPorDia(jornadas);
			expect(grupos.has('15 jun 2026')).toBe(true);
		});

		it('ordena grupos descendente (más reciente primero)', () => {
			const hoy = new Date();
			const ayer = new Date();
			ayer.setDate(ayer.getDate() - 1);
			const hace3dias = new Date();
			hace3dias.setDate(hace3dias.getDate() - 3);

			const jornadas: Jornada[] = [
				{
					id: 1,
					start_time: hace3dias,
					end_time: hace3dias,
					duration: 60,
					synced: 1,
					status: 'closed',
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null
				},
				{
					id: 2,
					start_time: ayer,
					end_time: ayer,
					duration: 60,
					synced: 1,
					status: 'closed',
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null
				},
				{
					id: 3,
					start_time: hoy,
					end_time: hoy,
					duration: 60,
					synced: 1,
					status: 'closed',
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null
				}
			];
			const grupos = agruparPorDia(jornadas);
			const keys = [...grupos.keys()];
			// El primer key debe ser "Hoy", el segundo "Ayer", el tercero la fecha antigua
			expect(keys[0]).toBe('Hoy');
			expect(keys[1]).toBe('Ayer');
		});
	});

	describe('formatearHora()', () => {
		it('formatea hora como HH:MM', () => {
			const fecha = new Date('2026-06-21T14:30:00');
			expect(formatearHora(fecha)).toMatch(/14:30/);
		});

		it('formatea correctamente hora de la mañana', () => {
			const fecha = new Date('2026-06-21T09:05:00');
			expect(formatearHora(fecha)).toMatch(/09:05/);
		});
	});

	describe('formatearDuracion()', () => {
		it('formatea minutos como HH:MM:SS', () => {
			expect(formatearDuracion(125)).toBe('02:05:00');
		});

		it('formatea 0 minutos como 00:00:00', () => {
			expect(formatearDuracion(0)).toBe('00:00:00');
		});

		it('formatea 60 minutos como 01:00:00', () => {
			expect(formatearDuracion(60)).toBe('01:00:00');
		});

		it('retorna "En curso" para null', () => {
			expect(formatearDuracion(null)).toBe('En curso');
		});
	});

	// ─────────────────────────────────────────────────────────────
	// filtrarPorPeriodo()
	// ─────────────────────────────────────────────────────────────
	describe('filtrarPorPeriodo()', () => {
		/** Factory de jornada cerrada en una fecha específica (mes 5 = junio). */
		function jornadaEnFecha(
			id: number,
			year: number,
			month: number,
			day: number,
			hour: number,
			durationMinutes: number
		): Jornada {
			return {
				id,
				start_time: new Date(year, month - 1, day, hour, 0),
				end_time: new Date(year, month - 1, day, hour + Math.floor(durationMinutes / 60), durationMinutes % 60),
				lat_start: null,
				lng_start: null,
				lat_end: null,
				lng_end: null,
				duration: durationMinutes,
				status: 'closed',
				synced: 1
			};
		}

		function jornadaAbiertaEnFecha(
			id: number,
			year: number,
			month: number,
			day: number,
			hour: number
		): Jornada {
			return {
				id,
				start_time: new Date(year, month - 1, day, hour, 0),
				end_time: null,
				lat_start: null,
				lng_start: null,
				lat_end: null,
				lng_end: null,
				duration: null,
				status: 'open',
				synced: 0
			};
		}

		describe('filtra correctamente por periodo', () => {
			it('devuelve solo jornadas dentro del rango de semana', () => {
				const hoy = new Date(2026, 5, 21); // 21 junio 2026
				const hace6dias = new Date(2026, 5, 15);
				const hace8dias = new Date(2026, 5, 13);

				const jornadas: Jornada[] = [
					jornadaEnFecha(1, 2026, 6, 15, 9, 480), // hace 6 días → dentro de semana
					jornadaEnFecha(2, 2026, 6, 13, 9, 480)  // hace 8 días → fuera de semana
				];

				// Mock de Date para que filtrarPorPeriodo use una fecha fija
				const nowMock = vi.spyOn(Date, 'now').mockReturnValue(hoy.getTime());
				try {
					const resultado = filtrarPorPeriodo(jornadas, 'semana');
					expect(resultado).toHaveLength(1);
					expect(resultado[0].id).toBe(1);
				} finally {
					nowMock.mockRestore();
				}
			});

			it('devuelve solo jornadas dentro del rango de mes', () => {
				const hoy = new Date(2026, 5, 21);
				const hace20dias = new Date(2026, 5, 1);
				const hace35dias = new Date(2026, 4, 17);

				const jornadas: Jornada[] = [
					jornadaEnFecha(1, 2026, 6, 1, 9, 480),  // hace 20 días → dentro de mes
					jornadaEnFecha(2, 2026, 4, 17, 9, 480)  // hace 35 días → fuera de mes
				];

				const nowMock = vi.spyOn(Date, 'now').mockReturnValue(hoy.getTime());
				try {
					const resultado = filtrarPorPeriodo(jornadas, 'mes');
					expect(resultado).toHaveLength(1);
					expect(resultado[0].id).toBe(1);
				} finally {
					nowMock.mockRestore();
				}
			});

			it('devuelve solo jornadas dentro del rango de año', () => {
				const hoy = new Date(2026, 5, 21);
				const hace300dias = new Date(2025, 8, 1);
				const hace400dias = new Date(2025, 4, 1);

				const jornadas: Jornada[] = [
					jornadaEnFecha(1, 2025, 8, 1, 9, 480),   // hace 300 días → dentro de año
					jornadaEnFecha(2, 2025, 4, 1, 9, 480)   // hace 400 días → fuera de año
				];

				const nowMock = vi.spyOn(Date, 'now').mockReturnValue(hoy.getTime());
				try {
					const resultado = filtrarPorPeriodo(jornadas, 'año');
					expect(resultado).toHaveLength(1);
					expect(resultado[0].id).toBe(1);
				} finally {
					nowMock.mockRestore();
				}
			});
		});

		describe('solo incluye jornadas cerradas (status === "closed")', () => {
			it('excluye jornadas abiertas del resultado', () => {
				const hoy = new Date(2026, 5, 21);
				const jornadas: Jornada[] = [
					jornadaEnFecha(1, 2026, 6, 20, 9, 480),     // cerrada → incluida
					jornadaAbiertaEnFecha(2, 2026, 6, 21, 14)   // abierta → excluida
				];

				const nowMock = vi.spyOn(Date, 'now').mockReturnValue(hoy.getTime());
				try {
					const resultado = filtrarPorPeriodo(jornadas, 'semana');
					expect(resultado).toHaveLength(1);
					expect(resultado[0].id).toBe(1);
				} finally {
					nowMock.mockRestore();
				}
			});
		});

		it('retorna array vacío si no hay jornadas en el periodo', () => {
			const hoy = new Date(2026, 5, 21);
			const jornadas: Jornada[] = [
				jornadaEnFecha(1, 2025, 1, 1, 9, 480) // hace más de un año
			];

			const nowMock = vi.spyOn(Date, 'now').mockReturnValue(hoy.getTime());
			try {
				const resultado = filtrarPorPeriodo(jornadas, 'año');
				expect(resultado).toHaveLength(0);
			} finally {
				nowMock.mockRestore();
			}
		});

		it('retorna array vacío cuando no hay jornadas', () => {
			const hoy = new Date(2026, 5, 21);
			const nowMock = vi.spyOn(Date, 'now').mockReturnValue(hoy.getTime());
			try {
				expect(filtrarPorPeriodo([], 'semana')).toHaveLength(0);
				expect(filtrarPorPeriodo([], 'mes')).toHaveLength(0);
				expect(filtrarPorPeriodo([], 'año')).toHaveLength(0);
			} finally {
				nowMock.mockRestore();
			}
		});
	});

	// ─────────────────────────────────────────────────────────────
	// calcularResumenPeriodo()
	// ─────────────────────────────────────────────────────────────
	describe('calcularResumenPeriodo()', () => {
		it('calcula totalHoras, mediaDiaria, diasTrabajados, totalJornadas', () => {
			const jornadas: Jornada[] = [
				{
					id: 1,
					start_time: new Date(2026, 5, 15, 9, 0),
					end_time: new Date(2026, 5, 15, 17, 0),
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null,
					duration: 480, // 8 h
					status: 'closed',
					synced: 1
				},
				{
					id: 2,
					start_time: new Date(2026, 5, 16, 9, 0),
					end_time: new Date(2026, 5, 16, 17, 0),
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null,
					duration: 480, // 8 h
					status: 'closed',
					synced: 1
				},
				{
					id: 3,
					start_time: new Date(2026, 5, 17, 9, 0),
					end_time: new Date(2026, 5, 17, 13, 0),
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null,
					duration: 240, // 4 h
					status: 'closed',
					synced: 1
				}
			];

			const resumen = calcularResumenPeriodo(jornadas);

			expect(resumen.totalHoras).toBe(20);           // 8 + 8 + 4 = 20 h
			expect(resumen.diasTrabajados).toBe(3);        // 3 días únicos
			expect(resumen.totalJornadas).toBe(3);         // 3 jornadas
			expect(resumen.mediaDiaria).toBeCloseTo(20 / 3); // ~6.67 h/día
		});

		it('maneja array vacío y retorna ceros', () => {
			const resumen = calcularResumenPeriodo([]);

			expect(resumen.totalHoras).toBe(0);
			expect(resumen.mediaDiaria).toBe(0);
			expect(resumen.diasTrabajados).toBe(0);
			expect(resumen.totalJornadas).toBe(0);
		});

		it('agrupa correctamente jornadas del mismo día (cuenta días únicos)', () => {
			const mismaFecha = new Date(2026, 5, 15, 9, 0);
			const jornadas: Jornada[] = [
				{
					id: 1,
					start_time: mismaFecha,
					end_time: new Date(2026, 5, 15, 12, 0),
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null,
					duration: 180, // 3 h
					status: 'closed',
					synced: 1
				},
				{
					id: 2,
					start_time: new Date(2026, 5, 15, 14, 0),
					end_time: new Date(2026, 5, 15, 18, 0),
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null,
					duration: 240, // 4 h
					status: 'closed',
					synced: 1
				},
				{
					id: 3,
					start_time: new Date(2026, 5, 16, 9, 0),
					end_time: new Date(2026, 5, 16, 17, 0),
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null,
					duration: 480, // 8 h
					status: 'closed',
					synced: 1
				}
			];

			const resumen = calcularResumenPeriodo(jornadas);

			expect(resumen.totalHoras).toBe(15);       // 3 + 4 + 8 = 15 h
			expect(resumen.diasTrabajados).toBe(2);     // Solo 2 días únicos (15 y 16)
			expect(resumen.totalJornadas).toBe(3);      // 3 jornadas
			expect(resumen.mediaDiaria).toBe(7.5);      // 15 / 2 = 7.5 h/día
		});
	});

	// ─────────────────────────────────────────────────────────────
	// formatearHorasDecimal()
	// ─────────────────────────────────────────────────────────────
	describe('formatearHorasDecimal()', () => {
		it('convierte 8.5 → "8h 30m"', () => {
			expect(formatearHorasDecimal(8.5)).toBe('8h 30m');
		});

		it('convierte 0 → "0h 0m"', () => {
			expect(formatearHorasDecimal(0)).toBe('0h 0m');
		});

		it('maneja carry-over: 8.999 → "9h 0m" (no "8h 60m")', () => {
			expect(formatearHorasDecimal(8.999)).toBe('9h 0m');
		});

		it('redondea minutos correctamente: 8.749 → "8h 45m"', () => {
			expect(formatearHorasDecimal(8.749)).toBe('8h 45m');
		});

		it('formatea horas enteras sin decimales: 8.0 → "8h 0m"', () => {
			expect(formatearHorasDecimal(8.0)).toBe('8h 0m');
		});

		it('maneja valores grandes: 100.5 → "100h 30m"', () => {
			expect(formatearHorasDecimal(100.5)).toBe('100h 30m');
		});
	});
});
