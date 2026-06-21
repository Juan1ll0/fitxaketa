import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { Jornada } from '$lib/db';

// Mocks con vi.hoisted() para asegurar que se crean antes del hoisting de vi.mock
const mocks = vi.hoisted(() => ({
	subscribe: vi.fn((callback: () => void) => {
		callback(); // Llama inmediatamente como el store real
		return () => {};
	}),
	getJornadas: vi.fn(() => [] as Jornada[]),
	cargarJornadas: vi.fn().mockResolvedValue(undefined),
	afterNavigate: vi.fn((callback: () => void | Promise<void>) => {
		// Simula la navegación llamando al callback inmediatamente
		callback();
	})
}));

vi.mock('$lib/stores/app-state', () => ({
	subscribe: mocks.subscribe,
	getJornadas: mocks.getJornadas,
	cargarJornadas: mocks.cargarJornadas
}));

vi.mock('$app/navigation', () => ({
	afterNavigate: mocks.afterNavigate
}));

// Importar Page DESPUÉS de definir los mocks
import Page from './+page.svelte';

function crearJornada(override: Partial<Jornada> = {}): Jornada {
	return {
		id: 1,
		start_time: new Date(),
		end_time: new Date(),
		duration: 60,
		synced: 1,
		status: 'closed',
		lat_start: null,
		lng_start: null,
		lat_end: null,
		lng_end: null,
		...override
	};
}

describe('Historial Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getJornadas.mockReturnValue([]);
		mocks.cargarJornadas.mockResolvedValue(undefined);
	});

	afterEach(() => {
		cleanup();
	});

	it('muestra estado de carga inicialmente', async () => {
		mocks.cargarJornadas.mockImplementation(
			() => new Promise(() => {}) as unknown as Promise<void>
		);

		render(Page);

		expect(screen.getByText('Cargando...')).toBeInTheDocument();
	});

	it('muestra estado vacío cuando no hay jornadas', async () => {
		mocks.getJornadas.mockReturnValue([]);
		mocks.cargarJornadas.mockResolvedValue(undefined);

		render(Page);
		await tick();

		await screen.findByText('Aún no hay fichajes registrados');
	});

	it('muestra botón "Fichar ahora" en estado vacío y enlaza a /', async () => {
		mocks.getJornadas.mockReturnValue([]);
		mocks.cargarJornadas.mockResolvedValue(undefined);

		render(Page);
		await tick();

		const boton = await screen.findByText('Fichar ahora');
		expect(boton).toHaveAttribute('href', '/');
	});

	it('muestra jornadas agrupadas por día ("Hoy", "Ayer")', async () => {
		const hoy = new Date();
		const ayer = new Date();
		ayer.setDate(ayer.getDate() - 1);

		mocks.getJornadas.mockReturnValue([
			crearJornada({ id: 1, start_time: hoy, synced: 1, status: 'closed' }),
			crearJornada({ id: 2, start_time: ayer, synced: 0, status: 'closed' })
		]);
		mocks.cargarJornadas.mockResolvedValue(undefined);

		render(Page);
		await tick();

		await screen.findByText('Hoy');
		await screen.findByText('Ayer');
	});

	it('muestra icono de sync correcto (synced=1 → title "Sincronizado")', async () => {
		const hoy = new Date();

		mocks.getJornadas.mockReturnValue([
			crearJornada({ id: 1, start_time: hoy, synced: 1, status: 'closed' }),
			crearJornada({ id: 2, start_time: hoy, synced: 0, status: 'closed' })
		]);
		mocks.cargarJornadas.mockResolvedValue(undefined);

		render(Page);
		await tick();

		await screen.findByTitle('Sincronizado');
		await screen.findByTitle('No sincronizado');
	});
});
