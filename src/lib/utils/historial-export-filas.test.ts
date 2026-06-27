/**
 * Tests para historial-export-filas.ts
 *
 * Verifica:
 * - formatearDuracionHHMM (formato hh:mm)
 * - determinarColumnas (5, 6 o 7 columnas)
 * - totalHorasGrupo (suma de horas)
 * - Date grouping: solo en primera jornada del día
 * - Total día en última fila del día (celda numérica)
 * - Balance diario en última fila del día (celda numérica, formato condicional)
 * - Total semana (7ª columna) solo en última fila de cada semana
 * - Sin resúmenes intermedios por sub-periodo
 */
import { describe, it, expect } from 'vitest';
import type { Cell } from 'write-excel-file/browser';
import type { Jornada, Settings } from '$lib/db';
import { crearWorkbook } from '$lib/utils/excel-wrapper';
import { claveDia } from '$lib/utils/fecha-negocio';
import {
	determinarColumnas,
	escribirAgrupadoPorMes,
	escribirAgrupadoPorSemana,
	escribirGlobal,
	formatearDuracionHHMM,
	totalHorasGrupo
} from '$lib/utils/historial-export-filas';
import type { ContextoFilas } from '$lib/utils/historial-export-filas';
import type { BalanceDia } from '$lib/utils/dashboard-types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeJornada(override: Partial<Jornada> = {}): Jornada {
	const start = override.start_time ?? new Date('2026-06-22T08:00:00');
	return {
		id: Math.random(),
		start_time: start,
		end_time: new Date(start.getTime() + 8 * 60 * 60 * 1000),
		duration: 480,
		status: 'closed',
		synced: 0,
		lat_start: null,
		lng_start: null,
		lat_end: null,
		lng_end: null,
		...override
	} as unknown as Jornada;
}

function makeSettings(override: Partial<Settings> = {}): Settings {
	return {
		id: 1,
		fecha: new Date('2026-01-01'),
		primer_dia_semana: 1,
		min_jornada_minutos: 0,
		horas_semanales: 37.5,
		dias_laborables: 5,
		redondeo_minutos: 0,
		...override
	};
}

function makeBalance(dia: Date, trabajadoMin: number, objetivoMin: number): BalanceDia {
	const key = claveDia(dia);
	return {
		claveDia: key,
		trabajado: trabajadoMin,
		objetivo: objetivoMin,
		balance: trabajadoMin - objetivoMin
	};
}

