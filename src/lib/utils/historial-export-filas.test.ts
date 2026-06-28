/**
 * Tests para historial-export-filas.ts
 *
 * Verifica:
 * - formatearDuracionHHMM (formato hh:mm)
 * - determinarColumnas (5, 6 u 8 columnas según contrato y sub-periodo)
 * - totalHorasGrupo (suma de horas)
 * - Date grouping: solo en primera jornada del día
 * - Total día en última fila del día (celda numérica)
 * - Balance diario en última fila del día (celda numérica, formato condicional)
 * - Total Semana/Mes (7ª col) y Balance Semana/Mes (8ª col) en última fila de periodo
 * - Borde inferior 2pt en la última fila de cada periodo (AC-18)
 * - Sin resúmenes intermedios por sub-periodo
 */
import { describe, it, expect } from 'vitest';
import type { Cell } from 'write-excel-file/browser';
import type { Jornada, Settings } from '$lib/db';
import { crearWorkbook } from '$lib/utils/excel-wrapper';
import { claveDia } from '$lib/utils/fecha-negocio';
import {
	determinarColumnas,
	escribirJornadas,
	formatearDuracionHHMM,
	totalHorasGrupo
} from '$lib/utils/historial-export-filas';
import type { ContextoFilas } from '$lib/utils/historial-export-filas';
import type { BalanceDia } from '$lib/utils/dashboard-types';
import type { CierrePeriodo, TipoSubPeriodo } from '$lib/utils/export-agrupacion';
import { agruparPorSemana, calcularCierresPorPeriodo } from '$lib/utils/export-agrupacion';

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
		subPeriodo: 'ninguno',
		primerDiaSemana: 1,
		...override
	};
}

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

