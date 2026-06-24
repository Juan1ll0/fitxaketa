import { describe, it, expect, vi } from 'vitest';
import {
	formatearFecha,
	formatearFechaLarga,
	calcularResumenDia,
	agruparPorDia,
	formatearHora,
	formatearDuracion,
	filtrarPorPeriodo,
	calcularResumenPeriodo,
	formatearHorasDecimal,
	formatearHorasCorto,
	prepararDatosGrafica
} from '$lib/utils/dashboard';
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
		it('formatea minutos como HH:MM', () => {
			expect(formatearDuracion(125)).toBe('02:05');
		});

		it('formatea 0 minutos como 00:00', () => {
			expect(formatearDuracion(0)).toBe('00:00');
		});

		it('formatea 60 minutos como 01:00', () => {
			expect(formatearDuracion(60)).toBe('01:00');
		});

		it('retorna "En curso" para null', () => {
			expect(formatearDuracion(null)).toBe('En curso');
		});
	});

	// ─────────────────────────────────────────────────────────────
	// filtrarPorPeriodo()
	// ─────────────────────────────────────────────────────────────
	describe('filtrarPorPeriodo()', () => {
		interface OpcionesJornadaEnFecha {
			id: number;
			year: number;
			month: number;
			day: number;
			hour: number;
			durationMinutes: number;
		}

		/** Factory de jornada cerrada en una fecha específica (mes 5 = junio). */
		function jornadaEnFecha(opciones: OpcionesJornadaEnFecha): Jornada {
			const { id, year, month, day, hour, durationMinutes } = opciones;
			return {
				id,
				start_time: new Date(year, month - 1, day, hour, 0),
				end_time: new Date(
					year,
					month - 1,
					day,
					hour + Math.floor(durationMinutes / 60),
					durationMinutes % 60
				),
				lat_start: null,
				lng_start: null,
				lat_end: null,
				lng_end: null,
				duration: durationMinutes,
				status: 'closed',
				synced: 1
			};
		}

		interface OpcionesJornadaAbiertaEnFecha {
			id: number;
			year: number;
			month: number;
			day: number;
			hour: number;
		}

		function jornadaAbiertaEnFecha(opciones: OpcionesJornadaAbiertaEnFecha): Jornada {
			const { id, year, month, day, hour } = opciones;
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

				const jornadas: Jornada[] = [
					jornadaEnFecha({ id: 1, year: 2026, month: 6, day: 15, hour: 9, durationMinutes: 480 }), // hace 6 días → dentro de semana
					jornadaEnFecha({ id: 2, year: 2026, month: 6, day: 13, hour: 9, durationMinutes: 480 }) // hace 8 días → fuera de semana
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

				const jornadas: Jornada[] = [
					jornadaEnFecha({ id: 1, year: 2026, month: 6, day: 1, hour: 9, durationMinutes: 480 }), // hace 20 días → dentro de mes
					jornadaEnFecha({ id: 2, year: 2026, month: 4, day: 17, hour: 9, durationMinutes: 480 }) // hace 35 días → fuera de mes
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

			it('devuelve solo jornadas dentro del año natural en curso', () => {
				const hoy = new Date(2026, 5, 21);

				const jornadas: Jornada[] = [
					jornadaEnFecha({ id: 1, year: 2026, month: 3, day: 15, hour: 9, durationMinutes: 480 }), // mismo año → incluida
					jornadaEnFecha({ id: 2, year: 2025, month: 8, day: 1, hour: 9, durationMinutes: 480 }) // año anterior → excluida
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
					jornadaEnFecha({ id: 1, year: 2026, month: 6, day: 20, hour: 9, durationMinutes: 480 }), // cerrada → incluida
					jornadaAbiertaEnFecha({ id: 2, year: 2026, month: 6, day: 21, hour: 14 }) // abierta → excluida
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
				jornadaEnFecha({ id: 1, year: 2025, month: 1, day: 1, hour: 9, durationMinutes: 480 }) // hace más de un año
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

		it('excluye jornadas abiertas aunque estén dentro del rango de fechas', () => {
			const hoy = new Date(2026, 5, 21);
			const jornadas: Jornada[] = [
				jornadaAbiertaEnFecha({ id: 1, year: 2026, month: 6, day: 20, hour: 9 }), // abierta
				jornadaEnFecha({ id: 2, year: 2026, month: 6, day: 21, hour: 10, durationMinutes: 480 }) // cerrada
			];

			const nowMock = vi.spyOn(Date, 'now').mockReturnValue(hoy.getTime());
			try {
				const resultado = filtrarPorPeriodo(jornadas, 'semana');
				// Solo la cerrada debe estar, la abierta se excluye
				expect(resultado).toHaveLength(1);
				expect(resultado[0].id).toBe(2);
				expect(resultado[0].status).toBe('closed');
			} finally {
				nowMock.mockRestore();
			}
		});

		it('excluye jornadas con status !== "closed"', () => {
			const hoy = new Date(2026, 5, 21);
			const jornadas: Jornada[] = [
				jornadaEnFecha({ id: 1, year: 2026, month: 6, day: 20, hour: 9, durationMinutes: 480 }),
				jornadaAbiertaEnFecha({ id: 2, year: 2026, month: 6, day: 20, hour: 14 })
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

			expect(resumen.totalHoras).toBe(20); // 8 + 8 + 4 = 20 h
			expect(resumen.diasTrabajados).toBe(3); // 3 días únicos
			expect(resumen.totalJornadas).toBe(3); // 3 jornadas
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

			expect(resumen.totalHoras).toBe(15); // 3 + 4 + 8 = 15 h
			expect(resumen.diasTrabajados).toBe(2); // Solo 2 días únicos (15 y 16)
			expect(resumen.totalJornadas).toBe(3); // 3 jornadas
			expect(resumen.mediaDiaria).toBe(7.5); // 15 / 2 = 7.5 h/día
		});

		it('no cuenta jornadas abiertas (duration null) en totalHoras ni diasTrabajados', () => {
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
					end_time: null,
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null,
					duration: null, // abierta
					status: 'open',
					synced: 0
				}
			];

			const resumen = calcularResumenPeriodo(jornadas);

			expect(resumen.totalHoras).toBe(8); // Solo la cerrada
			expect(resumen.diasTrabajados).toBe(1); // Solo 1 día (la cerrada)
			expect(resumen.totalJornadas).toBe(2); // Ambas jornadas en total
			expect(resumen.mediaDiaria).toBe(8); // 8h / 1 día
		});

		it('retorna ceros cuando todas las jornadas están abiertas', () => {
			const jornadas: Jornada[] = [
				{
					id: 1,
					start_time: new Date(2026, 5, 15, 9, 0),
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
					start_time: new Date(2026, 5, 16, 9, 0),
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

			const resumen = calcularResumenPeriodo(jornadas);

			expect(resumen.totalHoras).toBe(0);
			expect(resumen.mediaDiaria).toBe(0);
			expect(resumen.diasTrabajados).toBe(0); // Sin jornadas cerradas, no hay días trabajados
			expect(resumen.totalJornadas).toBe(2); // Las jornadas abiertas se siguen contando
		});

		it('calcula correctamente con múltiples jornadas en el mismo día', () => {
			const mismaFecha = new Date(2026, 5, 15, 8, 0);
			const jornadas: Jornada[] = [
				{
					id: 1,
					start_time: mismaFecha,
					end_time: new Date(2026, 5, 15, 12, 0),
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null,
					duration: 240,
					status: 'closed',
					synced: 1
				},
				{
					id: 2,
					start_time: new Date(2026, 5, 15, 13, 0),
					end_time: new Date(2026, 5, 15, 17, 0),
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null,
					duration: 240,
					status: 'closed',
					synced: 1
				},
				{
					id: 3,
					start_time: new Date(2026, 5, 15, 18, 0),
					end_time: new Date(2026, 5, 15, 20, 0),
					lat_start: null,
					lng_start: null,
					lat_end: null,
					lng_end: null,
					duration: 120,
					status: 'closed',
					synced: 1
				}
			];

			const resumen = calcularResumenPeriodo(jornadas);

			expect(resumen.totalHoras).toBe(10); // 4 + 4 + 2 = 10 h
			expect(resumen.diasTrabajados).toBe(1); // Solo 1 día único
			expect(resumen.totalJornadas).toBe(3); // 3 jornadas
			expect(resumen.mediaDiaria).toBe(10); // 10h / 1 día = 10h/día
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

	// ─────────────────────────────────────────────────────────────
	// formatearHorasCorto()
	// ─────────────────────────────────────────────────────────────
	describe('formatearHorasCorto()', () => {
		it('hora entera sin decimal: 8.0 → "8h"', () => {
			expect(formatearHorasCorto(8)).toBe('8h');
		});

		it('0 → "0h"', () => {
			expect(formatearHorasCorto(0)).toBe('0h');
		});

		it('decimal con coma: 106.25 → "106,3h"', () => {
			expect(formatearHorasCorto(106.25)).toBe('106,3h');
		});

		it('decimal exacto: 167.5 → "167,5h"', () => {
			expect(formatearHorasCorto(167.5)).toBe('167,5h');
		});

		it('redondea a 1 decimal: 8.749 → "8,7h"', () => {
			expect(formatearHorasCorto(8.749)).toBe('8,7h');
		});

		it('valores grandes: 178.33 → "178,3h"', () => {
			expect(formatearHorasCorto(178.33)).toBe('178,3h');
		});
	});

	// ─────────────────────────────────────────────────────────────
	// formatearFechaLarga()
	// ─────────────────────────────────────────────────────────────
	describe('formatearFechaLarga()', () => {
		it('formatea con el mes capitalizado', () => {
			const fecha = new Date(2026, 5, 23);
			expect(formatearFechaLarga(fecha)).toBe('23 de Junio de 2026');
		});
	});

	// ─────────────────────────────────────────────────────────────
	// prepararDatosGrafica()
	// ─────────────────────────────────────────────────────────────
	describe('prepararDatosGrafica()', () => {
		function jornadaEnFechaCompleta(opciones: {
			id: number;
			year: number;
			month: number;
			day: number;
			hour: number;
			durationMinutes: number;
		}): Jornada {
			const { id, year, month, day, hour, durationMinutes } = opciones;
			return {
				id,
				start_time: new Date(year, month - 1, day, hour, 0),
				end_time: new Date(
					year,
					month - 1,
					day,
					hour + Math.floor(durationMinutes / 60),
					durationMinutes % 60
				),
				lat_start: null,
				lng_start: null,
				lat_end: null,
				lng_end: null,
				duration: durationMinutes,
				status: 'closed',
				synced: 1
			};
		}

		it('genera datasets apilados con todos los días de la semana', () => {
			const hoy = new Date(2026, 5, 21); // Domingo 21 junio 2026

			const jornadas: Jornada[] = [
				jornadaEnFechaCompleta({
					id: 1,
					year: 2026,
					month: 6,
					day: 15,
					hour: 9,
					durationMinutes: 240
				}),
				jornadaEnFechaCompleta({
					id: 2,
					year: 2026,
					month: 6,
					day: 15,
					hour: 14,
					durationMinutes: 120
				}),
				jornadaEnFechaCompleta({
					id: 3,
					year: 2026,
					month: 6,
					day: 16,
					hour: 9,
					durationMinutes: 480
				})
			];

			const nowMock = vi.spyOn(Date, 'now').mockReturnValue(hoy.getTime());
			try {
				const datos = prepararDatosGrafica(jornadas, 'semana');

				expect(datos.labels).toHaveLength(7); // 7 días de la semana
				expect(datos.labels[0]).toBe('15'); // Lunes
				expect(datos.labels[6]).toBe('21'); // Domingo
				expect(datos.datasets).toHaveLength(2); // Max 2 jornadas en un día
				expect(datos.datasets[0].label).toBe('Jornada 1');
				expect(datos.datasets[0].backgroundColor).toBe('#3b82f6');
				expect(datos.datasets[0].data[0]).toBe(4); // 15 junio: 4h
				expect(datos.datasets[0].data[1]).toBe(8); // 16 junio: 8h
				expect(datos.datasets[0].data[2]).toBe(0); // 17 junio: 0h
				expect(datos.datasets[1].data[0]).toBe(2); // 15 junio: 2h (2ª jornada)
				expect(datos.datasets[1].data[1]).toBe(0); // 16 junio: 0h
			} finally {
				nowMock.mockRestore();
			}
		});

		it('genera 12 etiquetas para el periodo anual', () => {
			const jornadas: Jornada[] = [
				jornadaEnFechaCompleta({
					id: 1,
					year: 2026,
					month: 1,
					day: 10,
					hour: 9,
					durationMinutes: 480
				}),
				jornadaEnFechaCompleta({
					id: 2,
					year: 2026,
					month: 1,
					day: 11,
					hour: 9,
					durationMinutes: 240
				}),
				jornadaEnFechaCompleta({
					id: 3,
					year: 2026,
					month: 6,
					day: 21,
					hour: 9,
					durationMinutes: 120
				})
			];

			const datos = prepararDatosGrafica(jornadas, 'año');

			expect(datos.labels).toEqual([
				'Ene',
				'Feb',
				'Mar',
				'Abr',
				'May',
				'Jun',
				'Jul',
				'Ago',
				'Sep',
				'Oct',
				'Nov',
				'Dic'
			]);
			expect(datos.datasets).toHaveLength(1);
			expect(datos.datasets[0].data[0]).toBe(12); // Enero: 12h
			expect(datos.datasets[0].data[5]).toBe(2); // Junio: 2h
			expect(datos.datasets[0].data[1]).toBe(0); // Febrero: 0h
			expect(datos.datasets[0].backgroundColor).toBe('#3b82f6');
		});
	});
});
