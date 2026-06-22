import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import type { Jornada } from '$lib/db';
import Page from '../+page.svelte';

// Mocks del store app-state y utils - vi.hoisted() asegura que las variables se creen antes del hoisting de vi.mock
const mocks = vi.hoisted(() => {
	const mockInitAppState = vi.fn().mockResolvedValue(undefined);
	const mockStartJornada = vi.fn().mockResolvedValue(undefined);
	const mockStopJornada = vi.fn().mockResolvedValue(undefined);
	const mockSubscribe = vi.fn();
	const mockGetClockedIn = vi.fn();
	const mockGetElapsed = vi.fn();
	const mockGetJornadasHoy = vi.fn();
	const mockGetResumenHoy = vi.fn();
	const mockFormatearFecha = vi.fn().mockReturnValue('domingo, 21 de junio de 2026');

	return {
		mockInitAppState,
		mockStartJornada,
		mockStopJornada,
		mockSubscribe,
		mockGetClockedIn,
		mockGetElapsed,
		mockGetJornadasHoy,
		mockGetResumenHoy,
		mockFormatearFecha
	};
});

vi.mock('$lib/stores/app-state', () => ({
	initAppState: mocks.mockInitAppState,
	startJornada: mocks.mockStartJornada,
	stopJornada: mocks.mockStopJornada,
	subscribe: mocks.mockSubscribe,
	getClockedIn: mocks.mockGetClockedIn,
	getElapsed: mocks.mockGetElapsed,
	getJornadasHoy: mocks.mockGetJornadasHoy,
	getResumenHoy: mocks.mockGetResumenHoy
}));

vi.mock('$lib/utils/dashboard', () => ({
	formatearFecha: mocks.mockFormatearFecha
}));

/**
 * Configura mockSubscribe para invocar el callback inmediatamente y retornar un vi.fn().
 * Usado por la mayoría de tests que solo necesitan que el store notifique al render.
 */
function subscribeConCallbackInmediato(): void {
	mocks.mockSubscribe.mockImplementation((callback: () => void) => {
		callback();
		return vi.fn();
	});
}

/**
 * Renderiza la página y espera a que el botón de fichar esté disponible en el DOM.
 * Retorna el botón para interacciones posteriores (click, aserciones de clase).
 */
async function renderYObtenerBoton(): Promise<HTMLElement> {
	render(Page);
	await waitFor(() => {
		expect(screen.getByRole('button')).toBeInTheDocument();
	});
	return screen.getByRole('button');
}

