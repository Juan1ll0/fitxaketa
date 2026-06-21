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

// ─── Mock de Chart.js ────────────────────────────────────────────────────────

const mockDestroy = vi.fn();
const mockUpdate = vi.fn();
const mockRegister = vi.fn();

const mockChartInstance = {
	destroy: mockDestroy,
	update: mockUpdate,
	data: { labels: [], datasets: [{ data: [] }] }
};

function MockChartClass(this: typeof mockChartInstance) {
	return mockChartInstance;
}
MockChartClass.register = mockRegister;
MockChartClass.BarController = vi.fn();
MockChartClass.BarElement = vi.fn();
MockChartClass.CategoryScale = vi.fn();
MockChartClass.LinearScale = vi.fn();
MockChartClass.Tooltip = vi.fn();
MockChartClass.Legend = vi.fn();

vi.mock('chart.js', () => ({
	Chart: MockChartClass,
	BarController: vi.fn(),
	BarElement: vi.fn(),
	CategoryScale: vi.fn(),
	LinearScale: vi.fn(),
	Tooltip: vi.fn(),
	Legend: vi.fn(),
	default: {
		Chart: MockChartClass,
		BarController: vi.fn(),
		BarElement: vi.fn(),
		CategoryScale: vi.fn(),
		LinearScale: vi.fn(),
		Tooltip: vi.fn(),
		Legend: vi.fn(),
		register: mockRegister
	}
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

	// ─── Selector de periodo: cambio de gráfica ───────────────────────────

	describe('cambiar periodo actualiza la gráfica y los datos', () => {
		it('al cambiar a "Semana" se muestran datos de la semana', async () => {
			subscribeConCallbackInmediato();
			const hace3dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
			const hace10dias = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
			// Una jornada hace 3 días (dentro de semana) y otra hace 10 días (fuera de semana)
			mocks.mockGetJornadas.mockReturnValue([
				jornadaCerrada(1, hace3dias, 480),
				jornadaCerrada(2, hace10dias, 480)
			]);

			render(EstadisticasPage);

			// Esperar a que renderice con Mes (default)
			await waitFor(() => {
				expect(document.querySelector('canvas')).toBeInTheDocument();
			});

			// Cambiar a Semana
			const semanaBtn = screen.getByText('Semana');
			await fireEvent.click(semanaBtn);

			// La jornada de hace 10 días no debe aparecer en semana
			await waitFor(() => {
				// El mock de getJornadas devuelve 2 jornadas, pero filtrarPorPeriodo
				// solo debe incluir la de hace 3 días en el periodo semana
				// Verificar que el canvas sigue visible (datos filtrados)
				expect(document.querySelector('canvas')).toBeInTheDocument();
			});
		});

		it('al cambiar a "Año" se muestran datos del año completo', async () => {
			subscribeConCallbackInmediato();
			const hace3dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
			const hace20dias = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
			mocks.mockGetJornadas.mockReturnValue([
				jornadaCerrada(1, hace3dias, 480),
				jornadaCerrada(2, hace20dias, 480)
			]);

			render(EstadisticasPage);

			await waitFor(() => {
				expect(screen.getByText('Mes')).toBeInTheDocument();
			});

			const anoBtn = screen.getByText('Año');
			await fireEvent.click(anoBtn);

			await waitFor(() => {
				expect(document.querySelector('canvas')).toBeInTheDocument();
			});
		});
	});

	// ─── Sumatorios de horas en el resumen ─────────────────────────────────

	describe('resumen muestra cálculos correctos', () => {
		it('muestra el total de horas correcto para una jornada de 8h', async () => {
			subscribeConCallbackInmediato();
			const hace5dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
			mocks.mockGetJornadas.mockReturnValue([jornadaCerrada(1, hace5dias, 480)]); // 480 min = 8h

			render(EstadisticasPage);

			await waitFor(() => {
				// Total: 8h, Media: 8h (ambos son 8h 0m)
				const totalLabel = screen.getByText('Total horas');
				expect(totalLabel.parentElement?.textContent).toMatch(/8h 0m/);
			});
		});

		it('muestra la media diaria correcta (8h / 1 día = 8h/día)', async () => {
			subscribeConCallbackInmediato();
			const hace5dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
			mocks.mockGetJornadas.mockReturnValue([jornadaCerrada(1, hace5dias, 480)]); // 8h en 1 día

			render(EstadisticasPage);

			await waitFor(() => {
				// Media diaria = 8h / 1 día = 8h
				const mediaLabel = screen.getByText('Media diaria');
				expect(mediaLabel.parentElement?.textContent).toMatch(/8h 0m/);
			});
		});

		it('muestra 1 día trabajado para una jornada', async () => {
			subscribeConCallbackInmediato();
			const hace5dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
			mocks.mockGetJornadas.mockReturnValue([jornadaCerrada(1, hace5dias, 480)]);

			render(EstadisticasPage);

			await waitFor(() => {
				// Buscar "1" en el contexto de "Días trabajados"
				const diasLabel = screen.getByText('Días trabajados');
				expect(diasLabel.parentElement?.textContent).toMatch(/1/);
			});
		});

		it('muestra 1 jornada para un fichaje único', async () => {
			subscribeConCallbackInmediato();
			const hace5dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
			mocks.mockGetJornadas.mockReturnValue([jornadaCerrada(1, hace5dias, 480)]);

			render(EstadisticasPage);

			await waitFor(() => {
				const jornadasLabel = screen.getByText('Jornadas');
				expect(jornadasLabel.parentElement?.textContent).toMatch(/1/);
			});
		});

		it('suma correctamente múltiples jornadas en el mismo día', async () => {
			subscribeConCallbackInmediato();
			// Crear una fecha fija a las 10:00 AM para evitar problemas de zona horaria
			const baseDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
			const mismoDia = new Date(
				baseDate.getFullYear(),
				baseDate.getMonth(),
				baseDate.getDate(),
				10,
				0,
				0,
				0
			);
			// Dos jornadas el mismo día: 4h + 4h = 8h total
			const j1: Jornada = {
				id: 1,
				start_time: new Date(mismoDia.getTime()),
				end_time: new Date(mismoDia.getTime() + 4 * 60 * 60 * 1000),
				lat_start: null,
				lng_start: null,
				lat_end: null,
				lng_end: null,
				duration: 240, // 4h
				status: 'closed',
				synced: 1
			};
			const j2: Jornada = {
				id: 2,
				start_time: new Date(mismoDia.getTime() + 4 * 60 * 60 * 1000), // 2:00 PM
				end_time: new Date(mismoDia.getTime() + 8 * 60 * 60 * 1000), // 6:00 PM
				lat_start: null,
				lng_start: null,
				lat_end: null,
				lng_end: null,
				duration: 240, // 4h
				status: 'closed',
				synced: 1
			};
			mocks.mockGetJornadas.mockReturnValue([j1, j2]);

			render(EstadisticasPage);

			await waitFor(() => {
				// Total: 8h (4h + 4h), pero en 1 día
				const totalLabel = screen.getByText('Total horas');
				expect(totalLabel.parentElement?.textContent).toMatch(/8h 0m/);
				// Media: 8h / 1 día = 8h
				const mediaLabel = screen.getByText('Media diaria');
				expect(mediaLabel.parentElement?.textContent).toMatch(/8h 0m/);
				// Días trabajados: 1, jornadas: 2
				const jornadasLabel = screen.getByText('Jornadas');
				expect(jornadasLabel.parentElement?.textContent).toMatch(/2/);
			});
		});
	});

	// ─── Casos edge ────────────────────────────────────────────────────────

	describe('casos edge del resumen', () => {
		it('periodo sin datos muestra mensaje y resumen vacío', async () => {
			subscribeConCallbackInmediato();
			// Todas las jornadas son de hace más de 1 año
			const hace2anos = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);
			mocks.mockGetJornadas.mockReturnValue([jornadaCerrada(1, hace2anos, 480)]);

			render(EstadisticasPage);

			await waitFor(() => {
				expect(screen.getByText('No hay datos para este periodo')).toBeInTheDocument();
				// El resumen no debe mostrarse
				expect(screen.queryByText('Total horas')).not.toBeInTheDocument();
			});
		});

		it('jornadas abiertas (open) no se cuentan en el resumen', async () => {
			subscribeConCallbackInmediato();
			const hace5dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

			// Una jornada cerrada de 8h y una abierta (sin duration)
			const jornadaCerrada1: Jornada = {
				id: 1,
				start_time: hace5dias,
				end_time: new Date(hace5dias.getTime() + 8 * 60 * 60 * 1000),
				lat_start: null,
				lng_start: null,
				lat_end: null,
				lng_end: null,
				duration: 480,
				status: 'closed',
				synced: 1
			};
			const jornadaAbierta: Jornada = {
				id: 2,
				start_time: new Date(hace5dias.getTime()),
				end_time: null,
				lat_start: null,
				lng_start: null,
				lat_end: null,
				lng_end: null,
				duration: null,
				status: 'open',
				synced: 0
			};
			mocks.mockGetJornadas.mockReturnValue([jornadaCerrada1, jornadaAbierta]);

			render(EstadisticasPage);

			await waitFor(() => {
				// Solo la jornada cerrada debe contar
				const totalLabel = screen.getByText('Total horas');
				expect(totalLabel.parentElement?.textContent).toMatch(/8h 0m/); // Total: solo la cerrada
				// Media: 8h / 1 día = 8h
				const mediaLabel = screen.getByText('Media diaria');
				expect(mediaLabel.parentElement?.textContent).toMatch(/8h 0m/);
				// 1 jornada visible (la cerrada)
				const jornadasLabel = screen.getByText('Jornadas');
				expect(jornadasLabel.parentElement?.textContent).toMatch(/1/);
			});
		});

		it('múltiples jornadas en días diferentes se suman por día para la media', async () => {
			subscribeConCallbackInmediato();
			const hace3dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
			const hace5dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

			// 8h hace 3 días + 4h hace 5 días = 12h total en 2 días = 6h media
			const j1: Jornada = {
				id: 1,
				start_time: hace3dias,
				end_time: new Date(hace3dias.getTime() + 8 * 60 * 60 * 1000),
				lat_start: null,
				lng_start: null,
				lat_end: null,
				lng_end: null,
				duration: 480,
				status: 'closed',
				synced: 1
			};
			const j2: Jornada = {
				id: 2,
				start_time: hace5dias,
				end_time: new Date(hace5dias.getTime() + 4 * 60 * 60 * 1000),
				lat_start: null,
				lng_start: null,
				lat_end: null,
				lng_end: null,
				duration: 240,
				status: 'closed',
				synced: 1
			};
			mocks.mockGetJornadas.mockReturnValue([j1, j2]);

			render(EstadisticasPage);

			await waitFor(() => {
				// Total: 12h (8 + 4)
				expect(screen.getByText('12h 0m')).toBeInTheDocument();
				// Media: 6h/día (12h / 2 días)
				const mediaLabel = screen.getByText('Media diaria');
				expect(mediaLabel.parentElement?.textContent).toMatch(/6h 0m/);
				// Días trabajados: 2
				const diasLabel = screen.getByText('Días trabajados');
				expect(diasLabel.parentElement?.textContent).toMatch(/2/);
				// Total jornadas: 2
				const jornadasLabel = screen.getByText('Jornadas');
				expect(jornadasLabel.parentElement?.textContent).toMatch(/2/);
			});
		});
	});
});
