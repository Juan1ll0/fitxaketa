/**
 * Tests para excel-wrapper.ts
 *
 * Verifica la creación de workbook, escritura de cabecera/filas/resumen,
 * y el guardado del fichero (con mock de write-excel-file).
 *
 * ACs cubiertos: AC-05, AC-07, AC-18
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	crearWorkbook,
	escribirCabecera,
	escribirFila,
	escribirFilaResumen,
	escribirSeparador,
	guardarFichero
} from '$lib/utils/excel-wrapper';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockToFile = vi.fn().mockResolvedValue(undefined);
const mockWriteXlsxFile = vi.fn().mockResolvedValue({ toFile: mockToFile });

vi.mock('write-excel-file/browser', () => ({
	default: mockWriteXlsxFile
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('excel-wrapper', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockWriteXlsxFile.mockResolvedValue({ toFile: mockToFile });
	});

	describe('crearWorkbook', () => {
		it('devuelve un Workbook con filas vacías, nombre de hoja por defecto y numColumnas=0', () => {
			const wb = crearWorkbook();
			expect(wb.rows).toEqual([]);
			expect(wb.sheetName).toBe('Jornadas');
			expect(wb.numColumnas).toBe(0);
		});
	});

	describe('escribirCabecera', () => {
		it('añade una fila al workbook con los nombres de columna dados', () => {
			const wb = crearWorkbook();
			escribirCabecera(wb, ['Fecha', 'Entrada', 'Salida']);
			expect(wb.rows).toHaveLength(1);
			expect(wb.rows[0]).toHaveLength(3);
		});

		it('configura numColumnas correctamente', () => {
			const wb = crearWorkbook();
			escribirCabecera(wb, ['A', 'B', 'C', 'D', 'E', 'F']);
			expect(wb.numColumnas).toBe(6);
		});

		it('las celdas de cabecera tienen fontWeight bold', () => {
			const wb = crearWorkbook();
			escribirCabecera(wb, ['Fecha', 'Duración']);
			const fila = wb.rows[0];
			expect(fila[0]).toMatchObject({ value: 'Fecha', fontWeight: 'bold' });
			expect(fila[1]).toMatchObject({ value: 'Duración', fontWeight: 'bold' });
		});

		it('las celdas de cabecera tienen fondo gris claro', () => {
			const wb = crearWorkbook();
			escribirCabecera(wb, ['Fecha']);
			expect(wb.rows[0][0]).toMatchObject({ backgroundColor: '#e5e7eb' });
		});
	});

	describe('escribirFila', () => {
		it('añade una fila de datos normal', () => {
			const wb = crearWorkbook();
			escribirFila(wb, ['01/06/2026', '08:00', '12:00', '4,0', null]);
			expect(wb.rows).toHaveLength(1);
			expect(wb.rows[0]).toEqual(['01/06/2026', '08:00', '12:00', '4,0', null]);
		});

		it('permite valores numéricos', () => {
			const wb = crearWorkbook();
			escribirFila(wb, ['01/06/2026', '08:00', '12:00', 4.0, null]);
			expect(wb.rows[0][3]).toBe(4.0);
		});

		it('permite null para celdas vacías', () => {
			const wb = crearWorkbook();
			escribirFila(wb, ['01/06/2026', '08:00', '12:00', '4,0', null]);
			expect(wb.rows[0][4]).toBeNull();
		});
	});

	describe('escribirFilaResumen', () => {
		it('añade una fila de resumen con texto de total', () => {
			const wb = crearWorkbook();
			escribirCabecera(wb, ['Fecha', 'Entrada', 'Salida', 'Duración', 'Total día']);
			escribirFilaResumen(wb, '40,5h');
			expect(wb.rows).toHaveLength(2);
			const resumen = wb.rows[1];
			// La columna Duración (índice 3) contiene el texto
			expect(resumen[3]).toMatchObject({ value: '40,5h' });
		});

		it('incluye el balance si se proporciona', () => {
			const wb = crearWorkbook();
			escribirCabecera(wb, ['Fecha', 'Entrada', 'Salida', 'Duración', 'Total día']);
			escribirFilaResumen(wb, '40,5h', '+2,5h');
			const resumen = wb.rows[1];
			expect(resumen[3]).toMatchObject({ value: '40,5h | Balance: +2,5h' });
		});

		it('la fila de resumen tiene fondo gris claro', () => {
			const wb = crearWorkbook();
			escribirCabecera(wb, ['Fecha', 'Entrada', 'Salida', 'Duración', 'Total día']);
			escribirFilaResumen(wb, '40,5h');
			const resumen = wb.rows[1];
			expect(resumen[0]).toMatchObject({ backgroundColor: '#f3f4f6' });
			expect(resumen[3]).toMatchObject({ backgroundColor: '#f3f4f6' });
		});

		it('la fila de resumen tiene borde superior (topBorderStyle thin)', () => {
			const wb = crearWorkbook();
			escribirCabecera(wb, ['Fecha', 'Entrada', 'Salida', 'Duración', 'Total día']);
			escribirFilaResumen(wb, '40,5h');
			const resumen = wb.rows[1];
			expect(resumen[0]).toMatchObject({ topBorderStyle: 'thin' });
			expect(resumen[3]).toMatchObject({ topBorderStyle: 'thin' });
		});

		it('las celdas vacías de resumen también tienen estilo', () => {
			const wb = crearWorkbook();
			escribirCabecera(wb, ['Fecha', 'Entrada', 'Salida', 'Duración', 'Total día']);
			escribirFilaResumen(wb, '40,5h');
			const resumen = wb.rows[1];
			// Celdas vacías (Fecha, Entrada, Salida, Total día) tienen fondo y borde
			expect(resumen[0]).toMatchObject({ backgroundColor: '#f3f4f6', topBorderStyle: 'thin' });
			expect(resumen[1]).toMatchObject({ backgroundColor: '#f3f4f6', topBorderStyle: 'thin' });
			expect(resumen[2]).toMatchObject({ backgroundColor: '#f3f4f6', topBorderStyle: 'thin' });
			expect(resumen[4]).toMatchObject({ backgroundColor: '#f3f4f6', topBorderStyle: 'thin' });
		});

		it('rellena columnas extra con estilo cuando numColumnas > 5', () => {
			const wb = crearWorkbook();
			// Con contrato: 6 columnas
			escribirCabecera(wb, [
				'Fecha',
				'Entrada',
				'Salida',
				'Duración',
				'Total día',
				'Balance diario'
			]);
			escribirFilaResumen(wb, '40,5h', '+2,5h');
			const resumen = wb.rows[1];
			// 6 columnas en total
			expect(resumen).toHaveLength(6);
			expect(resumen[5]).toMatchObject({ backgroundColor: '#f3f4f6', topBorderStyle: 'thin' });
		});
	});

	describe('escribirSeparador', () => {
		it('añade una fila vacía como separador visual', () => {
			const wb = crearWorkbook();
			escribirSeparador(wb);
			expect(wb.rows).toHaveLength(1);
			expect(wb.rows[0]).toEqual([]);
		});
	});

	describe('guardarFichero', () => {
		it('no hace nada si el workbook está vacío', async () => {
			const wb = crearWorkbook();
			await guardarFichero(wb, 'test.xlsx');
			// writeXlsxFile no debería llamarse con workbook vacío
			expect(mockWriteXlsxFile).not.toHaveBeenCalled();
			expect(mockToFile).not.toHaveBeenCalled();
		});

		it('llama a write-excel-file con las filas acumuladas y luego a toFile con el nombre', async () => {
			const wb = crearWorkbook();
			escribirCabecera(wb, ['Fecha', 'Duración']);
			escribirFila(wb, ['01/06/2026', '8,0']);

			await guardarFichero(wb, 'jornadas_20260627.xlsx');

			// writeXlsxFile se llama con las filas y la configuración de hoja
			expect(mockWriteXlsxFile).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({ sheet: 'Jornadas' })
			);
			// toFile se llama con el nombre del fichero
			expect(mockToFile).toHaveBeenCalledWith('jornadas_20260627.xlsx');
		});

		it('el nombre del fichero se pasa a toFile correctamente', async () => {
			const wb = crearWorkbook();
			escribirCabecera(wb, ['Fecha']);
			escribirFila(wb, ['01/06/2026']);

			await guardarFichero(wb, 'jornadas_20260627143025.xlsx');

			expect(mockToFile).toHaveBeenCalledWith('jornadas_20260627143025.xlsx');
		});
	});
});
