/**
 * Tests para /estadisticas (+page.svelte)
 *
 * Mock del store global app-state:
 *   subscribe, getJornadas, cargarJornadas
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import type { Jornada } from '$lib/db';
import EstadisticasPage from '../../routes/estadisticas/+page.svelte';

// ─── Mocks del store app-state ───────────────────────────────────────────────

const mocks = vi.hoisted(() => {
	const mockSubscribe = vi.fn();
	const mockGetJornadas = vi.fn<() => Jornada[]>().mockReturnValue([] as Jornada[]);
	const mockCargarJornadas = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

	return {
		mockSubscribe,
		mockGetJornadas,
		mockCargarJornadas
	};
});

vi.mock('$lib/stores/app-state', () => ({
	subscribe: mocks.mockSubscribe,
	getJornadas: mocks.mockGetJornadas,
	cargarJornadas: mocks.mockCargarJornadas
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Factory de jornada cerrada. */
function jornadaCerrada(id: number, startTime: Date, durationMinutes: number): Jornada {
	return {
		id,
		start_time: startTime,
		end_time: new Date(startTime.getTime() + durationMinutes * 60_000),
		lat_start: null,
		lng_start: null,
		lat_end: null,
		lng_end: null,
		duration: durationMinutes,
		status: 'closed',
		synced: 1
	};
}

/** Configura subscribe para invocar el callback inmediatamente. */
function subscribeConCallbackInmediato(): void {
	mocks.mockSubscribe.mockImplementation((callback: () => void) => {
		callback();
		return vi.fn();
	});
}

describe('estadisticas/+page.svelte', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.mockGetJornadas.mockReturnValue([]);
		mocks.mockCargarJornadas.mockResolvedValue(undefined);
		mocks.mockSubscribe.mockReturnValue(vi.fn());
	});

	afterEach(() => {
		cleanup();
	});

	// ─── Selector de periodo ───────────────────────────────────────────────

	describe('selector de periodo con 3 botones (Semana/Mes/Año)', () => {
		it('renderiza los 3 botones de periodo', async () => {
			subscribeConCallbackInmediato();
			render(EstadisticasPage);

			await waitFor(() => {
				const botones = screen.getAllByRole('button');
				expect(botones).toHaveLength(3);
				expect(screen.getByText('Semana')).toBeInTheDocument();
				expect(screen.getByText('Mes')).toBeInTheDocument();
				expect(screen.getByText('Año')).toBeInTheDocument();
			});
		});
	});

	describe('"Mes" está seleccionado por defecto', () => {
		it('el botón Mes tiene el estilo de activo (bg-primary)', async () => {
			subscribeConCallbackInmediato();
			render(EstadisticasPage);

			await waitFor(() => {
				const mesBtn = screen.getByText('Mes');
				expect(mesBtn).toHaveClass('bg-primary');
			});
		});

		it('los otros botones no tienen bg-primary', async () => {
			subscribeConCallbackInmediato();
			render(EstadisticasPage);

			await waitFor(() => {
				const semanaBtn = screen.getByText('Semana');
				const anoBtn = screen.getByText('Año');
				expect(semanaBtn).not.toHaveClass('bg-primary');
				expect(anoBtn).not.toHaveClass('bg-primary');
			});
		});
	});

	// ─── Cambio de periodo ─────────────────────────────────────────────────

	describe('cambiar periodo actualiza el estilo activo', () => {
		it('al hacer clic en "Semana" se activa con bg-primary', async () => {
			subscribeConCallbackInmediato();
			render(EstadisticasPage);

			await waitFor(() => {
				expect(screen.getByText('Semana')).toBeInTheDocument();
			});

			const semanaBtn = screen.getByText('Semana');
			await fireEvent.click(semanaBtn);

			await waitFor(() => {
				expect(semanaBtn).toHaveClass('bg-primary');
			});
		});

		it('al hacer clic en "Año" se activa con bg-primary', async () => {
			subscribeConCallbackInmediato();
			render(EstadisticasPage);

			await waitFor(() => {
				expect(screen.getByText('Año')).toBeInTheDocument();
			});

			const anoBtn = screen.getByText('Año');
			await fireEvent.click(anoBtn);

			await waitFor(() => {
				expect(anoBtn).toHaveClass('bg-primary');
			});
		});
	});

	// ─── Estado vacío / con datos ──────────────────────────────────────────

	describe('muestra gráfica si hay datos, mensaje "No hay datos" si no', () => {
		it('muestra mensaje "No hay datos para este periodo" cuando no hay jornadas', async () => {
			subscribeConCallbackInmediato();
			mocks.mockGetJornadas.mockReturnValue([]);

			render(EstadisticasPage);

			await waitFor(() => {
				expect(screen.getByText('No hay datos para este periodo')).toBeInTheDocument();
			});
		});

		it('muestra la gráfica (canvas) cuando hay jornadas filtradas', async () => {
			subscribeConCallbackInmediato();
			const hace5dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
			mocks.mockGetJornadas.mockReturnValue([jornadaCerrada(1, hace5dias, 480)]);

			render(EstadisticasPage);

			await waitFor(() => {
				expect(document.querySelector('canvas')).toBeInTheDocument();
			});
		});

		it('no muestra mensaje de "No hay datos" cuando hay jornadas', async () => {
			subscribeConCallbackInmediato();
			const hace5dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
			mocks.mockGetJornadas.mockReturnValue([jornadaCerrada(1, hace5dias, 480)]);

			render(EstadisticasPage);

			await waitFor(() => {
				expect(screen.queryByText('No hay datos para este periodo')).not.toBeInTheDocument();
			});
		});
	});

	// ─── Resumen ───────────────────────────────────────────────────────────

	describe('resumen se actualiza con jornadas filtradas', () => {
		it('muestra el resumen con 4 tarjetas cuando hay datos', async () => {
			subscribeConCallbackInmediato();
			const hace5dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
			mocks.mockGetJornadas.mockReturnValue([jornadaCerrada(1, hace5dias, 480)]);

			render(EstadisticasPage);

			await waitFor(() => {
				expect(screen.getByText('Total horas')).toBeInTheDocument();
				expect(screen.getByText('Media diaria')).toBeInTheDocument();
				expect(screen.getByText('Días trabajados')).toBeInTheDocument();
				expect(screen.getByText('Jornadas')).toBeInTheDocument();
			});
		});

		it('no muestra el resumen cuando no hay datos', async () => {
			subscribeConCallbackInmediato();
			mocks.mockGetJornadas.mockReturnValue([]);

			render(EstadisticasPage);

			await waitFor(() => {
				expect(screen.queryByText('Total horas')).not.toBeInTheDocument();
			});
		});
	});

	// ─── Store subscription ────────────────────────────────────────────────

	describe('suscripción al store', () => {
		it('llama a subscribe al montar', async () => {
			subscribeConCallbackInmediato();
			render(EstadisticasPage);

			await waitFor(() => {
				expect(mocks.mockSubscribe).toHaveBeenCalled();
			});
		});

		// NOTA: afterNavigate no se dispara en tests de componente unitario
		// porque requiere navegación real entre rutas. Esta funcionalidad
		// está cubierta por tests E2E.
	});
});
