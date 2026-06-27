/**
 * Tests para excel-wrapper.ts
 *
 * Verifica la creación de workbook, escritura de cabecera/filas/TOTAL,
 * celdas numéricas con formato condicional, columna Total semana, y el
 * guardado del fichero (con mock de write-excel-file).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	celdaBalanceDiario,
	celdaTotalDia,
	crearWorkbook,
	escribirCabecera,
	escribirColumnaTotalSemana,
	escribirFila,
	escribirFilaNumerica,
	escribirFilaTotal,
	escribirSeparador,
	escribirTitulo,
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
		it('devuelve un Workbook con filas vacías y nombre de hoja por defecto', () => {
			const wb = crearWorkbook();
			expect(wb.rows).toEqual([]);
			expect(wb.sheetName).toBe('Jornadas');
		});
	});

	describe('escribirCabecera', () => {
		it('añade una fila al workbook con los nombres de columna dados', () => {
			const wb = crearWorkbook();
			escribirCabecera(wb, ['Fecha', 'Entrada', 'Salida']);
			expect(wb.rows).toHaveLength(1);
			expect(wb.rows[0]).toHaveLength(3);
		});

		it('las celdas de cabecera tienen fontWeight bold y fondo gris claro', () => {
			const wb = crearWorkbook();
			escribirCabecera(wb, ['Fecha', 'Duración']);
			const fila = wb.rows[0];
			expect(fila[0]).toMatchObject({
				value: 'Fecha',
				fontWeight: 'bold',
				backgroundColor: '#e5e7eb'
			});
			expect(fila[1]).toMatchObject({ value: 'Duración', fontWeight: 'bold' });
		});
	});

	describe('celdaTotalDia', () => {
		it('devuelve null cuando el valor es null', () => {
			expect(celdaTotalDia(null)).toBeNull();
		});

		it('devuelve Cell numérica con format 0.0', () => {
			const cell = celdaTotalDia(8.5);
			expect(cell).toMatchObject({ value: 8.5, type: Number, format: '0.0' });
		});
	});

	describe('celdaBalanceDiario', () => {
		it('devuelve null cuando el valor es null', () => {
			expect(celdaBalanceDiario(null)).toBeNull();
		});

		it('devuelve Cell con textColor verde y formato con signo para valores >= 0', () => {
			const cell = celdaBalanceDiario(0.5);
			expect(cell).toMatchObject({
				value: 0.5,
				type: Number,
				fontWeight: 'bold',
				textColor: '#16a34a',
				format: '+0.0;-0.0;0.0'
			});
		});

		it('devuelve Cell con textColor rojo para valores < 0', () => {
			const cell = celdaBalanceDiario(-0.5);
			expect(cell).toMatchObject({
				value: -0.5,
				type: Number,
				fontWeight: 'bold',
				textColor: '#dc2626'
			});
		});

		it('texto verde para el cero (no es negativo)', () => {
			const cell = celdaBalanceDiario(0);
			expect(cell).toMatchObject({ textColor: '#16a34a' });
		});
	});

	describe('escribirFila', () => {
		it('añade una fila de datos normal', () => {
			const wb = crearWorkbook();
			escribirFila(wb, ['01/06/2026', '08:00', '12:00', '04:00', null]);
			expect(wb.rows).toHaveLength(1);
			expect(wb.rows[0]).toEqual(['01/06/2026', '08:00', '12:00', '04:00', null]);
		});

		it('permite valores numéricos', () => {
			const wb = crearWorkbook();
			escribirFila(wb, ['01/06/2026', '08:00', '12:00', '04:00', 8.0]);
			expect(wb.rows[0][4]).toBe(8.0);
		});

		it('permite null para celdas vacías', () => {
			const wb = crearWorkbook();
			escribirFila(wb, ['01/06/2026', '08:00', '12:00', '04:00', null]);
			expect(wb.rows[0][4]).toBeNull();
		});

		it('acepta Cell objects para estilo por celda', () => {
			const wb = crearWorkbook();
			const cell = { value: 8.0, type: Number, format: '0.0' } as const;
			escribirFila(wb, ['01/06/2026', '08:00', '12:00', '04:00', cell]);
			expect(wb.rows[0][4]).toMatchObject({ value: 8.0, type: Number });
		});
	});

	describe('escribirFilaNumerica', () => {
		it('añade una fila donde cada número se convierte en Cell con type:Number y format:0.0', () => {
			const wb = crearWorkbook();
			escribirFilaNumerica(wb, [8.0, 0.5, null]);
			expect(wb.rows).toHaveLength(1);
			expect(wb.rows[0][0]).toMatchObject({ value: 8.0, type: Number, format: '0.0' });
			expect(wb.rows[0][1]).toMatchObject({ value: 0.5, type: Number, format: '0.0' });
			expect(wb.rows[0][2]).toBeNull();
		});
	});

	describe('escribirFilaTotal', () => {
		it('añade una fila con etiqueta "TOTAL" en la primera celda', () => {
			const wb = crearWorkbook();
			escribirFilaTotal(wb, 40.5, 5, 4);
			const total = wb.rows[0];
			expect(total[0]).toMatchObject({ value: 'TOTAL', fontWeight: 'bold' });
		});

		it('el valor numérico va en columnaTotalIdx con type:Number y format:0.0', () => {
			const wb = crearWorkbook();
			escribirFilaTotal(wb, 40.5, 5, 4);
			const total = wb.rows[0];
			expect(total[4]).toMatchObject({
				value: 40.5,
				type: Number,
				fontWeight: 'bold',
				format: '0.0'
			});
		});

		it('todas las celdas tienen topBorderStyle thick', () => {
			const wb = crearWorkbook();
			escribirFilaTotal(wb, 40.5, 5, 4);
			const total = wb.rows[0];
			for (const cell of total) {
				expect(cell).toMatchObject({ topBorderStyle: 'thick' });
			}
		});

		it('el fontSize de la fila TOTAL es mayor (14pt) que el base (10pt)', () => {
			const wb = crearWorkbook();
			escribirFilaTotal(wb, 40.5, 5, 4);
			const total = wb.rows[0];
			expect(total[0]).toMatchObject({ fontSize: 14 });
			expect(total[4]).toMatchObject({ fontSize: 14 });
		});

		it('el resto de celdas están vacías pero con borde grueso', () => {
			const wb = crearWorkbook();
			escribirFilaTotal(wb, 40.5, 6, 5);
			const total = wb.rows[0];
			// celdas 1,2,3 están vacías (solo borde)
			expect(total[1]).toEqual({ topBorderStyle: 'thick' });
			expect(total[2]).toEqual({ topBorderStyle: 'thick' });
			expect(total[3]).toEqual({ topBorderStyle: 'thick' });
		});
	});

	describe('escribirSeparador', () => {
		it('sin filas previas, añade una fila vacía (no hay nada que separar)', () => {
			const wb = crearWorkbook();
			escribirSeparador(wb);
			expect(wb.rows).toHaveLength(1);
			expect(wb.rows[0]).toEqual([]);
		});

		it('después de filas con contenido, añade fila con borde inferior 2pt sólido negro', () => {
			const wb = crearWorkbook();
			escribirFila(wb, ['A', 'B', 'C']);
			escribirSeparador(wb);
			expect(wb.rows).toHaveLength(2);
			expect(wb.rows[1]).toHaveLength(3);
			for (const cell of wb.rows[1]) {
				expect(cell).toMatchObject({
					bottomBorderStyle: 'medium',
					bottomBorderColor: '#000000'
				});
			}
		});

		it('el número de celdas del separador coincide con la fila previa', () => {
			const wb = crearWorkbook();
			escribirFila(wb, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
			escribirSeparador(wb);
			expect(wb.rows[1]).toHaveLength(8);
		});

		it('el separador no contiene celdas con valor (solo bordes)', () => {
			const wb = crearWorkbook();
			escribirFila(wb, ['A', 'B']);
			escribirSeparador(wb);
			for (const cell of wb.rows[1]) {
				expect(cell).not.toMatchObject({ value: expect.anything() });
			}
		});
	});

	describe('escribirTitulo (AC-05a)', () => {
		it('añade una fila con el título en la primera celda', () => {
			const wb = crearWorkbook();
			escribirTitulo(wb, 'Informe anual - 2026', 5);
			expect(wb.rows).toHaveLength(1);
			expect(wb.rows[0][0]).toMatchObject({ value: 'Informe anual - 2026' });
		});

		it('la celda del título se extiende columnSpan columnas (merge visual)', () => {
			const wb = crearWorkbook();
			escribirTitulo(wb, 'Informe anual - 2026', 8);
			expect(wb.rows[0][0]).toMatchObject({ columnSpan: 8 });
		});

		it('el número de celdas de la fila es igual a numColumnas', () => {
			const wb = crearWorkbook();
			escribirTitulo(wb, 'Título', 5);
			expect(wb.rows[0]).toHaveLength(5);
		});

		it('las celdas restantes del span son null (la librería aplica los estilos)', () => {
			const wb = crearWorkbook();
			escribirTitulo(wb, 'Título', 8);
			for (let i = 1; i < 8; i++) {
				expect(wb.rows[0][i]).toBeNull();
			}
		});

		it('aplica estilo: negrita, 16pt, centrado y altura de fila mayor', () => {
			const wb = crearWorkbook();
			escribirTitulo(wb, 'Informe anual - 2026', 5);
			const title = wb.rows[0][0];
			expect(title).toMatchObject({
				fontWeight: 'bold',
				fontSize: 16,
				align: 'center',
				alignVertical: 'center',
				height: 24
			});
		});

		it('funciona con cualquier número de columnas (5, 6, 7 u 8)', () => {
			for (const n of [5, 6, 7, 8]) {
				const wb = crearWorkbook();
				escribirTitulo(wb, 'Título', n);
				expect(wb.rows[0]).toHaveLength(n);
				expect(wb.rows[0][0]).toMatchObject({ columnSpan: n });
			}
		});
	});

	describe('escribirColumnaTotalSemana', () => {
		it('añade una Cell para la 7ª columna al final de la última fila', () => {
			const wb = crearWorkbook();
			escribirFila(wb, ['01/06/2026', '08:00', '12:00', '04:00', 8.0, 0.5]);
			escribirColumnaTotalSemana(wb, 40.0);
			expect(wb.rows[0]).toHaveLength(7);
			expect(wb.rows[0][6]).toMatchObject({
				value: 40.0,
				type: Number,
				fontWeight: 'bold',
				fontSize: 14,
				textColor: '#000000',
				backgroundColor: '#bbf7d0'
			});
		});

		it('fondo verde pastel para valor >= 0', () => {
			const wb = crearWorkbook();
			escribirFila(wb, ['01/06/2026', '08:00', '12:00', '04:00', 8.0, 0.5]);
			escribirColumnaTotalSemana(wb, 40.0);
			expect(wb.rows[0][6]).toMatchObject({ backgroundColor: '#bbf7d0' });
		});

		it('fondo rojo pastel para valor < 0', () => {
			const wb = crearWorkbook();
			escribirFila(wb, ['01/06/2026', '08:00', '12:00', '04:00', 8.0, -0.5]);
			escribirColumnaTotalSemana(wb, -1.0);
			expect(wb.rows[0][6]).toMatchObject({ backgroundColor: '#fecaca' });
		});

		it('fontSize es 14 (4pt mayor que Balance diario)', () => {
			const wb = crearWorkbook();
			escribirFila(wb, ['01/06/2026', '08:00', '12:00', '04:00', 8.0, 0.5]);
			escribirColumnaTotalSemana(wb, 40.0);
			expect(wb.rows[0][6]).toMatchObject({ fontSize: 14 });
		});

		it('añade null si el valor es null', () => {
			const wb = crearWorkbook();
			escribirFila(wb, ['01/06/2026', '08:00', '12:00', '04:00', 8.0, 0.5]);
			escribirColumnaTotalSemana(wb, null);
			expect(wb.rows[0]).toHaveLength(7);
			expect(wb.rows[0][6]).toBeNull();
		});

		it('no hace nada si el workbook está vacío', () => {
			const wb = crearWorkbook();
			escribirColumnaTotalSemana(wb, 40.0);
			expect(wb.rows).toHaveLength(0);
		});
	});

	describe('guardarFichero', () => {
		it('no hace nada si el workbook está vacío', async () => {
			const wb = crearWorkbook();
			await guardarFichero(wb, 'test.xlsx');
			expect(mockWriteXlsxFile).not.toHaveBeenCalled();
			expect(mockToFile).not.toHaveBeenCalled();
		});

		it('llama a write-excel-file con las filas acumuladas y luego a toFile con el nombre', async () => {
			const wb = crearWorkbook();
			escribirCabecera(wb, ['Fecha', 'Duración']);
			escribirFila(wb, ['01/06/2026', '04:00']);

			await guardarFichero(wb, 'jornadas_20260627.xlsx');

			expect(mockWriteXlsxFile).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({ sheet: 'Jornadas' })
			);
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
