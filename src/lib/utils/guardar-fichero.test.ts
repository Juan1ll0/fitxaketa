import { describe, it, expect, vi, afterEach } from 'vitest';
import { guardarBlob, TIPO_JSON, TIPO_XLSX } from './guardar-fichero';

// La cascada completa (showSaveFilePicker → share → descarga) se prueba a fondo en
// excel-wrapper.test.ts. Aquí se cubre la parametrización por TipoFichero (AC-04/05/15).

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('guardarBlob — tipo de fichero', () => {
	it('comparte un File con el mime del tipo (JSON) (AC-04, AC-15)', async () => {
		const share = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('navigator', { canShare: vi.fn().mockReturnValue(true), share });

		await guardarBlob(new Blob(['{}']), 'copia.json', TIPO_JSON);

		const arg = share.mock.calls[0][0] as { files: File[] };
		expect(arg.files[0]).toBeInstanceOf(File);
		expect(arg.files[0].name).toBe('copia.json');
		expect(arg.files[0].type).toBe('application/json');
	});

	it('por defecto usa el tipo XLSX (AC-15)', async () => {
		const share = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('navigator', { canShare: vi.fn().mockReturnValue(true), share });

		await guardarBlob(new Blob(['x']), 'jornadas.xlsx');

		const arg = share.mock.calls[0][0] as { files: File[] };
		expect(arg.files[0].type).toBe(TIPO_XLSX.mime);
	});

	it('AbortError al compartir no cae a descarga (AC-05)', async () => {
		vi.stubGlobal('navigator', {
			canShare: vi.fn().mockReturnValue(true),
			share: vi.fn().mockRejectedValue(new DOMException('cancel', 'AbortError'))
		});
		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

		await expect(guardarBlob(new Blob(['{}']), 'copia.json', TIPO_JSON)).resolves.toBeUndefined();
		expect(click).not.toHaveBeenCalled();
	});
});
