import { describe, it, expect, vi } from 'vitest';
import {
	PRIMER_DIA_SEMANA,
	inicioDia,
	claveDia,
	mismoDia,
	diaDeJornada,
	inicioSemana
} from '$lib/utils/fecha-negocio';
import { agruparPorDia, calcularResumenPeriodo } from '$lib/utils/dashboard-calc';
import { filtrarPorPeriodo, obtenerRangoPeriodo } from '$lib/utils/dashboard-periodo';
import type { Jornada } from '$lib/db';

/**
 * Factory de jornada cerrada con start/end explícitos. `duration` en minutos.
 * Permite construir jornadas que cruzan medianoche.
 */
function jornada(id: number, start: Date, end: Date): Jornada {
	return {
		id,
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

describe('fecha-negocio', () => {
	// ─────────────────────────────────────────────────────────────
	// Regla 1: atribución por fecha de inicio (cruce de medianoche)
	// ─────────────────────────────────────────────────────────────
	describe('Regla 1 — atribución por fecha de inicio', () => {
		// 21-06-2026 22:00 → 22-06-2026 02:00 (4h) cuenta en el día 21
		const start = new Date(2026, 5, 21, 22, 0);
		const end = new Date(2026, 5, 22, 2, 0);
		const nocturna = jornada(1, start, end);

		it('diaDeJornada devuelve el día de inicio, no el de fin', () => {
			expect(diaDeJornada(nocturna).getTime()).toBe(inicioDia(new Date(2026, 5, 21)).getTime());
			expect(diaDeJornada(nocturna).getDate()).toBe(21);
		});

		it('claveDia del start_time es la del día de inicio aunque end_time sea el día siguiente', () => {
			expect(claveDia(nocturna.start_time)).toBe('2026-06-21');
			expect(claveDia(nocturna.end_time!)).toBe('2026-06-22');
		});

		it('calcularResumenPeriodo cuenta 1 día trabajado y las 4h completas', () => {
			const resumen = calcularResumenPeriodo([nocturna]);
			expect(resumen.diasTrabajados).toBe(1);
			expect(resumen.totalHoras).toBe(4);
		});

		it('agruparPorDia agrupa bajo el día de inicio (15 jun 2026), nunca el siguiente', () => {
			// Usamos una fecha antigua para que la clave sea "DD MMM YYYY" y no "Hoy"
			const start15 = new Date(2026, 5, 15, 22, 0);
			const end16 = new Date(2026, 5, 16, 2, 0);
			const grupos = agruparPorDia([jornada(2, start15, end16)]);
			expect(grupos.has('15 jun 2026')).toBe(true);
			expect(grupos.has('16 jun 2026')).toBe(false);
		});

		it('filtrarPorPeriodo(semana): jornada domingo 23:00 → lunes 01:00 cuenta en la semana del domingo', () => {
			const hoy = new Date(2026, 5, 21); // domingo 21 junio 2026
			// Empieza domingo 21 23:00, termina lunes 22 01:00 (semana siguiente)
			const cruza = jornada(3, new Date(2026, 5, 21, 23, 0), new Date(2026, 5, 22, 1, 0));
			const nowMock = vi.spyOn(Date, 'now').mockReturnValue(hoy.getTime());
			try {
				const resultado = filtrarPorPeriodo([cruza], 'semana');
				expect(resultado).toHaveLength(1);
				expect(resultado[0].id).toBe(3);
			} finally {
				nowMock.mockRestore();
			}
		});
	});

	// ─────────────────────────────────────────────────────────────
	// Regla 2: semanas de lunes a domingo
	// ─────────────────────────────────────────────────────────────
	describe('Regla 2 — semana lunes a domingo', () => {
		it('PRIMER_DIA_SEMANA es lunes (1)', () => {
			expect(PRIMER_DIA_SEMANA).toBe(1);
		});

		it('inicioSemana devuelve el lunes para cualquier día de la semana', () => {
			const lunes = new Date(2026, 5, 15); // lunes 15 junio 2026
			for (let i = 0; i < 7; i++) {
				const dia = new Date(2026, 5, 15 + i);
				expect(claveDia(inicioSemana(dia))).toBe(claveDia(lunes));
			}
		});

		it('un lunes a las 00:00 es su propio inicio de semana (no retrocede)', () => {
			const lunes = new Date(2026, 5, 22, 0, 0); // lunes 22 junio
			expect(inicioSemana(lunes).getDate()).toBe(22);
		});

		it('seam: con primerDia=0 (domingo) el domingo es inicio de semana', () => {
			const domingo = new Date(2026, 5, 21); // domingo 21 junio
			expect(inicioSemana(domingo, 0).getDate()).toBe(21);
			// Por defecto (lunes) ese domingo pertenece a la semana del lunes 15
			expect(inicioSemana(domingo).getDate()).toBe(15);
		});

		it('obtenerRangoPeriodo(semana) para un domingo: lunes 00:00 → domingo 00:00', () => {
			const domingo = inicioDia(new Date(2026, 5, 21));
			const { inicio, fin } = obtenerRangoPeriodo('semana', domingo);
			expect(inicio.getDate()).toBe(15); // lunes
			expect(fin.getDate()).toBe(21); // domingo
			expect(fin.getHours()).toBe(0);
		});

		it('una jornada del domingo y otra del lunes siguiente caen en semanas distintas', () => {
			const hoy = new Date(2026, 5, 21); // domingo 21
			const domingo = jornada(1, new Date(2026, 5, 21, 9, 0), new Date(2026, 5, 21, 13, 0));
			const lunesSiguiente = jornada(2, new Date(2026, 5, 22, 9, 0), new Date(2026, 5, 22, 13, 0));
			const nowMock = vi.spyOn(Date, 'now').mockReturnValue(hoy.getTime());
			try {
				const resultado = filtrarPorPeriodo([domingo, lunesSiguiente], 'semana');
				expect(resultado).toHaveLength(1);
				expect(resultado[0].id).toBe(1);
			} finally {
				nowMock.mockRestore();
			}
		});
	});

	// ─────────────────────────────────────────────────────────────
	// Regla 3: fechas guardadas en UTC, usadas en local
	// ─────────────────────────────────────────────────────────────
	describe('Regla 3 — interpretación en hora local', () => {
		it('claveDia usa componentes locales (getFullYear/Month/Date), no UTC', () => {
			const fecha = new Date(2026, 5, 21, 23, 30); // 21 jun 23:30 local
			expect(claveDia(fecha)).toBe('2026-06-21');
		});

		it('mismoDia compara por día natural local ignorando la hora', () => {
			const manana = new Date(2026, 5, 21, 9, 0);
			const noche = new Date(2026, 5, 21, 23, 59);
			const siguiente = new Date(2026, 5, 22, 0, 1);
			expect(mismoDia(manana, noche)).toBe(true);
			expect(mismoDia(noche, siguiente)).toBe(false);
		});

		it('inicioDia no muta el argumento original', () => {
			const original = new Date(2026, 5, 21, 14, 30, 15);
			const copia = inicioDia(original);
			expect(original.getHours()).toBe(14); // intacto
			expect(copia.getHours()).toBe(0);
		});
	});
});
