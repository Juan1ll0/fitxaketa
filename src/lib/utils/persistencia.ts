/**
 * Solicita almacenamiento **persistente** al navegador para que NO evacúe la caché del
 * service worker (el shell de la PWA) ni el IndexedDB (datos de jornadas/settings) por
 * inactividad. Sin esta marca, iOS borra el almacenamiento «script-writable» tras ~7
 * días sin abrir la app y Android lo purga bajo presión de espacio: la PWA deja de
 * arrancar offline y, peor aún, se pierden los datos guardados.
 *
 * En una PWA instalada (añadida a la pantalla de inicio) los navegadores suelen
 * concederlo sin mostrar prompt. Es idempotente: si el almacenamiento ya es persistente
 * no vuelve a solicitarlo. No lanza: ante cualquier fallo o navegador sin la API
 * (`StorageManager`), devuelve `false` y la app sigue funcionando igual.
 */
export async function asegurarPersistencia(): Promise<boolean> {
	try {
		if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
		if (await navigator.storage.persisted()) return true;
		return await navigator.storage.persist();
	} catch {
		return false;
	}
}
