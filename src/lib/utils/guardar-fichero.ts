/**
 * Guarda un Blob con el mejor diálogo nativo disponible, en cascada:
 * 1. Escritorio Chromium → `showSaveFilePicker` ("Guardar como", elige ruta).
 * 2. Móvil (Android/iOS) → `navigator.share` con archivo (hoja de compartir → «Guardar
 *    en Archivos», AirDrop, correo…).
 * 3. Fallback → descarga clásica con ancla.
 *
 * Lo usan tanto la exportación a Excel (Historial) como la copia de seguridad JSON
 * (Ajustes), para que compartan la misma UX de guardado/compartir.
 */

export interface TipoFichero {
	mime: string;
	/** Descripción y extensiones para el diálogo «Guardar como» de escritorio. */
	descripcion: string;
	extensiones: string[];
}

export const TIPO_XLSX: TipoFichero = {
	mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	descripcion: 'Excel',
	extensiones: ['.xlsx']
};

export const TIPO_JSON: TipoFichero = {
	mime: 'application/json',
	descripcion: 'Copia de seguridad',
	extensiones: ['.json']
};

/**
 * El usuario canceló el diálogo de guardado/compartir: no es un error real.
 * Solo `AbortError` es una cancelación; `NotAllowedError` (p. ej. gesto de
 * usuario perdido en iOS) debe caer al fallback de descarga, no ignorarse.
 */
function esCancelacion(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'AbortError';
}

interface SaveFilePicker {
	showSaveFilePicker?: (options: {
		suggestedName?: string;
		types?: Array<{ description?: string; accept: Record<string, string[]> }>;
	}) => Promise<{
		createWritable: () => Promise<{
			write: (data: Blob) => Promise<void>;
			close: () => Promise<void>;
		}>;
	}>;
}

/** Descarga clásica: ancla con `download` + click. Último recurso si no hay diálogo nativo. */
function descargarBlob(blob: Blob, nombre: string): void {
	const url = URL.createObjectURL(blob);
	const enlace = document.createElement('a');
	enlace.href = url;
	enlace.download = nombre;
	enlace.click();
	URL.revokeObjectURL(url);
}

export async function guardarBlob(
	blob: Blob,
	nombre: string,
	tipo: TipoFichero = TIPO_XLSX
): Promise<void> {
	const picker = (window as Window & SaveFilePicker).showSaveFilePicker;
	if (picker) {
		try {
			const handle = await picker({
				suggestedName: nombre,
				types: [{ description: tipo.descripcion, accept: { [tipo.mime]: tipo.extensiones } }]
			});
			const writable = await handle.createWritable();
			await writable.write(blob);
			await writable.close();
			return;
		} catch (error) {
			if (esCancelacion(error)) return;
			descargarBlob(blob, nombre);
			return;
		}
	}

	const archivo = new File([blob], nombre, { type: tipo.mime });
	if (navigator.canShare?.({ files: [archivo] })) {
		try {
			await navigator.share({ files: [archivo], title: nombre });
			return;
		} catch (error) {
			if (esCancelacion(error)) return;
			descargarBlob(blob, nombre);
			return;
		}
	}

	descargarBlob(blob, nombre);
}
