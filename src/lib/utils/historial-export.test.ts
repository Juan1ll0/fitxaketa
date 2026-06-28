/**
 * Tests para historial-export.ts
 *
 * Verifica la lógica de exportación de jornadas a XLSX:
 * - Solo cerradas se exportan
 * - Orden ascendente por start_time
 * - Columnas según contrato y periodo (5, 6 u 8)
 * - Fila TOTAL al final con valores en col 5/6/7/8
 * - Nombre de fichero
 * - Sin datos → no se genera
 * - describirPeriodo
 * - generarTitulo (fila 1 con título descriptivo)
 * - Routing: año → meses, mes → semanas, semana/rango/fecha → sin sub-periodo
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Jornada, Settings } from '$lib/db';
import { describirPeriodo, exportarJornadas, generarTitulo } from '$lib/utils/historial-export';
import type { FiltroTemporal } from '$lib/utils/historial-filtros';

const {
	mockCrearWorkbook,
	mockEscribirCabecera,
	mockEscribirFilaTotal,
	mockEscribirTitulo,
	mockGuardarFichero,
	mockEscribirJornadas,
	mockDeterminarColumnas
} = vi.hoisted(() => ({
	mockCrearWorkbook: vi.fn(() => ({ rows: [], sheetName: 'Jornadas' })),
	mockEscribirCabecera: vi.fn(),
	mockEscribirFilaTotal: vi.fn(),
	mockEscribirTitulo: vi.fn(),
	mockGuardarFichero: vi.fn().mockResolvedValue(undefined),
	mockEscribirJornadas: vi.fn(),
	mockDeterminarColumnas: vi.fn((tieneContrato: boolean, subPeriodo: string): string[] => {
		const cols = ['Fecha', 'Entrada', 'Salida', 'Duración', 'Total día'];
		if (tieneContrato) cols.push('Balance diario');
		if (subPeriodo === 'semana') {
			cols.push('Total Semana');
			if (tieneContrato) cols.push('Balance Semana');
		} else if (subPeriodo === 'mes') {
			cols.push('Total Mes');
			if (tieneContrato) cols.push('Balance Mes');
		}
		return cols;
	})
}));

vi.mock('$lib/utils/excel-wrapper', () => ({
	crearWorkbook: mockCrearWorkbook,
	escribirCabecera: mockEscribirCabecera,
	escribirFilaTotal: mockEscribirFilaTotal,
	escribirTitulo: mockEscribirTitulo,
	guardarFichero: mockGuardarFichero
}));

vi.mock('$lib/utils/historial-export-filas', () => ({
	determinarColumnas: mockDeterminarColumnas,
	escribirJornadas: mockEscribirJornadas,
	totalHorasGrupo: vi.fn(() => 40.5)
}));

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

function filtroPeriodo(periodo: 'año' | 'mes' | 'semana', fechaRef: Date): FiltroTemporal {
	return { tipo: 'periodo', periodo, fechaReferencia: fechaRef };
}

describe('historial-export', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('solo cerradas (AC-08)', () => {
		it('excluye jornadas abiertas de la exportación', async () => {
			const abiertas = makeJornada({ status: 'open', end_time: null });
			const cerradas = makeJornada({ id: 2, status: 'closed' });

			await exportarJornadas({
				jornadas: [abiertas, cerradas],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			expect(mockCrearWorkbook).toHaveBeenCalled();
		});

		it('excluye jornadas con end_time null (no cerradas correctamente)', async () => {
			const sinEndTime = makeJornada({ status: 'closed', end_time: null });

			await exportarJornadas({
				jornadas: [sinEndTime],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			expect(mockCrearWorkbook).not.toHaveBeenCalled();
		});
	});

	describe('orden ascendente por start_time (AC-06)', () => {
		it('ordena las jornadas por start_time ascendente', async () => {
			const antigua = makeJornada({
				id: 1,
				start_time: new Date('2026-06-20T08:00:00'),
				end_time: new Date('2026-06-20T16:00:00')
			});
			const reciente = makeJornada({
				id: 2,
				start_time: new Date('2026-06-22T08:00:00'),
				end_time: new Date('2026-06-22T16:00:00')
			});
			const intermedia = makeJornada({
				id: 3,
				start_time: new Date('2026-06-21T08:00:00'),
				end_time: new Date('2026-06-21T16:00:00')
			});

			await exportarJornadas({
				jornadas: [reciente, antigua, intermedia],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('mes', new Date('2026-06-15'))
			});

			expect(mockEscribirJornadas).toHaveBeenCalled();
			const args = mockEscribirJornadas.mock.calls[0];
			const jornadasArg = args[1] as Jornada[];
			expect(jornadasArg[0].id).toBe(antigua.id);
			expect(jornadasArg[1].id).toBe(intermedia.id);
			expect(jornadasArg[2].id).toBe(reciente.id);
		});
	});

	describe('columnas según contrato y periodo (AC-07, AC-13, AC-15, AC-16, AC-19)', () => {
		it('5 columnas sin contrato, sin sub-periodo (semana)', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings({ horas_semanales: 0 })],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			expect(mockEscribirCabecera).toHaveBeenCalledWith(expect.anything(), [
				'Fecha',
				'Entrada',
				'Salida',
				'Duración',
				'Total día'
			]);
		});

		it('6 columnas con contrato, sin sub-periodo (semana)', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings({ horas_semanales: 37.5, dias_laborables: 5 })],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			expect(mockEscribirCabecera).toHaveBeenCalledWith(expect.anything(), [
				'Fecha',
				'Entrada',
				'Salida',
				'Duración',
				'Total día',
				'Balance diario'
			]);
		});

		it('8 columnas con contrato, mes (Total Semana, Balance Semana)', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings({ horas_semanales: 37.5, dias_laborables: 5 })],
				filtro: filtroPeriodo('mes', new Date('2026-06-15'))
			});

			expect(mockEscribirCabecera).toHaveBeenCalledWith(expect.anything(), [
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

		it('8 columnas con contrato, año (Total Mes, Balance Mes)', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings({ horas_semanales: 37.5, dias_laborables: 5 })],
				filtro: filtroPeriodo('año', new Date('2026-06-15'))
			});

			expect(mockEscribirCabecera).toHaveBeenCalledWith(expect.anything(), [
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

		it('6 columnas sin contrato + mes (Total Semana solo, sin Balance Semana)', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings({ horas_semanales: 0, dias_laborables: 0 })],
				filtro: filtroPeriodo('mes', new Date('2026-06-15'))
			});

			expect(mockEscribirCabecera).toHaveBeenCalledWith(expect.anything(), [
				'Fecha',
				'Entrada',
				'Salida',
				'Duración',
				'Total día',
				'Total Semana'
			]);
		});
	});

	describe('routing según periodo (AC-15, AC-16, AC-17)', () => {
		it('año con contrato → escribirJornadas con subPeriodo "mes"', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('año', new Date('2026-06-15'))
			});

			expect(mockEscribirJornadas).toHaveBeenCalled();
			const ctx = mockEscribirJornadas.mock.calls[0][2] as { subPeriodo: string };
			expect(ctx.subPeriodo).toBe('mes');
		});

		it('mes con contrato → escribirJornadas con subPeriodo "semana"', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('mes', new Date('2026-06-15'))
			});

			expect(mockEscribirJornadas).toHaveBeenCalled();
			const ctx = mockEscribirJornadas.mock.calls[0][2] as { subPeriodo: string };
			expect(ctx.subPeriodo).toBe('semana');
		});

		it('semana → escribirJornadas con subPeriodo "ninguno"', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			expect(mockEscribirJornadas).toHaveBeenCalled();
			const ctx = mockEscribirJornadas.mock.calls[0][2] as { subPeriodo: string };
			expect(ctx.subPeriodo).toBe('ninguno');
		});

		it('fecha → escribirJornadas con subPeriodo "ninguno"', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: { tipo: 'fecha', fecha: new Date('2026-06-22') }
			});

			expect(mockEscribirJornadas).toHaveBeenCalled();
			const ctx = mockEscribirJornadas.mock.calls[0][2] as { subPeriodo: string };
			expect(ctx.subPeriodo).toBe('ninguno');
		});

		it('rango → escribirJornadas con subPeriodo "ninguno"', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: { tipo: 'rango', desde: new Date('2026-06-01'), hasta: new Date('2026-06-15') }
			});

			expect(mockEscribirJornadas).toHaveBeenCalled();
			const ctx = mockEscribirJornadas.mock.calls[0][2] as { subPeriodo: string };
			expect(ctx.subPeriodo).toBe('ninguno');
		});
	});

	describe('fila TOTAL al final (AC-15, AC-18, AC-19)', () => {
		it('siempre añade una fila TOTAL al final (con contrato, mes)', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('mes', new Date('2026-06-15'))
			});

			expect(mockEscribirFilaTotal).toHaveBeenCalled();
		});

		it('TOTAL se llama con TotalesFila y numColumnas=8 (contrato + mes)', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('mes', new Date('2026-06-15'))
			});

			expect(mockEscribirFilaTotal).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					totalDia: expect.any(Number),
					balanceDiario: expect.any(Number)
				}),
				8
			);
		});

		it('TOTAL con contrato + año: numColumnas=8', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('año', new Date('2026-06-15'))
			});

			expect(mockEscribirFilaTotal).toHaveBeenCalledWith(expect.anything(), expect.anything(), 8);
		});

		it('TOTAL sin contrato: balanceDiario=null, numColumnas=5', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings({ horas_semanales: 0 })],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			expect(mockEscribirFilaTotal).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ balanceDiario: null }),
				5
			);
		});
	});

	describe('nombre de fichero (AC-20, AC-22)', () => {
		it('llama a guardarFichero con nombre que sigue el patrón jornadas_YYYYMMDDHHmmss.xlsx', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			expect(mockGuardarFichero).toHaveBeenCalledWith(
				expect.anything(),
				expect.stringMatching(/^jornadas_\d{14}\.xlsx$/)
			);
		});

		it('el timestamp del nombre de fichero tiene formato YYYYMMDDHHmmss', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			const nombre = mockGuardarFichero.mock.calls[0][1];
			const timestamp = nombre.match(/jornadas_(\d{14})\.xlsx/)?.[1];
			expect(timestamp).toBeDefined();
			expect(timestamp).toHaveLength(14);
		});
	});

	describe('sin jornadas cerradas (AC-23)', () => {
		it('no llama a guardarFichero si no hay jornadas cerradas', async () => {
			await exportarJornadas({
				jornadas: [],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			expect(mockCrearWorkbook).not.toHaveBeenCalled();
			expect(mockGuardarFichero).not.toHaveBeenCalled();
		});

		it('no llama a guardarFichero si todas las jornadas están abiertas', async () => {
			const abiertas = makeJornada({ status: 'open', end_time: null });

			await exportarJornadas({
				jornadas: [abiertas],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			expect(mockGuardarFichero).not.toHaveBeenCalled();
		});
	});

	describe('describirPeriodo (AC-02)', () => {
		it('devuelve texto correcto para periodo=año', () => {
			const filtro = filtroPeriodo('año', new Date('2026-06-15'));
			expect(describirPeriodo(filtro, 1)).toBe('año 2026');
		});

		it('devuelve texto correcto para periodo=mes', () => {
			const filtro = filtroPeriodo('mes', new Date('2026-06-15'));
			expect(describirPeriodo(filtro, 1)).toBe('mes de junio de 2026');
		});

		it('devuelve texto correcto para periodo=mes de enero', () => {
			const filtro = filtroPeriodo('mes', new Date('2026-01-15'));
			expect(describirPeriodo(filtro, 1)).toBe('mes de enero de 2026');
		});

		it('devuelve texto correcto para periodo=semana', () => {
			const filtro = filtroPeriodo('semana', new Date('2026-06-22'));
			expect(describirPeriodo(filtro, 1)).toBe('semana del 22 al 28 de junio de 2026');
		});

		it('devuelve texto correcto para filtro tipo=fecha', () => {
			const filtro: FiltroTemporal = { tipo: 'fecha', fecha: new Date('2026-06-22') };
			expect(describirPeriodo(filtro, 1)).toBe('fecha 22 de junio de 2026');
		});

		it('devuelve texto correcto para filtro tipo=rango (días distintos)', () => {
			const filtro: FiltroTemporal = {
				tipo: 'rango',
				desde: new Date('2026-06-01'),
				hasta: new Date('2026-06-15')
			};
			expect(describirPeriodo(filtro, 1)).toBe('rango del 1 al 15 de junio de 2026');
		});

		it('devuelve texto de fecha única cuando rango es un solo día', () => {
			const filtro: FiltroTemporal = {
				tipo: 'rango',
				desde: new Date('2026-06-15'),
				hasta: new Date('2026-06-15')
			};
			expect(describirPeriodo(filtro, 1)).toBe('fecha 15 de junio de 2026');
		});
	});

	describe('generarTitulo (AC-05a)', () => {
		it('"Informe anual - 2026" para periodo=año', () => {
			const filtro = filtroPeriodo('año', new Date(2026, 5, 15));
			expect(generarTitulo(filtro, 1)).toBe('Informe anual - 2026');
		});

		it('"Informe mensual - mayo 2026" para periodo=mes', () => {
			const filtro = filtroPeriodo('mes', new Date(2026, 4, 15));
			expect(generarTitulo(filtro, 1)).toBe('Informe mensual - mayo 2026');
		});

		it('"Informe mensual - enero 2026" para periodo=mes de enero', () => {
			const filtro = filtroPeriodo('mes', new Date(2026, 0, 15));
			expect(generarTitulo(filtro, 1)).toBe('Informe mensual - enero 2026');
		});

		it('"Informe personalizado - Semana 25 de junio 2026" para periodo=semana', () => {
			const filtro = filtroPeriodo('semana', new Date(2026, 5, 17));
			expect(generarTitulo(filtro, 1)).toBe('Informe personalizado - Semana 25 de junio 2026');
		});

		it('"Informe personalizado - 5 de junio de 2026" para filtro tipo=fecha', () => {
			const filtro: FiltroTemporal = { tipo: 'fecha', fecha: new Date(2026, 5, 5) };
			expect(generarTitulo(filtro, 1)).toBe('Informe personalizado - 5 de junio de 2026');
		});

		it('"Informe personalizado - 1 al 15 de junio de 2026" para rango multi-día', () => {
			const filtro: FiltroTemporal = {
				tipo: 'rango',
				desde: new Date(2026, 5, 1),
				hasta: new Date(2026, 5, 15)
			};
			expect(generarTitulo(filtro, 1)).toBe('Informe personalizado - 1 al 15 de junio de 2026');
		});

		it('usa formato fecha cuando el rango es un solo día', () => {
			const filtro: FiltroTemporal = {
				tipo: 'rango',
				desde: new Date(2026, 5, 15),
				hasta: new Date(2026, 5, 15)
			};
			expect(generarTitulo(filtro, 1)).toBe('Informe personalizado - 15 de junio de 2026');
		});

		it('calcula correctamente el número de semana ISO 2 para el primer lunes de enero 2026', () => {
			const filtro = filtroPeriodo('semana', new Date(2026, 0, 5));
			expect(generarTitulo(filtro, 1)).toBe('Informe personalizado - Semana 2 de enero 2026');
		});

		it('el mes/año del título corresponde al inicio de la semana (puede ser mes/año anterior)', () => {
			const filtro = filtroPeriodo('semana', new Date(2024, 11, 30));
			expect(generarTitulo(filtro, 1)).toBe('Informe personalizado - Semana 1 de diciembre 2024');
		});
	});

	describe('escribirTitulo se llama como primera operación (AC-05a)', () => {
		it('se llama exactamente una vez al exportar', async () => {
			const jornada = makeJornada();
			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('mes', new Date(2026, 5, 15))
			});
			expect(mockEscribirTitulo).toHaveBeenCalledTimes(1);
		});

		it('recibe el título generado y el número de columnas (8 para contrato + año)', async () => {
			const jornada = makeJornada();
			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('año', new Date(2026, 5, 15))
			});
			expect(mockEscribirTitulo).toHaveBeenCalledWith(expect.anything(), 'Informe anual - 2026', 8);
		});

		it('se llama con 5 columnas para export sin contrato (semana)', async () => {
			const jornada = makeJornada();
			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings({ horas_semanales: 0 })],
				filtro: filtroPeriodo('semana', new Date(2026, 5, 22))
			});
			expect(mockEscribirTitulo).toHaveBeenCalledWith(
				expect.anything(),
				expect.stringContaining('Informe personalizado'),
				5
			);
		});

		it('se llama con 6 columnas para export con contrato en semana', async () => {
			const jornada = makeJornada();
			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('semana', new Date(2026, 5, 22))
			});
			expect(mockEscribirTitulo).toHaveBeenCalledWith(
				expect.anything(),
				expect.stringContaining('Informe personalizado'),
				6
			);
		});

		it('se llama ANTES de escribirCabecera (orden de invocación)', async () => {
			const jornada = makeJornada();
			const callOrder: string[] = [];
			mockEscribirTitulo.mockImplementation(() => callOrder.push('titulo'));
			mockEscribirCabecera.mockImplementation(() => callOrder.push('cabecera'));

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('mes', new Date(2026, 5, 15))
			});

			expect(callOrder.indexOf('titulo')).toBeLessThan(callOrder.indexOf('cabecera'));
		});
	});
});
