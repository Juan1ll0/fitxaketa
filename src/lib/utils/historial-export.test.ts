/**
 * Tests para historial-export.ts
 *
 * Verifica la lógica de exportación de jornadas a XLSX:
 * - Solo cerradas se exportan
 * - Orden ascendente por start_time
 * - Columnas según contrato y periodo (5, 6 o 7)
 * - Fila TOTAL al final
 * - Nombre de fichero
 * - Sin datos → no se genera
 * - describirPeriodo
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Jornada, Settings } from '$lib/db';
import { exportarJornadas, describirPeriodo } from '$lib/utils/historial-export';
import type { FiltroTemporal } from '$lib/utils/historial-filtros';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock de excel-wrapper para verificar llamadas
const {
	mockCrearWorkbook,
	mockEscribirCabecera,
	mockEscribirFilaTotal,
	mockGuardarFichero,
	mockEscribirAgrupadoPorMes,
	mockEscribirAgrupadoPorSemana,
	mockEscribirGlobal,
	mockDeterminarColumnas
} = vi.hoisted(() => ({
	mockCrearWorkbook: vi.fn(() => ({
		rows: [],
		sheetName: 'Jornadas'
	})),
	mockEscribirCabecera: vi.fn(),
	mockEscribirFilaTotal: vi.fn(),
	mockGuardarFichero: vi.fn().mockResolvedValue(undefined),
	mockEscribirAgrupadoPorMes: vi.fn(),
	mockEscribirAgrupadoPorSemana: vi.fn(),
	mockEscribirGlobal: vi.fn(),
	mockDeterminarColumnas: vi.fn((tieneContrato: boolean, tieneTotalSemana: boolean): string[] => {
		const cols = ['Fecha', 'Entrada', 'Salida', 'Duración', 'Total día'];
		if (tieneContrato) cols.push('Balance diario');
		if (tieneTotalSemana) cols.push('Total semana');
		return cols;
	})
}));

vi.mock('$lib/utils/excel-wrapper', () => ({
	crearWorkbook: mockCrearWorkbook,
	escribirCabecera: mockEscribirCabecera,
	escribirFilaTotal: mockEscribirFilaTotal,
	guardarFichero: mockGuardarFichero
}));

vi.mock('$lib/utils/historial-export-filas', () => ({
	determinarColumnas: mockDeterminarColumnas,
	escribirAgrupadoPorMes: mockEscribirAgrupadoPorMes,
	escribirAgrupadoPorSemana: mockEscribirAgrupadoPorSemana,
	escribirGlobal: mockEscribirGlobal,
	totalHorasGrupo: vi.fn(() => 40.5)
}));

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

function filtroPeriodo(periodo: 'año' | 'mes' | 'semana', fechaRef: Date): FiltroTemporal {
	return { tipo: 'periodo', periodo, fechaReferencia: fechaRef };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('historial-export', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// ── (a) Solo cerradas se exportan ───────────────────────────────────────

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

	// ── (b) Orden ascendente ─────────────────────────────────────────────────

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

			expect(mockEscribirAgrupadoPorSemana).toHaveBeenCalled();
			const args = mockEscribirAgrupadoPorSemana.mock.calls[0];
			const jornadasArg = args[1] as Jornada[];
			expect(jornadasArg[0].id).toBe(antigua.id);
			expect(jornadasArg[1].id).toBe(intermedia.id);
			expect(jornadasArg[2].id).toBe(reciente.id);
		});
	});

	// ── (c/d/e) Columnas según contrato y periodo ───────────────────────────

	describe('columnas según contrato y periodo (AC-07, AC-13, AC-16)', () => {
		it('usa 5 columnas sin contrato (cualquier periodo)', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings({ horas_semanales: 0 })],
				filtro: filtroPeriodo('mes', new Date('2026-06-15'))
			});

			expect(mockEscribirCabecera).toHaveBeenCalledWith(expect.anything(), [
				'Fecha',
				'Entrada',
				'Salida',
				'Duración',
				'Total día'
			]);
		});

		it('usa 6 columnas con contrato y periodo semana', async () => {
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

		it('usa 7 columnas con contrato y periodo mes (Total semana)', async () => {
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
				'Total semana'
			]);
		});

		it('usa 7 columnas con contrato y periodo año (Total semana)', async () => {
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
				'Total semana'
			]);
		});

		it('usa 5 columnas con dias_laborables=0 aunque horas_semanales>0', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings({ horas_semanales: 37.5, dias_laborables: 0 })],
				filtro: filtroPeriodo('mes', new Date('2026-06-15'))
			});

			expect(mockEscribirCabecera).toHaveBeenCalledWith(expect.anything(), [
				'Fecha',
				'Entrada',
				'Salida',
				'Duración',
				'Total día'
			]);
		});
	});

	// ── (f) Routing según periodo y contrato ───────────────────────────────

	describe('routing según periodo y contrato', () => {
		it('año con contrato → escribirAgrupadoPorSemana (semanas con Total semana)', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('año', new Date('2026-06-15'))
			});

			expect(mockEscribirAgrupadoPorSemana).toHaveBeenCalled();
			expect(mockEscribirAgrupadoPorMes).not.toHaveBeenCalled();
			expect(mockEscribirGlobal).not.toHaveBeenCalled();
		});

		it('año sin contrato → escribirGlobal (sin semanas ni Total semana)', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings({ horas_semanales: 0 })],
				filtro: filtroPeriodo('año', new Date('2026-06-15'))
			});

			expect(mockEscribirGlobal).toHaveBeenCalled();
			expect(mockEscribirAgrupadoPorMes).not.toHaveBeenCalled();
			expect(mockEscribirAgrupadoPorSemana).not.toHaveBeenCalled();
		});

		it('mes con contrato → escribirAgrupadoPorSemana (semanas con Total semana)', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('mes', new Date('2026-06-15'))
			});

			expect(mockEscribirAgrupadoPorSemana).toHaveBeenCalled();
			expect(mockEscribirAgrupadoPorMes).not.toHaveBeenCalled();
			expect(mockEscribirGlobal).not.toHaveBeenCalled();
		});

		it('mes sin contrato → escribirGlobal', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings({ horas_semanales: 0 })],
				filtro: filtroPeriodo('mes', new Date('2026-06-15'))
			});

			expect(mockEscribirGlobal).toHaveBeenCalled();
			expect(mockEscribirAgrupadoPorSemana).not.toHaveBeenCalled();
		});

		it('semana → escribirGlobal (sin Total semana)', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			expect(mockEscribirGlobal).toHaveBeenCalled();
			expect(mockEscribirAgrupadoPorSemana).not.toHaveBeenCalled();
		});

		it('fecha → escribirGlobal', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: { tipo: 'fecha', fecha: new Date('2026-06-22') }
			});

			expect(mockEscribirGlobal).toHaveBeenCalled();
		});

		it('rango → escribirGlobal', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: {
					tipo: 'rango',
					desde: new Date('2026-06-01'),
					hasta: new Date('2026-06-15')
				}
			});

			expect(mockEscribirGlobal).toHaveBeenCalled();
		});
	});

	// ── (g) Fila TOTAL al final ─────────────────────────────────────────────

	describe('fila TOTAL al final (AC-15, AC-18, AC-19)', () => {
		it('siempre añade una fila TOTAL al final (con contrato)', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('mes', new Date('2026-06-15'))
			});

			expect(mockEscribirFilaTotal).toHaveBeenCalled();
		});

		it('siempre añade una fila TOTAL al final (sin contrato)', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings({ horas_semanales: 0 })],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			expect(mockEscribirFilaTotal).toHaveBeenCalled();
		});

		it('TOTAL va en columna Balance diario (índice 5) si hay contrato', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('mes', new Date('2026-06-15'))
			});

			// columnas = 7, columnaTotalIdx = 5 (Balance diario)
			expect(mockEscribirFilaTotal).toHaveBeenCalledWith(
				expect.anything(),
				expect.any(Number),
				7,
				5
			);
		});

		it('TOTAL va en columna Total día (índice 4) si no hay contrato', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings({ horas_semanales: 0 })],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			// columnas = 5, columnaTotalIdx = 4 (Total día)
			expect(mockEscribirFilaTotal).toHaveBeenCalledWith(
				expect.anything(),
				expect.any(Number),
				5,
				4
			);
		});
	});

	// ── (h) Nombre de fichero ─────────────────────────────────────────────────

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

	// ── (i) Sin datos → no se genera ─────────────────────────────────────────

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

	// ── (j) describirPeriodo ─────────────────────────────────────────────────

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
});
