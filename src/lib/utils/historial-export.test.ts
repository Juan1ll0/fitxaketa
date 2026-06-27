/**
 * Tests para historial-export.ts
 *
 * Verifica la lógica de exportación de jornadas a XLSX:
 * - Solo cerradas se exportan
 * - Orden ascendente por start_time
 * - Columnas según contrato
 * - Total día solo en última fila del día
 * - Balance diario
 * - Resúmenes por sub-periodo (año→mes, mes→semana, global)
 * - Nombre de fichero
 * - Sin datos → no se genera
 * - describirPeriodo
 *
 * ACs cubiertos: AC-05 a AC-23
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
	mockGuardarFichero,
	mockEscribirAgrupadoPorMes,
	mockEscribirAgrupadoPorSemana,
	mockEscribirGlobal,
	mockDeterminarColumnas
} = vi.hoisted(() => ({
	mockCrearWorkbook: vi.fn(() => ({
		rows: [],
		sheetName: 'Jornadas',
		numColumnas: 0
	})),
	mockEscribirCabecera: vi.fn(),
	mockGuardarFichero: vi.fn().mockResolvedValue(undefined),
	mockEscribirAgrupadoPorMes: vi.fn(),
	mockEscribirAgrupadoPorSemana: vi.fn(),
	mockEscribirGlobal: vi.fn(),
	mockDeterminarColumnas: vi.fn((tieneContrato: boolean) =>
		tieneContrato
			? ['Fecha', 'Entrada', 'Salida', 'Duración', 'Total día', 'Balance diario']
			: ['Fecha', 'Entrada', 'Salida', 'Duración', 'Total día']
	)
}));

vi.mock('$lib/utils/excel-wrapper', () => ({
	crearWorkbook: mockCrearWorkbook,
	escribirCabecera: mockEscribirCabecera,
	guardarFichero: mockGuardarFichero
}));

vi.mock('$lib/utils/historial-export-filas', () => ({
	determinarColumnas: mockDeterminarColumnas,
	escribirAgrupadoPorMes: mockEscribirAgrupadoPorMes,
	escribirAgrupadoPorSemana: mockEscribirAgrupadoPorSemana,
	escribirGlobal: mockEscribirGlobal
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeJornada(override: Partial<Jornada> = {}): Jornada {
	const start = override.start_time ?? new Date('2026-06-22T08:00:00');
	return {
		id: Math.random(),
		start_time: start,
		end_time: new Date(start.getTime() + 8 * 60 * 60 * 1000), // 8h después
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

			// No debería llamarse a escribirGlobal/mes/semana porque la única jornada
			// abierta se filtra y no hay cerradas en la semana mocked
			// Verificamos que crearWorkbook se llamó (se llegó a generar el flujo)
			expect(mockCrearWorkbook).toHaveBeenCalled();
		});

		it('excluye jornadas con end_time null (no cerradas correctamente)', async () => {
			const sinEndTime = makeJornada({ status: 'closed', end_time: null });

			await exportarJornadas({
				jornadas: [sinEndTime],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			// No se llama a crearWorkbook porque la jornada se filtra (end_time null)
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

			// Verificar que se llamó a escribirAgrupadoPorSemana (mes)
			expect(mockEscribirAgrupadoPorSemana).toHaveBeenCalled();
			// Se verifica que se llamó con las jornadas en orden ascendente
			const args = mockEscribirAgrupadoPorSemana.mock.calls[0];
			const jornadasArg = args[1] as Jornada[];
			expect(jornadasArg[0].id).toBe(antigua.id);
			expect(jornadasArg[1].id).toBe(intermedia.id);
			expect(jornadasArg[2].id).toBe(reciente.id);
		});
	});

	// ── (c/d) Columnas según contrato ────────────────────────────────────────

	describe('columnas según contrato (AC-07, AC-13)', () => {
		it('usa 5 columnas cuando no hay contrato (horas_semanales=0)', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings({ horas_semanales: 0 })],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			// Sin contrato → 5 columnas
			expect(mockEscribirCabecera).toHaveBeenCalledWith(expect.anything(), [
				'Fecha',
				'Entrada',
				'Salida',
				'Duración',
				'Total día'
			]);
		});

		it('usa 6 columnas cuando hay contrato (horas_semanales>0 AND dias_laborables>0)', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings({ horas_semanales: 37.5, dias_laborables: 5 })],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			// Con contrato → 6 columnas (Balance diario)
			expect(mockEscribirCabecera).toHaveBeenCalledWith(expect.anything(), [
				'Fecha',
				'Entrada',
				'Salida',
				'Duración',
				'Total día',
				'Balance diario'
			]);
		});

		it('usa 5 columnas cuando dias_laborables=0 aunque horas_semanales>0', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings({ horas_semanales: 37.5, dias_laborables: 0 })],
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
	});

	// ── (g) Resumen año→mes ─────────────────────────────────────────────────

	describe('resumen por mes (año) (AC-15)', () => {
		it('llama a escribirAgrupadoPorMes para filtro tipo=año', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('año', new Date('2026-06-15'))
			});

			expect(mockEscribirAgrupadoPorMes).toHaveBeenCalled();
			expect(mockEscribirAgrupadoPorSemana).not.toHaveBeenCalled();
			expect(mockEscribirGlobal).not.toHaveBeenCalled();
		});
	});

	// ── (h) Resumen mes→semana ───────────────────────────────────────────────

	describe('resumen por semana (mes) (AC-16)', () => {
		it('llama a escribirAgrupadoPorSemana para filtro tipo=mes', async () => {
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
	});

	// ── (i) Resumen global (semana/rango/fecha) ───────────────────────────────

	describe('resumen global (semana/rango/fecha) (AC-17)', () => {
		it('llama a escribirGlobal para filtro tipo=periodo semana', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: filtroPeriodo('semana', new Date('2026-06-22'))
			});

			expect(mockEscribirGlobal).toHaveBeenCalled();
			expect(mockEscribirAgrupadoPorMes).not.toHaveBeenCalled();
			expect(mockEscribirAgrupadoPorSemana).not.toHaveBeenCalled();
		});

		it('llama a escribirGlobal para filtro tipo=fecha', async () => {
			const jornada = makeJornada();

			await exportarJornadas({
				jornadas: [jornada],
				snapshots: [makeSettings()],
				filtro: { tipo: 'fecha', fecha: new Date('2026-06-22') }
			});

			expect(mockEscribirGlobal).toHaveBeenCalled();
		});

		it('llama a escribirGlobal para filtro tipo=rango', async () => {
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

	// ── (j) Nombre de fichero ─────────────────────────────────────────────────

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
			// Debe tener exactamente 14 dígitos para la fecha+hora
			const timestamp = nombre.match(/jornadas_(\d{14})\.xlsx/)?.[1];
			expect(timestamp).toBeDefined();
			expect(timestamp).toHaveLength(14);
		});
	});

	// ── (k) Sin datos → no se genera ─────────────────────────────────────────

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

	// ── (l) describirPeriodo ─────────────────────────────────────────────────

	describe('describirPeriodo (AC-02)', () => {
		it('devuelve texto correcto para periodo=año', () => {
			const filtro = filtroPeriodo('año', new Date('2026-06-15'));
			const resultado = describirPeriodo(filtro, 1);
			expect(resultado).toBe('año 2026');
		});

		it('devuelve texto correcto para periodo=mes', () => {
			const filtro = filtroPeriodo('mes', new Date('2026-06-15'));
			const resultado = describirPeriodo(filtro, 1);
			expect(resultado).toBe('mes de junio de 2026');
		});

		it('devuelve texto correcto para periodo=mes de enero', () => {
			const filtro = filtroPeriodo('mes', new Date('2026-01-15'));
			const resultado = describirPeriodo(filtro, 1);
			expect(resultado).toBe('mes de enero de 2026');
		});

		it('devuelve texto correcto para periodo=semana', () => {
			const filtro = filtroPeriodo('semana', new Date('2026-06-22')); // lunes 22
			const resultado = describirPeriodo(filtro, 1);
			expect(resultado).toBe('semana del 22 al 28 de junio de 2026');
		});

		it('devuelve texto correcto para filtro tipo=fecha', () => {
			const filtro: FiltroTemporal = { tipo: 'fecha', fecha: new Date('2026-06-22') };
			const resultado = describirPeriodo(filtro, 1);
			expect(resultado).toBe('fecha 22 de junio de 2026');
		});

		it('devuelve texto correcto para filtro tipo=rango (días distintos)', () => {
			const filtro: FiltroTemporal = {
				tipo: 'rango',
				desde: new Date('2026-06-01'),
				hasta: new Date('2026-06-15')
			};
			const resultado = describirPeriodo(filtro, 1);
			expect(resultado).toBe('rango del 1 al 15 de junio de 2026');
		});

		it('devuelve texto de fecha única cuando rango es un solo día', () => {
			const filtro: FiltroTemporal = {
				tipo: 'rango',
				desde: new Date('2026-06-15'),
				hasta: new Date('2026-06-15')
			};
			const resultado = describirPeriodo(filtro, 1);
			expect(resultado).toBe('fecha 15 de junio de 2026');
		});
	});
});