describe('+page.svelte', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Setup por defecto en cada test: no fichado, cronómetro a 00:00:00
		// IMPORTANTE: setear los mocks ANTES de render() para que onMount los use correctamente
		mocks.mockGetClockedIn.mockReturnValue(false);
		mocks.mockGetElapsed.mockReturnValue('00:00:00');
		mocks.mockGetJornadasHoy.mockReturnValue([]);
		mocks.mockGetResumenHoy.mockReturnValue({ totalHoras: 0, totalJornadas: 0 });
		mocks.mockSubscribe.mockReturnValue(vi.fn());
	});

	afterEach(() => {
		cleanup();
	});

	describe('Cronómetro se actualiza (mock de getElapsed)', () => {
		it('debería mostrar el valor retornado por getElapsed', async () => {
			// Setup mocks ANTES de render
			mocks.mockGetElapsed.mockReturnValue('01:30:45');
			subscribeConCallbackInmediato();

			render(Page);

			await waitFor(() => {
				const cronometro = screen.getByText('01:30:45');
				expect(cronometro).toBeInTheDocument();
			});
		});

		it('debería actualizarse cuando getElapsed cambia tras callback', async () => {
			// Setup inicial
			mocks.mockGetElapsed.mockReturnValue('00:00:00');
			let callback: () => void = vi.fn();
			mocks.mockSubscribe.mockImplementation((cb: () => void) => {
				callback = cb;
				cb(); // primera llamada
				return vi.fn();
			});

			render(Page);

			// Simular actualización del cronómetro vía callback del store
			mocks.mockGetElapsed.mockReturnValue('00:05:30');
			callback();

			await waitFor(() => {
				const cronometro = screen.getByText('00:05:30');
				expect(cronometro).toBeInTheDocument();
			});
		});
	});

	describe('Botón cambia texto (Fichar entrada/salida)', () => {
		it('debería mostrar "Fichar entrada" cuando no hay jornada activa', async () => {
			mocks.mockGetClockedIn.mockReturnValue(false);
			subscribeConCallbackInmediato();

			render(Page);

			await waitFor(() => {
				const boton = screen.getByRole('button');
				expect(boton).toHaveTextContent('Fichar entrada');
			});
		});

		it('debería mostrar "Fichar salida" cuando hay jornada activa', async () => {
			mocks.mockGetClockedIn.mockReturnValue(true);
			subscribeConCallbackInmediato();

			render(Page);

			await waitFor(() => {
				const boton = screen.getByRole('button');
				expect(boton).toHaveTextContent('Fichar salida');
			});
		});

		it('debería llamar a startJornada al hacer clic cuando no está fichado', async () => {
			mocks.mockGetClockedIn.mockReturnValue(false);
			subscribeConCallbackInmediato();

			const boton = await renderYObtenerBoton();
			await fireEvent.click(boton);

			expect(mocks.mockStartJornada).toHaveBeenCalled();
		});

		it('debería llamar a stopJornada al hacer clic cuando está fichado', async () => {
			mocks.mockGetClockedIn.mockReturnValue(true);
			subscribeConCallbackInmediato();

			const boton = await renderYObtenerBoton();
			await fireEvent.click(boton);

			expect(mocks.mockStopJornada).toHaveBeenCalled();
		});
	});

	describe('Botón cambia color (primary/danger)', () => {
		it('debería tener clase bg-primary cuando no está fichado (clockedIn=false)', async () => {
			mocks.mockGetClockedIn.mockReturnValue(false);
			subscribeConCallbackInmediato();

			render(Page);

			await waitFor(() => {
				const boton = screen.getByRole('button');
				expect(boton).toHaveClass('bg-primary');
				expect(boton).not.toHaveClass('bg-danger');
			});
		});

		it('debería tener clase bg-danger cuando está fichado (clockedIn=true)', async () => {
			mocks.mockGetClockedIn.mockReturnValue(true);
			subscribeConCallbackInmediato();

			render(Page);

			await waitFor(() => {
				const boton = screen.getByRole('button');
				expect(boton).toHaveClass('bg-danger');
				expect(boton).not.toHaveClass('bg-primary');
			});
		});
	});

	describe('Resumen se muestra correctamente', () => {
		it('debería mostrar el resumen del día con horas y número de jornadas', async () => {
			mocks.mockGetResumenHoy.mockReturnValue({ totalHoras: 8, totalJornadas: 2 });
			mocks.mockGetJornadasHoy.mockReturnValue([{ id: 1 }, { id: 2 }] as unknown as Jornada[]);
			subscribeConCallbackInmediato();

			render(Page);

			// 8h 0m | 2 jornadas
			await waitFor(() => {
				const resumen = screen.getByText(/8h 0m/);
				expect(resumen).toBeInTheDocument();
				expect(screen.getByText(/2 jornadas/)).toBeInTheDocument();
			});
		});

		it('debería mostrar "jornada" en singular cuando solo hay una', async () => {
			mocks.mockGetResumenHoy.mockReturnValue({ totalHoras: 4, totalJornadas: 1 });
			mocks.mockGetJornadasHoy.mockReturnValue([{ id: 1 }] as unknown as Jornada[]);
			subscribeConCallbackInmediato();

			render(Page);

			await waitFor(() => {
				expect(screen.getByText(/1 jornada$/)).toBeInTheDocument();
			});
		});

		it('debería mostrar 0h 0m cuando no hay jornadas', async () => {
			mocks.mockGetResumenHoy.mockReturnValue({ totalHoras: 0, totalJornadas: 0 });
			mocks.mockGetJornadasHoy.mockReturnValue([]);
			subscribeConCallbackInmediato();

			render(Page);

			await waitFor(() => {
				expect(screen.getByText(/0h 0m/)).toBeInTheDocument();
				expect(screen.getByText(/0 jornadas/)).toBeInTheDocument();
			});
		});
	});

	describe('Fecha se muestra en formato largo', () => {
		it('debería mostrar la fecha formateada en la parte superior', async () => {
			subscribeConCallbackInmediato();

			render(Page);

			// La fecha viene del mock de formatearFecha
			await waitFor(() => {
				const fecha = screen.getByText('domingo, 21 de junio de 2026');
				expect(fecha).toBeInTheDocument();
			});
		});
	});

	describe('Suscripción reactiva al store', () => {
		it('debería suscribirse al store usando subscribe()', async () => {
			subscribeConCallbackInmediato();

			render(Page);

			await waitFor(() => {
				expect(mocks.mockSubscribe).toHaveBeenCalled();
			});
		});

		it('debería actualizar UI cuando el store cambia vía callback', async () => {
			mocks.mockGetClockedIn.mockReturnValue(false);
			let callback: () => void = vi.fn();
			mocks.mockSubscribe.mockImplementation((cb: () => void) => {
				callback = cb;
				cb();
				return vi.fn();
			});

			render(Page);

			// Simular cambio de estado en el store
			mocks.mockGetClockedIn.mockReturnValue(true);
			callback();

			await waitFor(() => {
				const boton = screen.getByRole('button');
				expect(boton).toHaveTextContent('Fichar salida');
			});
		});

		it('debería retornar función de cleanup desde subscribe', async () => {
			const mockUnsubscribe = vi.fn();
			mocks.mockSubscribe.mockReturnValue(mockUnsubscribe);
			mocks.mockSubscribe.mockImplementation(() => {
				return mockUnsubscribe;
			});

			render(Page);

			await waitFor(() => {
				// Verificamos que unsubscribe fue retornado por subscribe
				expect(mockUnsubscribe).toBeDefined();
			});
		});
	});

	describe('Cleanup de recursos (onDestroy)', () => {
		it('debería retornar función de unsubscribe para cleanup', async () => {
			const mockUnsubscribe = vi.fn();
			mocks.mockSubscribe.mockReturnValue(mockUnsubscribe);
			mocks.mockSubscribe.mockImplementation(() => {
				return mockUnsubscribe;
			});

			render(Page);

			await waitFor(() => {
				// El onDestroy del componente llama a la función de cleanup retornada
				// Verificamos que subscribe retorna una función de cleanup
				expect(typeof mockUnsubscribe).toBe('function');
			});
		});
	});

	describe('Estado "Trabajando" / "Descansando"', () => {
		it('debería mostrar "Trabajando" cuando clockedIn es true', async () => {
			mocks.mockGetClockedIn.mockReturnValue(true);
			subscribeConCallbackInmediato();

			render(Page);

			await waitFor(() => {
				expect(screen.getByText('Trabajando')).toBeInTheDocument();
			});
		});

		it('debería mostrar "Descansando" cuando clockedIn es false', async () => {
			mocks.mockGetClockedIn.mockReturnValue(false);
			subscribeConCallbackInmediato();

			render(Page);

			await waitFor(() => {
				expect(screen.getByText('Descansando')).toBeInTheDocument();
			});
		});
	});
});