function makeContexto(
	override: Partial<ContextoFilas> = {},
	balances: BalanceDia[] = []
): ContextoFilas {
	const balancesMap = new Map<string, BalanceDia>();
	for (const b of balances) balancesMap.set(b.claveDia, b);
	return {
		snapshots: [makeSettings()],
		balances: balancesMap,
		tieneContrato: true,
		tieneTotalSemana: false,
		...override
	};
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('formatearDuracionHHMM (AC-09, AC-10)', () => {
	it('formatea 0 minutos como "00:00"', () => {
		expect(formatearDuracionHHMM(0)).toBe('00:00');
	});

	it('formatea 60 minutos como "01:00"', () => {
		expect(formatearDuracionHHMM(60)).toBe('01:00');
	});

	it('formatea 282 minutos (4h 42m) como "04:42"', () => {
		expect(formatearDuracionHHMM(282)).toBe('04:42');
	});

	it('formatea 480 minutos (8h) como "08:00"', () => {
		expect(formatearDuracionHHMM(480)).toBe('08:00');
	});

	it('usa cero a la izquierda para horas y minutos', () => {
		expect(formatearDuracionHHMM(5)).toBe('00:05');
		expect(formatearDuracionHHMM(65)).toBe('01:05');
	});

	it('soporta duraciones largas (24h+)', () => {
		expect(formatearDuracionHHMM(1500)).toBe('25:00');
	});
});

describe('determinarColumnas (AC-07, AC-13, AC-16)', () => {
	it('5 columnas sin contrato ni total semana', () => {
		expect(determinarColumnas(false, false)).toEqual([
			'Fecha',
			'Entrada',
			'Salida',
			'Duración',
			'Total día'
		]);
	});

	it('6 columnas con contrato (sin total semana)', () => {
		expect(determinarColumnas(true, false)).toEqual([
			'Fecha',
			'Entrada',
			'Salida',
			'Duración',
			'Total día',
			'Balance diario'
		]);
	});

	it('7 columnas con contrato y total semana (mes/año)', () => {
		expect(determinarColumnas(true, true)).toEqual([
			'Fecha',
			'Entrada',
			'Salida',
			'Duración',
			'Total día',
			'Balance diario',
			'Total semana'
		]);
	});

	it('5 columnas sin contrato aunque se pida total semana (no aplica)', () => {
		// Total semana requiere contrato; sin contrato solo 5 columnas
		expect(determinarColumnas(false, true)).toEqual([
			'Fecha',
			'Entrada',
			'Salida',
			'Duración',
			'Total día'
		]);
	});
});

describe('totalHorasGrupo', () => {
	it('devuelve 0 para grupo vacío', () => {
		expect(totalHorasGrupo([], [makeSettings()])).toBe(0);
	});

	it('suma horas decimales de varias jornadas', () => {
		const j1 = makeJornada({ start_time: new Date('2026-06-22T08:00:00') });
		const j2 = makeJornada({ start_time: new Date('2026-06-22T16:00:00') });
		expect(totalHorasGrupo([j1, j2], [makeSettings()])).toBe(16); // 8h + 8h
	});

	it('respeta el redondeo configurado en snapshots', () => {
		const j = makeJornada({
			start_time: new Date('2026-06-22T08:00:00'),
			end_time: new Date('2026-06-22T15:30:00')
		});
		expect(totalHorasGrupo([j], [makeSettings({ redondeo_minutos: 0 })])).toBe(7.5);
	});
});

describe('escribirGlobal — agrupación por día sin resúmenes', () => {
	it('escribe jornadas agrupadas por día (sin resúmenes intermedios)', () => {
		const wb = crearWorkbook();
		const j1 = makeJornada({ id: 1, start_time: new Date('2026-06-22T08:00:00') });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-06-23T08:00:00') });

		escribirGlobal(wb, [j1, j2], makeContexto());

		expect(wb.rows.length).toBe(2);
	});

	it('fecha vacía en jornadas posteriores del mismo día (date grouping)', () => {
		const wb = crearWorkbook();
		const j1 = makeJornada({ id: 1, start_time: new Date('2026-06-22T08:00:00') });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-06-22T13:00:00') });

		escribirGlobal(wb, [j1, j2], makeContexto());

		expect(wb.rows[0][0]).toMatch(/22\/06\/2026/);
		expect(wb.rows[1][0]).toBeNull();
	});

	it('Total día es una celda numérica con type:Number en última fila del día', () => {
		const wb = crearWorkbook();
		const dia = new Date('2026-06-22T08:00:00');
		const j1 = makeJornada({ id: 1, start_time: dia });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-06-22T13:00:00') });
		// 2 jornadas × 8h = 16h trabajadas, objetivo 7.5h
		const balance = makeBalance(dia, 960, 450);

		escribirGlobal(wb, [j1, j2], makeContexto({}, [balance]));

		// Primera fila: Total día null
		expect(wb.rows[0][4]).toBeNull();
		// Última fila: Total día como Cell con type:Number
		const totalCell = wb.rows[1][4] as Cell | null;
		expect(totalCell).toMatchObject({ type: Number, value: 16, format: '0.0' });
	});

	it('Duración en formato hh:mm (no decimal)', () => {
		const wb = crearWorkbook();
		const j = makeJornada({ start_time: new Date('2026-06-22T08:00:00') });

		escribirGlobal(wb, [j], makeContexto());

		expect(wb.rows[0][3]).toBe('08:00');
	});

	it('Balance diario es una celda numérica con formato condicional', () => {
		const wb = crearWorkbook();
		const dia = new Date('2026-06-22T08:00:00');
		const j = makeJornada({ start_time: dia });
		// 8h trabajadas, objetivo 7.5h, balance +0.5h
		const balance = makeBalance(dia, 480, 450);

		escribirGlobal(wb, [j], makeContexto({ tieneContrato: true }, [balance]));

		const balanceCell = wb.rows[0][5] as Cell | null;
		expect(balanceCell).toMatchObject({ type: Number, fontWeight: 'bold' });
	});

	it('Balance diario en rojo si es negativo', () => {
		const wb = crearWorkbook();
		const dia = new Date('2026-06-22T08:00:00');
		// 4h trabajadas, objetivo 7.5h, balance -3.5h
		const j = makeJornada({ start_time: dia, end_time: new Date('2026-06-22T12:00:00') });
		const balance = makeBalance(dia, 240, 450);

		escribirGlobal(wb, [j], makeContexto({ tieneContrato: true }, [balance]));

		const balanceCell = wb.rows[0][5] as Cell | null;
		expect(balanceCell).toMatchObject({ textColor: '#dc2626', value: -3.5 });
	});

	it('Balance diario en verde si es positivo', () => {
		const wb = crearWorkbook();
		const dia = new Date('2026-06-22T08:00:00');
		const j = makeJornada({ start_time: dia });
		const balance = makeBalance(dia, 480, 450);

		escribirGlobal(wb, [j], makeContexto({ tieneContrato: true }, [balance]));

		const balanceCell = wb.rows[0][5] as Cell | null;
		expect(balanceCell).toMatchObject({ textColor: '#16a34a' });
	});

	it('Total día null en filas no-últimas del día, valor en la última', () => {
		const wb = crearWorkbook();
		const dia = new Date('2026-06-22T08:00:00');
		const j1 = makeJornada({ id: 1, start_time: dia });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-06-22T13:00:00') });
		const j3 = makeJornada({ id: 3, start_time: new Date('2026-06-22T18:00:00') });
		const balance = makeBalance(dia, 1440, 450);

		escribirGlobal(wb, [j1, j2, j3], makeContexto({}, [balance]));

		expect(wb.rows[0][4]).toBeNull();
		expect(wb.rows[1][4]).toBeNull();
		expect(wb.rows[2][4]).toMatchObject({ type: Number });
	});
});

describe('escribirAgrupadoPorMes — sin resúmenes mensuales (AC-15)', () => {
	it('escribe todas las jornadas sin filas de resumen intermedias', () => {
		const wb = crearWorkbook();
		const j1 = makeJornada({ id: 1, start_time: new Date('2026-01-15T08:00:00') });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-02-15T08:00:00') });
		const j3 = makeJornada({ id: 3, start_time: new Date('2026-03-15T08:00:00') });

		escribirAgrupadoPorMes(wb, [j1, j2, j3], makeContexto());

		expect(wb.rows.length).toBe(3);
		// Ninguna fila debe tener "TOTAL" como label (esos van al final desde exportarJornadas)
		for (const row of wb.rows) {
			expect(row[0]).not.toBe('TOTAL');
		}
	});
});

describe('escribirAgrupadoPorSemana con Total semana (AC-16)', () => {
	it('con tieneTotalSemana=true agrupa por semanas', () => {
		const wb = crearWorkbook();
		// Semana 22-28 junio: lunes 22 a domingo 28
		const j1 = makeJornada({ id: 1, start_time: new Date('2026-06-22T08:00:00') });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-06-23T08:00:00') });
		const j3 = makeJornada({ id: 3, start_time: new Date('2026-06-29T08:00:00') }); // semana 2

		escribirAgrupadoPorSemana(
			wb,
			[j1, j2, j3],
			makeContexto({ tieneContrato: true, tieneTotalSemana: true }),
			1
		);

		// 2 jornadas (sem1) + separador + 1 jornada (sem2) = 4 filas
		expect(wb.rows.length).toBe(4);
	});

	it('añade celda Total semana (7ª columna) solo a la última fila de la semana', () => {
		const wb = crearWorkbook();
		const j1 = makeJornada({ id: 1, start_time: new Date('2026-06-22T08:00:00') });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-06-23T08:00:00') });

		escribirAgrupadoPorSemana(wb, [j1, j2], makeContexto({ tieneTotalSemana: true }), 1);

		// j1 (no última de la semana): 6 celdas (sin Total semana)
		expect(wb.rows[0]).toHaveLength(6);
		// j2 (última de la semana): 7 celdas (con Total semana)
		expect(wb.rows[1]).toHaveLength(7);
		const tsCell = wb.rows[1][6] as Cell | null;
		expect(tsCell).toMatchObject({ type: Number, fontWeight: 'bold', fontSize: 14 });
	});

	it('Total semana con fondo verde pastel para total >= 0', () => {
		const wb = crearWorkbook();
		const j1 = makeJornada({ id: 1, start_time: new Date('2026-06-22T08:00:00') });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-06-23T08:00:00') });

		escribirAgrupadoPorSemana(wb, [j1, j2], makeContexto({ tieneTotalSemana: true }), 1);

		const tsCell = wb.rows[1][6] as Cell | null;
		expect(tsCell).toMatchObject({ backgroundColor: '#bbf7d0' });
	});

	it('Total semana con fondo verde pastel para 2h+2h=4h', () => {
		const wb = crearWorkbook();
		const j1 = makeJornada({
			id: 1,
			start_time: new Date('2026-06-22T08:00:00'),
			end_time: new Date('2026-06-22T10:00:00')
		});
		const j2 = makeJornada({
			id: 2,
			start_time: new Date('2026-06-23T08:00:00'),
			end_time: new Date('2026-06-23T10:00:00')
		});

		escribirAgrupadoPorSemana(wb, [j1, j2], makeContexto({ tieneTotalSemana: true }), 1);

		const tsCell = wb.rows[1][6] as Cell | null;
		expect(tsCell).toMatchObject({ backgroundColor: '#bbf7d0', value: 4 });
	});

	it('añade separador entre semanas (excepto después de la última)', () => {
		const wb = crearWorkbook();
		const j1 = makeJornada({ id: 1, start_time: new Date('2026-06-22T08:00:00') });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-06-29T08:00:00') });

		escribirAgrupadoPorSemana(wb, [j1, j2], makeContexto({ tieneTotalSemana: true }), 1);

		// 2 jornadas + 1 separador entre ellas
		expect(wb.rows.length).toBe(3);
		expect(wb.rows[1]).toEqual([]);
	});
});

describe('escribirAgrupadoPorSemana sin Total semana', () => {
	it('con tieneTotalSemana=false agrupa por días (sin semanas)', () => {
		const wb = crearWorkbook();
		const j1 = makeJornada({ id: 1, start_time: new Date('2026-06-22T08:00:00') });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-06-23T08:00:00') });

		escribirAgrupadoPorSemana(wb, [j1, j2], makeContexto({ tieneTotalSemana: false }), 1);

		// 2 jornadas, sin separador (no hay agrupación por semanas)
		expect(wb.rows.length).toBe(2);
		// Filas de 6 columnas (con contrato, sin Total semana)
		expect(wb.rows[0]).toHaveLength(6);
		expect(wb.rows[1]).toHaveLength(6);
	});
});
