/**
 * Tests para excel-wrapper.ts
 *
 * Verifica la creación de workbook, escritura de cabecera/filas/TOTAL,
 * celdas numéricas con formato condicional, columna Total semana/Mes y
 * Balance semana/Mes, y el guardado del fichero (con mock de write-excel-file).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	celdaBalanceDiario,
	celdaBalanceSemana,
	celdaTotalDia,
	celdaTotalSemana,
	crearWorkbook,
	escribirCabecera,
	escribirFila,
	escribirFilaTotal,
	escribirTitulo,
	guardarFichero,
	type TotalesFila
} from '$lib/utils/excel-wrapper';

const blobGenerado = new Blob(['xlsx'], { type: 'application/octet-stream' });
const mockToBlob = vi.fn().mockResolvedValue(blobGenerado);
const mockWriteXlsxFile = vi.fn().mockResolvedValue({ toBlob: mockToBlob });

vi.mock('write-excel-file/browser', () => ({
	default: mockWriteXlsxFile
}));

describe('excel-wrapper', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.unstubAllGlobals();
		mockWriteXlsxFile.mockResolvedValue({ toBlob: mockToBlob });
		mockToBlob.mockResolvedValue(blobGenerado);
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

	describe('celdaTotalSemana', () => {
		it('devuelve null cuando el valor es null', () => {
			expect(celdaTotalSemana(null)).toBeNull();
		});

		it('devuelve Cell con fontSize 14 (4pt mayor) y formato 0.0 (siempre >= 0)', () => {
			const cell = celdaTotalSemana(40.0);
			expect(cell).toMatchObject({
				value: 40.0,
				type: Number,
				fontWeight: 'bold',
				fontSize: 14,
				textColor: '#000000',
				format: '0.0'
			});
		});

		it('NO aplica backgroundColor (sin color condicional, siempre positivo o cero)', () => {
			const cell = celdaTotalSemana(40.0);
			expect(cell).not.toHaveProperty('backgroundColor');
		});

		it('NO aplica backgroundColor tampoco para valor 0', () => {
			const cell = celdaTotalSemana(0);
			expect(cell).not.toHaveProperty('backgroundColor');
		});
	});

	describe('celdaBalanceSemana', () => {
		it('devuelve null cuando el valor es null', () => {
			expect(celdaBalanceSemana(null)).toBeNull();
		});

		it('fondo verde pastel para valor >= 0', () => {
			const cell = celdaBalanceSemana(2.5);
			expect(cell).toMatchObject({
				value: 2.5,
				type: Number,
				fontWeight: 'bold',
				fontSize: 14,
				backgroundColor: '#bbf7d0',
				format: '+0.0;-0.0;0.0'
			});
		});

		it('fondo rojo pastel para valor < 0', () => {
			const cell = celdaBalanceSemana(-1.0);
			expect(cell).toMatchObject({
				value: -1.0,
				backgroundColor: '#fecaca',
				format: '+0.0;-0.0;0.0'
			});
		});

		it('fontSize es 14 (4pt mayor que Balance diario)', () => {
			const cell = celdaBalanceSemana(2.5);
			expect(cell).toMatchObject({ fontSize: 14 });
		});

		it('texto en negro (no rojo/verde como Balance diario)', () => {
			const cell = celdaBalanceSemana(-1.0);
			expect(cell).toMatchObject({ textColor: '#000000' });
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

		describe('bottomBorder (AC-18)', () => {
			it('sin opciones, no aplica borde inferior', () => {
				const wb = crearWorkbook();
				escribirFila(wb, ['01/06/2026', '08:00', '12:00', '04:00', null]);
				expect(wb.rows[0][0]).toBe('01/06/2026');
				expect(wb.rows[0][0]).not.toMatchObject({ bottomBorderStyle: 'medium' });
			});

			it('con bottomBorder=true, aplica borde inferior 2pt sólido negro a cada celda', () => {
				const wb = crearWorkbook();
				escribirFila(wb, ['A', 'B', 'C'], { bottomBorder: true });
				expect(wb.rows[0]).toHaveLength(3);
				for (const cell of wb.rows[0]) {
					expect(cell).toMatchObject({
						bottomBorderStyle: 'medium',
						bottomBorderColor: '#000000'
					});
				}
			});

			it('preserva el valor de la celda al añadir el borde', () => {
				const wb = crearWorkbook();
				escribirFila(wb, ['A', 'B', 'C'], { bottomBorder: true });
				expect(wb.rows[0][0]).toMatchObject({ value: 'A' });
				expect(wb.rows[0][1]).toMatchObject({ value: 'B' });
				expect(wb.rows[0][2]).toMatchObject({ value: 'C' });
			});

			it('preserva estilos previos de la celda al añadir el borde', () => {
				const wb = crearWorkbook();
				const cell = { value: 8.0, type: Number, fontWeight: 'bold' as const };
				escribirFila(wb, ['A', cell], { bottomBorder: true });
				expect(wb.rows[0][1]).toMatchObject({
					value: 8.0,
					type: Number,
					fontWeight: 'bold',
					bottomBorderStyle: 'medium',
					bottomBorderColor: '#000000'
				});
			});

			it('convierte null en celda con solo el borde inferior', () => {
				const wb = crearWorkbook();
				escribirFila(wb, ['A', null, 'C'], { bottomBorder: true });
				expect(wb.rows[0][1]).toEqual({
					bottomBorderStyle: 'medium',
					bottomBorderColor: '#000000'
				});
			});
		});
	});

	describe('escribirFilaTotal', () => {
		it('añade una fila con etiqueta "TOTAL" en la primera celda', () => {
			const wb = crearWorkbook();
			const totales: TotalesFila = {
				totalDia: 40.5,
				balanceDiario: null,
				totalPeriodo: null,
				balancePeriodo: null
			};
			escribirFilaTotal(wb, totales, 5);
			expect(wb.rows[0][0]).toMatchObject({ value: 'TOTAL', fontWeight: 'bold' });
		});

		it('el totalDia va en col 5 con type:Number y format:0.0', () => {
			const wb = crearWorkbook();
			const totales: TotalesFila = {
				totalDia: 40.5,
				balanceDiario: null,
				totalPeriodo: null,
				balancePeriodo: null
			};
			escribirFilaTotal(wb, totales, 5);
			expect(wb.rows[0][4]).toMatchObject({
				value: 40.5,
				type: Number,
				fontWeight: 'bold',
				format: '0.0'
			});
		});

		it('con contrato: balanceDiario va en col 6', () => {
			const wb = crearWorkbook();
			const totales: TotalesFila = {
				totalDia: 40.5,
				balanceDiario: 5.0,
				totalPeriodo: null,
				balancePeriodo: null
			};
			escribirFilaTotal(wb, totales, 6);
			expect(wb.rows[0][5]).toMatchObject({ value: 5.0, type: Number, format: '+0.0;-0.0;0.0' });
		});

		it('sin contrato: balanceDiario=null → col 6 vacía (con borde)', () => {
			const wb = crearWorkbook();
			const totales: TotalesFila = {
				totalDia: 40.5,
				balanceDiario: null,
				totalPeriodo: null,
				balancePeriodo: null
			};
			escribirFilaTotal(wb, totales, 6);
			expect(wb.rows[0][5]).toEqual({ topBorderStyle: 'thick' });
		});

		it('mes/año con contrato: totales en col 7 (Total) y col 8 (Balance)', () => {
			const wb = crearWorkbook();
			const totales: TotalesFila = {
				totalDia: 40.5,
				balanceDiario: 5.0,
				totalPeriodo: 40.0,
				balancePeriodo: 2.5
			};
			escribirFilaTotal(wb, totales, 8);
			expect(wb.rows[0][6]).toMatchObject({ value: 40.0, type: Number, format: '0.0' });
			expect(wb.rows[0][7]).toMatchObject({ value: 2.5, type: Number, format: '+0.0;-0.0;0.0' });
		});

		it('todas las celdas tienen topBorderStyle thick', () => {
			const wb = crearWorkbook();
			const totales: TotalesFila = {
				totalDia: 40.5,
				balanceDiario: null,
				totalPeriodo: null,
				balancePeriodo: null
			};
			escribirFilaTotal(wb, totales, 5);
			for (const cell of wb.rows[0]) {
				expect(cell).toMatchObject({ topBorderStyle: 'thick' });
			}
		});

		it('el fontSize de la fila TOTAL es mayor (14pt) que el base (10pt)', () => {
			const wb = crearWorkbook();
			const totales: TotalesFila = {
				totalDia: 40.5,
				balanceDiario: null,
				totalPeriodo: null,
				balancePeriodo: null
			};
			escribirFilaTotal(wb, totales, 5);
			expect(wb.rows[0][0]).toMatchObject({ fontSize: 14 });
			expect(wb.rows[0][4]).toMatchObject({ fontSize: 14 });
		});

		it('el resto de celdas están vacías pero con borde grueso', () => {
			const wb = crearWorkbook();
			const totales: TotalesFila = {
				totalDia: 40.5,
				balanceDiario: null,
				totalPeriodo: null,
				balancePeriodo: null
			};
			escribirFilaTotal(wb, totales, 6);
			expect(wb.rows[0][1]).toEqual({ topBorderStyle: 'thick' });
			expect(wb.rows[0][2]).toEqual({ topBorderStyle: 'thick' });
			expect(wb.rows[0][3]).toEqual({ topBorderStyle: 'thick' });
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

	describe('guardarFichero', () => {
		function wbConDatos(): ReturnType<typeof crearWorkbook> {
			const wb = crearWorkbook();
			escribirCabecera(wb, ['Fecha', 'Duración']);
			escribirFila(wb, ['01/06/2026', '04:00']);
			return wb;
		}

		it('no hace nada si el workbook está vacío', async () => {
			const wb = crearWorkbook();
			await guardarFichero(wb, 'test.xlsx');
			expect(mockWriteXlsxFile).not.toHaveBeenCalled();
			expect(mockToBlob).not.toHaveBeenCalled();
		});

		it('genera el blob con las filas acumuladas en la hoja Jornadas', async () => {
			vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:x'), revokeObjectURL: vi.fn() });
			vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

			await guardarFichero(wbConDatos(), 'jornadas_20260627.xlsx');

			expect(mockWriteXlsxFile).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({ sheet: 'Jornadas' })
			);
			expect(mockToBlob).toHaveBeenCalled();
		});

		describe('mecanismo de guardado', () => {
			it('usa showSaveFilePicker cuando está disponible (diálogo "Guardar como")', async () => {
				const write = vi.fn().mockResolvedValue(undefined);
				const close = vi.fn().mockResolvedValue(undefined);
				const showSaveFilePicker = vi
					.fn()
					.mockResolvedValue({ createWritable: vi.fn().mockResolvedValue({ write, close }) });
				vi.stubGlobal('showSaveFilePicker', showSaveFilePicker);
				const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

				await guardarFichero(wbConDatos(), 'jornadas.xlsx');

				expect(showSaveFilePicker).toHaveBeenCalledWith(
					expect.objectContaining({ suggestedName: 'jornadas.xlsx' })
				);
				expect(write).toHaveBeenCalledWith(blobGenerado);
				expect(close).toHaveBeenCalled();
				expect(click).not.toHaveBeenCalled();
				click.mockRestore();
			});

			it('si el usuario cancela el picker no propaga ni cae al fallback', async () => {
				const showSaveFilePicker = vi
					.fn()
					.mockRejectedValue(new DOMException('cancel', 'AbortError'));
				vi.stubGlobal('showSaveFilePicker', showSaveFilePicker);
				const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

				await expect(guardarFichero(wbConDatos(), 'jornadas.xlsx')).resolves.toBeUndefined();
				expect(click).not.toHaveBeenCalled();
				click.mockRestore();
			});

			it('usa navigator.share con archivo en móvil (sin picker)', async () => {
				const share = vi.fn().mockResolvedValue(undefined);
				const canShare = vi.fn().mockReturnValue(true);
				vi.stubGlobal('navigator', { canShare, share });
				const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

				await guardarFichero(wbConDatos(), 'jornadas.xlsx');

				expect(share).toHaveBeenCalledWith(
					expect.objectContaining({ title: 'jornadas.xlsx', files: expect.any(Array) })
				);
				expect(click).not.toHaveBeenCalled();
				click.mockRestore();
			});

			it('si el usuario cancela el share no propaga ni cae al fallback', async () => {
				const share = vi.fn().mockRejectedValue(new DOMException('cancel', 'AbortError'));
				vi.stubGlobal('navigator', { canShare: vi.fn().mockReturnValue(true), share });
				const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

				await expect(guardarFichero(wbConDatos(), 'jornadas.xlsx')).resolves.toBeUndefined();
				expect(click).not.toHaveBeenCalled();
				click.mockRestore();
			});

			it('fallback: descarga clásica con ancla cuando no hay picker ni share', async () => {
				vi.stubGlobal('navigator', { canShare: undefined, share: undefined });
				const createObjectURL = vi.fn().mockReturnValue('blob:fake');
				const revokeObjectURL = vi.fn();
				vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
				const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

				await guardarFichero(wbConDatos(), 'jornadas.xlsx');

				expect(createObjectURL).toHaveBeenCalledWith(blobGenerado);
				expect(click).toHaveBeenCalled();
				expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
				click.mockRestore();
			});
		});
	});
});
