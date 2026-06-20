import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db, type Jornada } from '$lib/db';
import {
	initAppState,
	startJornada,
	stopJornada,
	subscribe,
	getClockedIn,
	getElapsed
} from '$lib/stores/app-state';

describe('app-state store', () => {
	// Limpiar estado del store entre tests
	// El store usa variables de módulo, necesitamos resetearlas
	beforeEach(async () => {
		await db.delete();
		await db.open();
		// Inicializar estado limpio
		await initAppState();
	});

	afterEach(() => {
		// Limpiar listeners
	});

	describe('initAppState()', () => {
		// AC-03: initAppState() carga el estado desde IndexedDB al iniciar la app

		it('debería inicializar con estado no activo si no hay jornada abierta', async () => {
			await initAppState();

			expect(getClockedIn()).toBe(false);
			expect(getElapsed()).toBe('00:00:00');
		});

		it('debería restaurar jornada activa desde IndexedDB al iniciar', async () => {
			// Crear una jornada abierta directamente en BD
			const jornada: Jornada = {
				start_time: new Date(Date.now() - 30 * 60 * 1000), // hace 30 min
				end_time: null,
				lat_start: null,
				lng_start: null,
				lat_end: null,
				lng_end: null,
				duration: null,
				status: 'open',
				synced: 0
			};
			await db.jornadas.add(jornada);

			// Reinicializar el estado
			await initAppState();

			expect(getClockedIn()).toBe(true);
			// El cronómetro debe estar corriendo (diferente de 00:00:00)
			expect(getElapsed()).not.toBe('00:00:00');
		});

		it('debería notificar a los suscriptores tras inicializar', async () => {
			const listener = vi.fn();
			subscribe(listener);

			await initAppState();

			expect(listener).toHaveBeenCalled();
		});
	});

	describe('startJornada()', () => {
		// AC-04: startJornada() crea una nueva jornada en la BD y actualiza el estado

		it('debería crear jornada en la BD al iniciar', async () => {
			await startJornada();

			const openJornada = await db.jornadas.where('status').equals('open').first();
			expect(openJornada).toBeDefined();
			expect(openJornada?.start_time).toBeInstanceOf(Date);
		});

		it('debería actualizar el estado a activo tras iniciar jornada', async () => {
			await startJornada();

			expect(getClockedIn()).toBe(true);
		});

		it('debería guardar coordenadas de inicio si se proporcionan', async () => {
			const coords = { lat: 43.123, lng: -2.456 };
			await startJornada(coords);

			const openJornada = await db.jornadas.where('status').equals('open').first();
			expect(openJornada?.lat_start).toBe(43.123);
			expect(openJornada?.lng_start).toBe(-2.456);
		});

		it('debería iniciar el cronómetro al crear jornada', async () => {
			await startJornada();

			// Esperar un poco para que el cronómetro avance
			await new Promise((resolve) => setTimeout(resolve, 1100));

			expect(getElapsed()).not.toBe('00:00:00');
		});

		it('debería notificar a los suscriptores al iniciar', async () => {
			const listener = vi.fn();
			subscribe(listener);

			await startJornada();

			expect(listener).toHaveBeenCalled();
		});

		it('debería aceptar coords opcionales con lat/lng null', async () => {
			await startJornada({ lat: null, lng: null });

			const openJornada = await db.jornadas.where('status').equals('open').first();
			expect(openJornada?.lat_start).toBeNull();
			expect(openJornada?.lng_start).toBeNull();
		});
	});

	describe('stopJornada()', () => {
		// AC-05: stopJornada() cierra la jornada activa en la BD y actualiza el estado

		it('debería cerrar la jornada abierta en la BD', async () => {
			await startJornada();
			const openBefore = await db.jornadas.where('status').equals('open').first();
			const jornadaId = openBefore!.id!;

			await stopJornada();

			const closedJornada = await db.jornadas.get(jornadaId);
			expect(closedJornada?.status).toBe('closed');
			expect(closedJornada?.end_time).toBeInstanceOf(Date);
			expect(closedJornada?.duration).toBeGreaterThanOrEqual(0);
		});

		it('debería actualizar el estado a no activo tras cerrar', async () => {
			await startJornada();
			await stopJornada();

			expect(getClockedIn()).toBe(false);
		});

		it('debería resetear el cronómetro a 00:00:00', async () => {
			await startJornada();
			await new Promise((resolve) => setTimeout(resolve, 100));
			await stopJornada();

			expect(getElapsed()).toBe('00:00:00');
		});

		it('debería guardar coordenadas de fin si se proporcionan', async () => {
			await startJornada();
			const coords = { lat: 43.789, lng: -3.012 };

			await stopJornada(coords);

			const closed = await db.jornadas.where('status').equals('closed').first();
			expect(closed?.lat_end).toBe(43.789);
			expect(closed?.lng_end).toBe(-3.012);
		});

		it('debería marcar la jornada como no sincronizada al cerrar', async () => {
			await startJornada();

			await stopJornada();

			const closed = await db.jornadas.where('status').equals('closed').first();
			expect(closed?.synced).toBe(0);
		});

		it('no debería hacer nada si no hay jornada activa', async () => {
			// No hay jornada abierta, stopJornada no debería fallar
			await expect(stopJornada()).resolves.not.toThrow();

			expect(getClockedIn()).toBe(false);
		});

		it('debería notificar a los suscriptores al cerrar', async () => {
			await startJornada();
			const listener = vi.fn();
			subscribe(listener);

			await stopJornada();

			expect(listener).toHaveBeenCalled();
		});
	});

	describe('persistencia entre navegaciones/recargas', () => {
		// AC-05 (parte): El estado persiste entre navegaciones y recargas

		it('debería mantener estado tras simular recarga (reinicializar)', async () => {
			// Simular primera visita: crear jornada
			await startJornada();
			expect(getClockedIn()).toBe(true);

			// Esperar un poco para que el cronómetro avance
			await new Promise((resolve) => setTimeout(resolve, 1100));

			// Simular recarga/navegación: re-inicializar
			await initAppState();

			// El estado debería restaurarse y el cronómetro seguir corriendo
			expect(getClockedIn()).toBe(true);
			// El elapsed debería ser mayor que 00:00:00 (el cronómetro sigue)
			const elapsedAfterReload = getElapsed();
			expect(elapsedAfterReload).not.toBe('00:00:00');
		});

		it('debería mantener jornada cerrada tras recarga', async () => {
			// Crear y cerrar jornada
			await startJornada();
			await stopJornada();

			// Simular recarga
			await initAppState();

			// No debe haber jornada activa
			expect(getClockedIn()).toBe(false);
			expect(getElapsed()).toBe('00:00:00');
		});

		it('debería recuperar correctamente jornada activa creada en sesión anterior', async () => {
			// Crear jornada abierta sin usar el store (simulando sesión anterior)
			const jornada: Jornada = {
				start_time: new Date(Date.now() - 45 * 60 * 1000),
				end_time: null,
				lat_start: 40.123,
				lng_start: -3.456,
				lat_end: null,
				lng_end: null,
				duration: null,
				status: 'open',
				synced: 0
			};
			await db.jornadas.add(jornada);

			// Inicializar store (como al cargar la app)
			await initAppState();

			expect(getClockedIn()).toBe(true);
		});
	});

	describe('estado reactivo del store', () => {
		// AC-05 (parte): El store expone el estado reactivo de la jornada activa y el cronómetro

		it('debería exponer getClockedIn() con el estado actual', () => {
			expect(typeof getClockedIn()).toBe('boolean');
		});

		it('debería exponer getElapsed() con el formato HH:MM:SS', () => {
			const elapsed = getElapsed();
			expect(elapsed).toMatch(/^\d{2}:\d{2}:\d{2}$/);
		});

		it('debería notificar a los suscriptores en cada tick del cronómetro', async () => {
			const listener = vi.fn();
			subscribe(listener);

			await startJornada();

			const callsBefore = listener.mock.calls.length;
			await new Promise((resolve) => setTimeout(resolve, 2100));

			expect(listener.mock.calls.length).toBeGreaterThan(callsBefore);
		});

		it('debería permitir desuscribirse correctamente', async () => {
			const listener = vi.fn();
			const unsubscribe = subscribe(listener);

			await startJornada();
			unsubscribe();

			const callsAfterUnsubscribe = listener.mock.calls.length;
			await new Promise((resolve) => setTimeout(resolve, 1100));

			// El listener no debería haber sido llamado después de desuscribirse
			expect(listener.mock.calls.length).toBe(callsAfterUnsubscribe);
		});

		it('debería permitir múltiples suscriptores simultáneos', async () => {
			const listener1 = vi.fn();
			const listener2 = vi.fn();

			subscribe(listener1);
			subscribe(listener2);

			await startJornada();

			expect(listener1).toHaveBeenCalled();
			expect(listener2).toHaveBeenCalled();
		});
	});

	describe('getClockedIn() y getElapsed()', () => {
		it('getClockedIn() debería retourner false inicialmente tras initAppState sin jornada', async () => {
			await initAppState();
			expect(getClockedIn()).toBe(false);
		});

		it('getElapsed() debería retourner 00:00:00 sin jornada activa', async () => {
			await initAppState();
			expect(getElapsed()).toBe('00:00:00');
		});

		it('getElapsed() debería actualizar cada segundo con jornada activa', async () => {
			await startJornada();

			// Esperar 2.1 segundos
			await new Promise((resolve) => setTimeout(resolve, 2100));

			const elapsed = getElapsed();
			const [h, m, s] = elapsed.split(':').map(Number);

			// Debería ser al menos 2 segundos
			expect(h * 3600 + m * 60 + s).toBeGreaterThanOrEqual(2);
		});
	});
});
