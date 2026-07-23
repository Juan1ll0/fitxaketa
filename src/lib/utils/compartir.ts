/**
 * Entrega un fichero al usuario con la mejor opción disponible:
 *
 * - **Móvil con Web Share de ficheros** (iOS/Android): abre la hoja de compartir del
 *   sistema (`navigator.share`), donde el usuario elige destino — «Guardar en Archivos»
 *   (y ahí la carpeta), AirDrop, correo, etc. Es el equivalente móvil a «guardar como».
 * - **Resto** (o sin soporte): descarga por enlace (Blob + `<a download>`).
 *
 * Cancelar la hoja de compartir (`AbortError`) es un **no-op**: no se descarga por
 * detrás. Otros fallos del share (p. ej. `NotAllowedError` por gesto perdido en iOS)
 * caen al fallback de descarga para que el usuario no se quede sin el fichero.
 */
export async function entregarFichero(
	nombre: string,
	contenido: string | Blob,
	mime: string
): Promise<void> {
	const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: mime });

	if (typeof navigator !== 'undefined' && navigator.canShare && navigator.share) {
		const file = new File([blob], nombre, { type: mime });
		if (navigator.canShare({ files: [file] })) {
			try {
				await navigator.share({ files: [file] });
				return;
			} catch (e) {
				// Usuario canceló: no descargamos por detrás. Cualquier otro error
				// (gesto perdido, no soportado en runtime…) cae al fallback.
				if (e instanceof DOMException && e.name === 'AbortError') return;
			}
		}
	}

	descargarPorEnlace(nombre, blob);
}

function descargarPorEnlace(nombre: string, blob: Blob): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = nombre;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