describe('determinarColumnas (AC-07, AC-13, AC-15, AC-16, AC-19)', () => {
	it('5 columnas sin contrato, sin sub-periodo (semana/rango/fecha)', () => {
		expect(determinarColumnas(false, 'ninguno')).toEqual([
			'Fecha',
			'Entrada',
			'Salida',
			'Duración',
			'Total día'
		]);
	});

	it('6 columnas con contrato, sin sub-periodo', () => {
		expect(determinarColumnas(true, 'ninguno')).toEqual([
			'Fecha',
			'Entrada',
			'Salida',
			'Duración',
			'Total día',
			'Balance diario'
		]);
	});

	it('6 columnas sin contrato + sub-periodo semana (sin Balance Semana/Mes)', () => {
		expect(determinarColumnas(false, 'semana')).toEqual([
			'Fecha',
			'Entrada',
			'Salida',
			'Duración',
			'Total día',
			'Total Semana'
		]);
	});

	it('6 columnas sin contrato + sub-periodo mes (sin Balance Mes)', () => {
		expect(determinarColumnas(false, 'mes')).toEqual([
			'Fecha',
			'Entrada',
			'Salida',
			'Duración',
			'Total día',
			'Total Mes'
		]);
	});

	it('8 columnas con contrato + sub-periodo semana', () => {
		expect(determinarColumnas(true, 'semana')).toEqual([
			'Fecha',
			'Entrada',
			'Salida',
			'Duración',
			'Total día',
			'Balance diario',
			'Total Semana',
			'Balance Semana'
		]);
	});

	it('8 columnas con contrato + sub-periodo mes (mes de año)', () => {
		expect(determinarColumnas(true, 'mes')).toEqual([
			'Fecha',
			'Entrada',
			'Salida',
			'Duración',
			'Total día',
			'Balance diario',
			'Total Mes',
			'Balance Mes'
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
		expect(totalHorasGrupo([j1, j2], [makeSettings()])).toBe(16);
	});

	it('respeta el redondeo configurado en snapshots', () => {
		const j = makeJornada({
			start_time: new Date('2026-06-22T08:00:00'),
			end_time: new Date('2026-06-22T15:30:00')
		});
		expect(totalHorasGrupo([j], [makeSettings({ redondeo_minutos: 0 })])).toBe(7.5);
	});
});

describe('escribirJornadas — agrupación por día sin sub-periodo', () => {
	it('escribe jornadas agrupadas por día', () => {
		const wb = crearWorkbook();
		const j1 = makeJornada({ id: 1, start_time: new Date('2026-06-22T08:00:00') });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-06-23T08:00:00') });

		escribirJornadas(wb, [j1, j2], makeContexto());

		expect(wb.rows.length).toBe(2);
	});

	it('fecha vacía en jornadas posteriores del mismo día (date grouping)', () => {
		const wb = crearWorkbook();
		const j1 = makeJornada({ id: 1, start_time: new Date('2026-06-22T08:00:00') });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-06-22T13:00:00') });

		escribirJornadas(wb, [j1, j2], makeContexto());

		expect(wb.rows[0][0]).toMatch(/22\/06\/2026/);
		expect(wb.rows[1][0]).toBeNull();
	});

	it('Total día es una celda numérica con type:Number en última fila del día', () => {
		const wb = crearWorkbook();
		const dia = new Date('2026-06-22T08:00:00');
		const j1 = makeJornada({ id: 1, start_time: dia });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-06-22T13:00:00') });
		const balance = makeBalance(dia, 960, 450);

		escribirJornadas(wb, [j1, j2], makeContexto({}, [balance]));

		expect(wb.rows[0][4]).toBeNull();
		const totalCell = wb.rows[1][4] as Cell | null;
		expect(totalCell).toMatchObject({ type: Number, value: 16, format: '0.0' });
	});

	it('Duración en formato hh:mm (no decimal)', () => {
		const wb = crearWorkbook();
		const j = makeJornada({ start_time: new Date('2026-06-22T08:00:00') });

		escribirJornadas(wb, [j], makeContexto());

		expect(wb.rows[0][3]).toBe('08:00');
	});

	it('Balance diario es una celda numérica con formato condicional', () => {
		const wb = crearWorkbook();
		const dia = new Date('2026-06-22T08:00:00');
		const j = makeJornada({ start_time: dia });
		const balance = makeBalance(dia, 480, 450);

		escribirJornadas(wb, [j], makeContexto({ tieneContrato: true }, [balance]));

		const balanceCell = wb.rows[0][5] as Cell | null;
		expect(balanceCell).toMatchObject({ type: Number, fontWeight: 'bold' });
	});

	it('Balance diario en rojo si es negativo', () => {
		const wb = crearWorkbook();
		const dia = new Date('2026-06-22T08:00:00');
		const j = makeJornada({ start_time: dia, end_time: new Date('2026-06-22T12:00:00') });
		const balance = makeBalance(dia, 240, 450);

		escribirJornadas(wb, [j], makeContexto({ tieneContrato: true }, [balance]));

		const balanceCell = wb.rows[0][5] as Cell | null;
		expect(balanceCell).toMatchObject({ textColor: '#dc2626', value: -3.5 });
	});

	it('Balance diario en verde si es positivo', () => {
		const wb = crearWorkbook();
		const dia = new Date('2026-06-22T08:00:00');
		const j = makeJornada({ start_time: dia });
		const balance = makeBalance(dia, 480, 450);

		escribirJornadas(wb, [j], makeContexto({ tieneContrato: true }, [balance]));

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

		escribirJornadas(wb, [j1, j2, j3], makeContexto({}, [balance]));

		expect(wb.rows[0][4]).toBeNull();
		expect(wb.rows[1][4]).toBeNull();
		expect(wb.rows[2][4]).toMatchObject({ type: Number });
	});

	it('filas sin sub-periodo NO tienen borde inferior', () => {
		const wb = crearWorkbook();
		const j = makeJornada({ start_time: new Date('2026-06-22T08:00:00') });

		escribirJornadas(wb, [j], makeContexto({ subPeriodo: 'ninguno' }));

		expect(wb.rows[0][0]).toMatch(/22\/06\/2026/);
		expect(wb.rows[0][0]).not.toMatchObject({ bottomBorderStyle: 'medium' });
	});
});

describe('escribirJornadas — con sub-periodo (mes) y contrato (AC-15, AC-16, AC-18)', () => {
	function cierresSemana(jornadas: Jornada[], balances: BalanceDia[]): Map<string, CierrePeriodo> {
		const balancesMap = new Map<string, BalanceDia>();
		for (const b of balances) balancesMap.set(b.claveDia, b);
		return calcularCierresPorPeriodo({
			jornadas,
			tipoSubPeriodo: 'semana' as TipoSubPeriodo,
			snapshots: [makeSettings()],
			balances: balancesMap,
			primerDiaSemana: 1
		});
	}

	it('última fila de cada semana tiene borde inferior 2pt sólido negro (sin fila extra)', () => {
		const wb = crearWorkbook();
		const j1 = makeJornada({ id: 1, start_time: new Date('2026-06-22T08:00:00') });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-06-29T08:00:00') });
		const balances = [
			makeBalance(new Date('2026-06-22'), 480, 450),
			makeBalance(new Date('2026-06-29'), 480, 450)
		];
		const cierres = cierresSemana([j1, j2], balances);
		const ctx = makeContexto({ subPeriodo: 'semana', cierres });

		escribirJornadas(wb, [j1, j2], ctx);

		expect(wb.rows).toHaveLength(2);
		// La primera fila (j1, fin de semana 1) debe tener el border
		for (const cell of wb.rows[0]) {
			expect(cell).toMatchObject({
				bottomBorderStyle: 'medium',
				bottomBorderColor: '#000000'
			});
		}
	});

	it('última fila de semana tiene Total Semana y Balance Semana (8 columnas)', () => {
		const wb = crearWorkbook();
		const dia = new Date('2026-06-22T08:00:00');
		const j1 = makeJornada({ id: 1, start_time: dia });
		const balances = [makeBalance(dia, 480, 450)];
		const cierres = cierresSemana([j1], balances);
		const ctx = makeContexto({ subPeriodo: 'semana', cierres });

		escribirJornadas(wb, [j1], ctx);

		expect(wb.rows[0]).toHaveLength(8);
		const totalSemana = wb.rows[0][6] as Cell | null;
		const balanceSemana = wb.rows[0][7] as Cell | null;
		expect(totalSemana).toMatchObject({ type: Number, fontWeight: 'bold', fontSize: 14 });
		expect(balanceSemana).toMatchObject({ type: Number, fontWeight: 'bold', fontSize: 14 });
	});

	it('Total Semana NO tiene color de fondo (siempre positivo)', () => {
		const wb = crearWorkbook();
		const dia = new Date('2026-06-22T08:00:00');
		const j1 = makeJornada({ id: 1, start_time: dia });
		const balances = [makeBalance(dia, 480, 450)];
		const cierres = cierresSemana([j1], balances);
		const ctx = makeContexto({ subPeriodo: 'semana', cierres });

		escribirJornadas(wb, [j1], ctx);

		const totalSemana = wb.rows[0][6] as Cell | null;
		expect(totalSemana).not.toHaveProperty('backgroundColor');
	});

	it('Balance Semana tiene fondo verde pastel para valor >= 0', () => {
		const wb = crearWorkbook();
		const dia = new Date('2026-06-22T08:00:00');
		const j1 = makeJornada({ id: 1, start_time: dia });
		const balances = [makeBalance(dia, 480, 450)];
		const cierres = cierresSemana([j1], balances);
		const ctx = makeContexto({ subPeriodo: 'semana', cierres });

		escribirJornadas(wb, [j1], ctx);

		const balanceSemana = wb.rows[0][7] as Cell | null;
		expect(balanceSemana).toMatchObject({ backgroundColor: '#bbf7d0' });
	});

	it('Balance Semana tiene fondo rojo pastel para valor < 0', () => {
		const wb = crearWorkbook();
		const dia = new Date('2026-06-22T08:00:00');
		const j1 = makeJornada({ id: 1, start_time: dia, end_time: new Date('2026-06-22T10:00:00') });
		const balances = [makeBalance(dia, 120, 450)];
		const cierres = cierresSemana([j1], balances);
		const ctx = makeContexto({ subPeriodo: 'semana', cierres });

		escribirJornadas(wb, [j1], ctx);

		const balanceSemana = wb.rows[0][7] as Cell | null;
		expect(balanceSemana).toMatchObject({ backgroundColor: '#fecaca' });
	});

	it('filas no-últimas de la semana NO tienen columnas 7-8', () => {
		const wb = crearWorkbook();
		const dia1 = new Date('2026-06-22T08:00:00');
		const dia2 = new Date('2026-06-23T08:00:00');
		const j1 = makeJornada({ id: 1, start_time: dia1 });
		const j2 = makeJornada({ id: 2, start_time: dia2 });
		const balances = [makeBalance(dia1, 480, 450), makeBalance(dia2, 480, 450)];
		const cierres = cierresSemana([j1, j2], balances);
		const ctx = makeContexto({ subPeriodo: 'semana', cierres });

		escribirJornadas(wb, [j1, j2], ctx);

		expect(wb.rows[0]).toHaveLength(6);
		expect(wb.rows[1]).toHaveLength(8);
	});

	it('semanas distintas: cada última fila de semana tiene su propio cierre', () => {
		const wb = crearWorkbook();
		const j1 = makeJornada({ id: 1, start_time: new Date('2026-06-22T08:00:00') });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-06-29T08:00:00') });
		const balances = [
			makeBalance(new Date('2026-06-22'), 480, 450),
			makeBalance(new Date('2026-06-29'), 480, 450)
		];
		const cierres = cierresSemana([j1, j2], balances);
		const ctx = makeContexto({ subPeriodo: 'semana', cierres });

		escribirJornadas(wb, [j1, j2], ctx);

		expect(wb.rows).toHaveLength(2);
		expect(wb.rows[0]).toHaveLength(8);
		expect(wb.rows[1]).toHaveLength(8);
		const total1 = wb.rows[0][6] as Cell;
		const total2 = wb.rows[1][6] as Cell;
		expect((total1 as Cell & { value: number }).value).toBe(8);
		expect((total2 as Cell & { value: number }).value).toBe(8);
	});
});

describe('escribirJornadas — sub-periodo mes (informe anual)', () => {
	function cierresMes(jornadas: Jornada[], balances: BalanceDia[]): Map<string, CierrePeriodo> {
		const balancesMap = new Map<string, BalanceDia>();
		for (const b of balances) balancesMap.set(b.claveDia, b);
		return calcularCierresPorPeriodo({
			jornadas,
			tipoSubPeriodo: 'mes',
			snapshots: [makeSettings()],
			balances: balancesMap,
			primerDiaSemana: 1
		});
	}

	it('agrupa por mes (no por semana) y aplica borde al fin de cada mes', () => {
		const wb = crearWorkbook();
		const j1 = makeJornada({ id: 1, start_time: new Date('2026-01-15T08:00:00') });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-02-15T08:00:00') });
		const j3 = makeJornada({ id: 3, start_time: new Date('2026-03-15T08:00:00') });
		const balances = [
			makeBalance(new Date('2026-01-15'), 480, 450),
			makeBalance(new Date('2026-02-15'), 480, 450),
			makeBalance(new Date('2026-03-15'), 480, 450)
		];
		const cierres = cierresMes([j1, j2, j3], balances);
		const ctx = makeContexto({ subPeriodo: 'mes', cierres });

		escribirJornadas(wb, [j1, j2, j3], ctx);

		expect(wb.rows).toHaveLength(3);
		// Cada fila es la única y última de su mes → todas con borde y 8 columnas
		for (const row of wb.rows) {
			expect(row).toHaveLength(8);
			for (const cell of row) {
				expect(cell).toMatchObject({
					bottomBorderStyle: 'medium',
					bottomBorderColor: '#000000'
				});
			}
		}
	});

	it('dos meses con varias jornadas cada uno: Total Mes y Balance Mes al fin de cada mes', () => {
		const wb = crearWorkbook();
		const j1 = makeJornada({ id: 1, start_time: new Date('2026-01-10T08:00:00') });
		const j2 = makeJornada({ id: 2, start_time: new Date('2026-01-20T08:00:00') });
		const j3 = makeJornada({ id: 3, start_time: new Date('2026-02-10T08:00:00') });
		const j4 = makeJornada({ id: 4, start_time: new Date('2026-02-20T08:00:00') });
		const balances = [
			makeBalance(new Date('2026-01-10'), 480, 450),
			makeBalance(new Date('2026-01-20'), 480, 450),
			makeBalance(new Date('2026-02-10'), 480, 450),
			makeBalance(new Date('2026-02-20'), 480, 450)
		];
		const cierres = cierresMes([j1, j2, j3, j4], balances);
		const ctx = makeContexto({ subPeriodo: 'mes', cierres });

		escribirJornadas(wb, [j1, j2, j3, j4], ctx);

		expect(wb.rows).toHaveLength(4);
		// j1, j2 = enero; j3, j4 = febrero
		// j1 (no última de enero) → 6 cols sin Total Mes
		expect(wb.rows[0]).toHaveLength(6);
		// j2 (última de enero) → 8 cols con Total Mes y Balance Mes
		expect(wb.rows[1]).toHaveLength(8);
		// j3 (no última de febrero) → 6 cols
		expect(wb.rows[2]).toHaveLength(6);
		// j4 (última de febrero) → 8 cols
		expect(wb.rows[3]).toHaveLength(8);

		const totalEnero = wb.rows[1][6] as Cell & { value: number };
		const totalFeb = wb.rows[3][6] as Cell & { value: number };
		expect(totalEnero.value).toBe(16);
		expect(totalFeb.value).toBe(16);
	});
});

describe('escribirJornadas — sin contrato con sub-periodo (AC-19)', () => {
	it('sin contrato + sub-periodo: 6 columnas (sin Balance Semana/Mes)', () => {
		const wb = crearWorkbook();
		const dia = new Date('2026-06-22T08:00:00');
		const j1 = makeJornada({ id: 1, start_time: dia });
		const balances = [makeBalance(dia, 480, 450)];
		const balancesMap = new Map<string, BalanceDia>();
		for (const b of balances) balancesMap.set(b.claveDia, b);
		const cierres = calcularCierresPorPeriodo({
			jornadas: [j1],
			tipoSubPeriodo: 'semana',
			snapshots: [makeSettings({ horas_semanales: 0 })],
			balances: balancesMap,
			primerDiaSemana: 1
		});
		const ctx = makeContexto({ subPeriodo: 'semana', cierres, tieneContrato: false });

		escribirJornadas(wb, [j1], ctx);

		// 6 columnas: Fecha, Entrada, Salida, Duración, Total día, Total Semana
		expect(wb.rows[0]).toHaveLength(6);
		const totalSemana = wb.rows[0][5] as Cell | null;
		expect(totalSemana).toMatchObject({ type: Number, fontWeight: 'bold', fontSize: 14 });
		// Sin Balance Semana/Mes
		expect(wb.rows[0]).toHaveLength(6);
	});
});

// Solo para que se considere usado (evita warning de knip)
describe('agruparPorSemana integration', () => {
	it('funciona con la agrupación estándar', () => {
		const jornadas = [
			makeJornada({ id: 1, start_time: new Date('2026-06-22T08:00:00') }),
			makeJornada({ id: 2, start_time: new Date('2026-06-23T08:00:00') })
		];
		const grupos = agruparPorSemana(jornadas, 1);
		expect(grupos.size).toBe(1);
	});
});
