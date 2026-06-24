import { describe, it, expect } from 'vitest';
import {
	filtrarPorFecha,
	filtrarPorRango,
	filtrarPorEstado,
	aplicarFiltroTemporal,
	parseFechaLocal
} from '$lib/utils/historial-filtros';
import type { Jornada } from '$lib/db';

function makeJornada(dateStr: string, status: 'open' | 'closed' = 'closed'): Jornada {
	return {
		id: Math.random(),
		start_time: parseFechaLocal(dateStr),
		end_time: status === 'closed' ? parseFechaLocal(dateStr) : null,
		lat_start: null,
		lng_start: null,
		lat_end: null,
		lng_end: null,
		duration: null,
		status,
		synced: false,
		created_at: parseFechaLocal(dateStr),
		updated_at: parseFechaLocal(dateStr)
	} as unknown as Jornada;
}

describe('filtrarPorFecha', () => {
	it('debería incluir jornadas del mismo día', () => {
		const target = parseFechaLocal('2026-06-15');
		const jornadas = [makeJornada('2026-06-15'), makeJornada('2026-06-15')];
		const result = filtrarPorFecha(jornadas, target);
		expect(result).toHaveLength(2);
	});

	it('debería excluir jornadas de otros días', () => {
		const target = parseFechaLocal('2026-06-15');
		const jornadas = [makeJornada('2026-06-14'), makeJornada('2026-06-16')];
		const result = filtrarPorFecha(jornadas, target);
		expect(result).toHaveLength(0);
	});

	// AC-07: límite de medianoche
	it('debería incluir jornada que empieza justo a medianoche del día buscado', () => {
		const target = parseFechaLocal('2026-06-15');
		const midnightJornada = {
			...makeJornada('2026-06-15'),
			start_time: new Date(2026, 5, 15, 0, 0, 0)
		};
		const jornadas = [midnightJornada];
		const result = filtrarPorFecha(jornadas, target);
		expect(result).toHaveLength(1);
	});

	it('debería excluir jornada del día anterior que termina a medianoche', () => {
		const target = parseFechaLocal('2026-06-15');
		const previousDay = {
			...makeJornada('2026-06-14'),
			start_time: new Date(2026, 5, 14, 23, 59, 59)
		};
		const result = filtrarPorFecha([previousDay], target);
		expect(result).toHaveLength(0);
	});
});

describe('filtrarPorRango', () => {
	// AC-12: inclusivo en ambos extremos
	it('debería incluir jornada justo en fecha desde', () => {
		const desde = parseFechaLocal('2026-06-10');
		const hasta = parseFechaLocal('2026-06-20');
		const jornadas = [makeJornada('2026-06-10')];
		const result = filtrarPorRango(jornadas, desde, hasta);
		expect(result).toHaveLength(1);
	});

	it('debería incluir jornada justo en fecha hasta', () => {
		const desde = parseFechaLocal('2026-06-10');
		const hasta = parseFechaLocal('2026-06-20');
		const jornadas = [makeJornada('2026-06-20')];
		const result = filtrarPorRango(jornadas, desde, hasta);
		expect(result).toHaveLength(1);
	});

	it('debería excluir jornada fuera del rango', () => {
		const desde = parseFechaLocal('2026-06-10');
		const hasta = parseFechaLocal('2026-06-20');
		const jornadas = [makeJornada('2026-06-09'), makeJornada('2026-06-21')];
		const result = filtrarPorRango(jornadas, desde, hasta);
		expect(result).toHaveLength(0);
	});

	// AC-12: rango de un solo día equivale a filtrarPorFecha
	it('debería devolver mismo resultado que filtrarPorFecha para rango de un día', () => {
		const fecha = parseFechaLocal('2026-06-15');
		const jornadas = [
			makeJornada('2026-06-14'),
			makeJornada('2026-06-15'),
			makeJornada('2026-06-16')
		];
		const porFecha = filtrarPorFecha(jornadas, fecha);
		const porRango = filtrarPorRango(jornadas, fecha, fecha);
		expect(porRango).toEqual(porFecha);
	});
});

describe('filtrarPorEstado', () => {
	// AC-14
	it("'todas' debería devolver todas las jornadas", () => {
		const jornadas = [makeJornada('2026-06-15', 'open'), makeJornada('2026-06-16', 'closed')];
		const result = filtrarPorEstado(jornadas, 'todas');
		expect(result).toHaveLength(2);
	});

	it("'abiertas' debería devolver solo status='open'", () => {
		const jornadas = [
			makeJornada('2026-06-15', 'open'),
			makeJornada('2026-06-16', 'closed'),
			makeJornada('2026-06-17', 'open')
		];
		const result = filtrarPorEstado(jornadas, 'abiertas');
		expect(result).toHaveLength(2);
		result.forEach((j) => expect(j.status).toBe('open'));
	});

	it("'cerradas' debería devolver solo status='closed'", () => {
		const jornadas = [makeJornada('2026-06-15', 'open'), makeJornada('2026-06-16', 'closed')];
		const result = filtrarPorEstado(jornadas, 'cerradas');
		expect(result).toHaveLength(1);
		expect(result[0].status).toBe('closed');
	});
});

describe('aplicarFiltroTemporal', () => {
	// AC-15: dispatcher - cada tipo llama al filtro correcto
	it('debería llamar a filtrarPorFecha para tipo fecha', () => {
		const jornadas = [makeJornada('2026-06-15')];
		const filtro = { tipo: 'fecha' as const, fecha: parseFechaLocal('2026-06-15') };
		const result = aplicarFiltroTemporal(jornadas, filtro);
		expect(result).toHaveLength(1);
	});

	it('debería llamar a filtrarPorRango para tipo rango', () => {
		const desde = parseFechaLocal('2026-06-10');
		const hasta = parseFechaLocal('2026-06-15');
		const jornadas = [makeJornada('2026-06-12')];
		const filtro = { tipo: 'rango' as const, desde, hasta };
		const result = aplicarFiltroTemporal(jornadas, filtro);
		expect(result).toHaveLength(1);
	});

	it('tipo rango debería excluir fuera del rango', () => {
		const desde = parseFechaLocal('2026-06-10');
		const hasta = parseFechaLocal('2026-06-15');
		const jornadas = [makeJornada('2026-06-09')];
		const filtro = { tipo: 'rango' as const, desde, hasta };
		const result = aplicarFiltroTemporal(jornadas, filtro);
		expect(result).toHaveLength(0);
	});
});
