/**
 * Tests para formatearIndicadorPeriodo en dashboard-format.ts
 *
 * ACs cubiertos: AC-08
 */
import { describe, it, expect } from 'vitest';
import { formatearIndicadorPeriodo } from '$lib/utils/dashboard-format';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Crea una fecha (mes 1-indexed para claridad en los tests). */
function fecha(year: number, month: number, day: number): Date {
	return new Date(year, month - 1, day);
}

// ─── Semana ─────────────────────────────────────────────────────────────────

describe('formatearIndicadorPeriodo() — semana', () => {
	// AC-08: indicador muestra "Semana del X al Y mes"
	it('formatea semana normal: "Semana del 15 jun al 21 jun" (AC-08)', () => {
		// miércoles 17 jun 2026 → semana del 15 al 21 jun
		const miercoles17 = fecha(2026, 6, 17);
		const resultado = formatearIndicadorPeriodo('semana', miercoles17);
		expect(resultado).toBe('Semana del 15 jun al 21 jun');
	});

	it('semana que cruza meses: 29 jun al 5 jul', () => {
		// lunes 30 junio 2026 → semana del 29 jun al 5 jul
		const lunes30 = fecha(2026, 6, 30);
		const resultado = formatearIndicadorPeriodo('semana', lunes30);
		expect(resultado).toContain('29 jun');
		expect(resultado).toContain('5 jul');
	});

	it('semana que cruza años: 29 dic 2025 al 4 ene 2026', () => {
		// lunes 29 diciembre 2025
		const lunes29 = fecha(2025, 12, 29);
		const resultado = formatearIndicadorPeriodo('semana', lunes29);
		expect(resultado).toContain('29 dic');
		expect(resultado).toContain('4 ene');
		expect(resultado).toContain('2026'); // año diferente, se muestra
	});

	it('primer día de semana configurable (domingo como inicio)', () => {
		// domingo 21 junio 2026 → si primerDia=0, semana empieza en domingo 21
		const domingo = fecha(2026, 6, 21);
		const resultado = formatearIndicadorPeriodo('semana', domingo, 0);
		expect(resultado).toBe('Semana del 21 jun al 27 jun');
	});

	it('lunes como primer día (default)', () => {
		// mismo domingo 21 junio, pero con lunes como primer día
		const domingo = fecha(2026, 6, 21);
		const resultado = formatearIndicadorPeriodo('semana', domingo, 1);
		expect(resultado).toBe('Semana del 15 jun al 21 jun');
	});
});

// ─── Mes ────────────────────────────────────────────────────────────────────

describe('formatearIndicadorPeriodo() — mes', () => {
	// AC-08: indicador muestra "Junio 2026"
	it('formatea mes: "Junio 2026" (AC-08)', () => {
		const jun15 = fecha(2026, 6, 15);
		const resultado = formatearIndicadorPeriodo('mes', jun15);
		expect(resultado).toBe('Junio 2026');
	});

	it('enero se capitaliza correctamente', () => {
		const ene15 = fecha(2026, 1, 15);
		const resultado = formatearIndicadorPeriodo('mes', ene15);
		expect(resultado).toBe('Enero 2026');
	});

	it('diciembre', () => {
		const dic15 = fecha(2026, 12, 15);
		const resultado = formatearIndicadorPeriodo('mes', dic15);
		expect(resultado).toBe('Diciembre 2026');
	});

	// Edge case: inicio de mes (1 de enero)
	it('primer día del mes funciona igual que cualquier otro', () => {
		const primeroEnero = fecha(2026, 1, 1);
		const resultado = formatearIndicadorPeriodo('mes', primeroEnero);
		expect(resultado).toBe('Enero 2026');
	});

	// Edge case: fin de mes (31 de diciembre)
	it('último día del mes funciona igual que cualquier otro', () => {
		const treintaiunoDic = fecha(2026, 12, 31);
		const resultado = formatearIndicadorPeriodo('mes', treintaiunoDic);
		expect(resultado).toBe('Diciembre 2026');
	});
});

// ─── Año ────────────────────────────────────────────────────────────────────

describe('formatearIndicadorPeriodo() — año', () => {
	// AC-08: indicador muestra "2026"
	it('formatea año: "2026" (AC-08)', () => {
		const jun15 = fecha(2026, 6, 15);
		const resultado = formatearIndicadorPeriodo('año', jun15);
		expect(resultado).toBe('2026');
	});

	it('año 2025', () => {
		const dic2025 = fecha(2025, 12, 31);
		const resultado = formatearIndicadorPeriodo('año', dic2025);
		expect(resultado).toBe('2025');
	});

	it('no incluye mes ni día, solo el año', () => {
		const primeroEnero = fecha(2026, 1, 1);
		const resultado = formatearIndicadorPeriodo('año', primeroEnero);
		expect(resultado).toBe('2026');
		// No debe contener "Enero" ni "1"
		expect(resultado).not.toContain('Enero');
		expect(resultado).not.toMatch(/1/); // al menos no como indicador de día
	});
});

// ─── Trimestre ──────────────────────────────────────────────────────────────

describe('formatearIndicadorPeriodo() — trimestre', () => {
	it('Q1 2026', () => {
		const enero = fecha(2026, 1, 15);
		const resultado = formatearIndicadorPeriodo('trimestre', enero);
		expect(resultado).toBe('Trimestre 1 2026');
	});

	it('Q2 2026', () => {
		const abril = fecha(2026, 4, 15);
		const resultado = formatearIndicadorPeriodo('trimestre', abril);
		expect(resultado).toBe('Trimestre 2 2026');
	});

	it('Q3 2026', () => {
		const julio = fecha(2026, 7, 1);
		const resultado = formatearIndicadorPeriodo('trimestre', julio);
		expect(resultado).toBe('Trimestre 3 2026');
	});

	it('Q4 2026', () => {
		const octubre = fecha(2026, 10, 15);
		const resultado = formatearIndicadorPeriodo('trimestre', octubre);
		expect(resultado).toBe('Trimestre 4 2026');
	});
});

// ─── Edge cases ─────────────────────────────────────────────────────────────

describe('formatearIndicadorPeriodo() — edge cases', () => {
	describe('año bisiesto', () => {
		it('febrero en año bisiesto tiene 29 días (no afecta al formateo)', () => {
			// 2028 es año bisiesto
			const feb29 = fecha(2028, 2, 29);
			const resultado = formatearIndicadorPeriodo('mes', feb29);
			expect(resultado).toBe('Febrero 2028');
		});

		it('semana que incluye 29 febrero en año bisiesto', () => {
			// lunes 28 feb 2028 → semana del 28 feb al 5 mar
			const lunes28 = fecha(2028, 2, 28);
			const resultado = formatearIndicadorPeriodo('semana', lunes28);
			expect(resultado).toContain('28 feb');
			expect(resultado).toContain('5 mar');
		});
	});

	describe('inicio/fin de mes', () => {
		it('1 de enero', () => {
			const primeroEnero = fecha(2026, 1, 1);
			const semana = formatearIndicadorPeriodo('semana', primeroEnero);
			// La semana del 1 ene 2026 empieza el 29 dic 2025
			expect(semana).toBe('Semana del 29 dic 2025 al 4 ene 2026');
		});

		it('31 de diciembre', () => {
			const treintaiunoDic = fecha(2026, 12, 31);
			const semana = formatearIndicadorPeriodo('semana', treintaiunoDic);
			// La semana del 31 dic 2026 empieza el 28 dic
			expect(semana).toBe('Semana del 28 dic 2026 al 3 ene 2027');
		});
	});
});
