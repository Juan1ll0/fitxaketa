import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import type { Jornada, Settings } from '$lib/db';
import Page from '../+page.svelte';

const SETTINGS: Settings[] = [
	{
		fecha: new Date(2000, 0, 1),
		primer_dia_semana: 1,
		min_jornada_minutos: 0,
		horas_semanales: 0,
		dias_laborables: 5,
		redondeo_minutos: 0
	}
];

const mocks = vi.hoisted(() => ({
	startJornada: vi.fn().mockResolvedValue(undefined),
	stopJornada: vi.fn().mockResolvedValue(undefined),
	agregarJornadaManual: vi.fn().mockResolvedValue(undefined),
	subscribe: vi.fn(),
	getClockedIn: vi.fn(),
	getElapsed: vi.fn(),
	getJornadas: vi.fn(),
	getJornadasHoy: vi.fn(),
	getSettings: vi.fn()
}));

vi.mock('$lib/stores/app-state', () => ({
	startJornada: mocks.startJornada,
	stopJornada: mocks.stopJornada,
	agregarJornadaManual: mocks.agregarJornadaManual,
	subscribe: mocks.subscribe,
	getClockedIn: mocks.getClockedIn,
	getElapsed: mocks.getElapsed,
	getJornadas: mocks.getJornadas,
	getJornadasHoy: mocks.getJornadasHoy,
	getSettings: mocks.getSettings
}));

function subscribeInmediato(): void {
	mocks.subscribe.mockImplementation((cb: () => void) => {
		cb();
		return vi.fn();
	});
}

describe('+page.svelte (dashboard 003.8)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getClockedIn.mockReturnValue(false);
		mocks.getElapsed.mockReturnValue('00:00:00');
		mocks.getJornadas.mockReturnValue([]);
		mocks.getJornadasHoy.mockReturnValue([]);
		mocks.getSettings.mockReturnValue(SETTINGS);
		mocks.subscribe.mockReturnValue(vi.fn());
	});

	afterEach(() => cleanup());

	it('muestra el cronómetro con el valor de getElapsed', async () => {
		mocks.getElapsed.mockReturnValue('01:30:45');
		subscribeInmediato();
		render(Page);
		// El cronómetro parte "HH:MM" y ":SS" en dos spans (tamaños distintos);
		// se comprueba el textContent completo vía el data-testid.
		await waitFor(() => expect(screen.getByTestId('cronometro')).toHaveTextContent('01:30:45'));
	});

	it('muestra "Descansando" / "Trabajando" según el estado', async () => {
		mocks.getClockedIn.mockReturnValue(false);
		subscribeInmediato();
		render(Page);
		await waitFor(() => expect(screen.getByText('Descansando')).toBeInTheDocument());

		cleanup();
		mocks.getClockedIn.mockReturnValue(true);
		render(Page);
		await waitFor(() => expect(screen.getByText('Trabajando')).toBeInTheDocument());
	});

	it('el botón Fichar cambia de texto y color según el estado', async () => {
		mocks.getClockedIn.mockReturnValue(false);
		subscribeInmediato();
		render(Page);
		await waitFor(() => {
			const boton = screen.getByRole('button', { name: 'Fichar entrada' });
			expect(boton).toHaveClass('bg-primary');
			expect(boton).not.toHaveClass('bg-danger');
		});
	});

	it('llama a startJornada al pulsar Fichar entrada', async () => {
		mocks.getClockedIn.mockReturnValue(false);
		subscribeInmediato();
		render(Page);
		const boton = await screen.findByRole('button', { name: 'Fichar entrada' });
		await fireEvent.click(boton);
		expect(mocks.startJornada).toHaveBeenCalled();
	});

	it('llama a stopJornada al pulsar Fichar salida', async () => {
		mocks.getClockedIn.mockReturnValue(true);
		subscribeInmediato();
		render(Page);
		const boton = await screen.findByRole('button', { name: 'Fichar salida' });
		await fireEvent.click(boton);
		expect(mocks.stopJornada).toHaveBeenCalled();
	});

	it('muestra las stat cards de resumen (Hoy, Jornadas, Restante)', async () => {
		mocks.getJornadasHoy.mockReturnValue([
			{ id: 1, status: 'closed' },
			{ id: 2, status: 'closed' }
		] as unknown as Jornada[]);
		subscribeInmediato();
		render(Page);
		await waitFor(() => {
			expect(screen.getByText('Hoy')).toBeInTheDocument();
			expect(screen.getByText('Jornadas')).toBeInTheDocument();
			expect(screen.getByText('Restante')).toBeInTheDocument();
			expect(screen.getByText('2')).toBeInTheDocument();
		});
	});

	it('ofrece el acceso secundario "Añadir fichaje"', async () => {
		subscribeInmediato();
		render(Page);
		await waitFor(() =>
			expect(screen.getByRole('button', { name: /Añadir fichaje/ })).toBeInTheDocument()
		);
	});

	it('se suscribe al store', async () => {
		subscribeInmediato();
		render(Page);
		await waitFor(() => expect(mocks.subscribe).toHaveBeenCalled());
	});
});
