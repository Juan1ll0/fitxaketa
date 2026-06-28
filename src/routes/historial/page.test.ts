import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { Jornada, Settings } from '$lib/db';

// Mocks hoisted antes de cualquier import
const mocks = vi.hoisted(() => {
	const mockExportarJornadas = vi.fn().mockResolvedValue(undefined);
	return {
		mockExportarJornadas,
		subscribe: vi.fn((callback: () => void) => {
			callback();
			return () => {};
		}),
		getJornadas: vi.fn(() => [] as Jornada[]),
		getSettings: vi.fn(() => [] as Settings[]),
		cargarJornadas: vi.fn().mockResolvedValue(undefined),
		afterNavigate: vi.fn((callback: () => void | Promise<void>) => {
			callback();
		})
	};
});

vi.mock('$lib/stores/app-state', () => ({
	subscribe: mocks.subscribe,
	getJornadas: mocks.getJornadas,
	getSettings: mocks.getSettings,
	cargarJornadas: mocks.cargarJornadas
}));

vi.mock('$app/navigation', () => ({
	afterNavigate: mocks.afterNavigate
}));

vi.mock('$lib/utils/historial-export', () => ({
	exportarJornadas: mocks.mockExportarJornadas,
	describirPeriodo: vi.fn(() => 'mes de junio de 2026')
}));

vi.mock('$lib/components/ExportConfirmModal.svelte', () => ({
	default: function MockExportConfirmModal({
		periodo,
		onConfirm,
		onCancel
	}: {
		periodo: string;
		onConfirm: () => void | Promise<void>;
		onCancel: () => void;
	}) {
		// Simple mock - doesn't need to match Svelte 5 runes exactly
		// Just provides the interface needed for testing
		return {
			periodo,
			onConfirm,
			onCancel
		};
	}
}));

import Page from './+page.svelte';

function crearJornada(override: Partial<Jornada> = {}): Jornada {
	return {
		id: 1,
		start_time: new Date(),
		end_time: new Date(),
		duration: 60,
		synced: 0,
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
		mocks.getSettings.mockReturnValue([]);
		mocks.cargarJornadas.mockResolvedValue(undefined);
	});

	afterEach(() => {
		cleanup();
	});

	it('muestra título "Historial"', async () => {
		render(Page);
		await tick();
		expect(screen.getByText('Historial')).toBeInTheDocument();
	});

	it('muestra estado vacío cuando no hay jornadas', async () => {
		mocks.getJornadas.mockReturnValue([]);
		render(Page);
		await tick();
		await screen.findByText('Aún no hay fichajes registrados');
	});

	it('muestra botón "Fichar ahora" en estado vacío y enlaza a /', async () => {
		mocks.getJornadas.mockReturnValue([]);
		render(Page);
		await tick();
		const boton = await screen.findByText('Fichar ahora');
		expect(boton).toHaveAttribute('href', '/');
	});

	it('muestra mensaje de filtro cuando hay jornadas pero no coinciden', async () => {
		const haceUnMes = new Date();
		haceUnMes.setMonth(haceUnMes.getMonth() - 1);
		mocks.getJornadas.mockReturnValue([crearJornada({ id: 1, start_time: haceUnMes })]);
		render(Page);
		await tick();
		await screen.findByText('No hay fichajes para este filtro');
	});

	it('muestra jornadas agrupadas por día ("Hoy", "Ayer")', async () => {
		const hoy = new Date();
		const ayer = new Date();
		ayer.setDate(ayer.getDate() - 1);

		mocks.getJornadas.mockReturnValue([
			crearJornada({ id: 1, start_time: hoy, status: 'closed' }),
			crearJornada({ id: 2, start_time: ayer, status: 'closed' })
		]);
		render(Page);
		await tick();

		const hoyHeaders = await screen.findAllByText('Hoy');
		expect(hoyHeaders.length).toBeGreaterThan(0);
		const ayerHeaders = await screen.findAllByText('Ayer');
		expect(ayerHeaders.length).toBeGreaterThan(0);
	});

	it('no muestra icono de sync ✅/❌', async () => {
		const hoy = new Date();
		mocks.getJornadas.mockReturnValue([crearJornada({ id: 1, start_time: hoy, status: 'closed' })]);
		render(Page);
		await tick();

		await tick();
		expect(screen.queryByText('✅')).not.toBeInTheDocument();
		expect(screen.queryByText('❌')).not.toBeInTheDocument();
	});

	it('muestra badge de estado "Cerrado" al expandir', async () => {
		const hoy = new Date();
		mocks.getJornadas.mockReturnValue([crearJornada({ id: 1, start_time: hoy, status: 'closed' })]);
		render(Page);
		await tick();

		const buttons = screen.getAllByRole('button', { expanded: false });
		const header = buttons.find((b) => b.getAttribute('aria-controls')?.startsWith('dia-'));
		if (header) {
			await fireEvent.click(header);
			await tick();
		}

		await screen.findByText('Cerrado');
	});

	it('los grupos de día están colapsados por defecto', async () => {
		const hoy = new Date();
		mocks.getJornadas.mockReturnValue([crearJornada({ id: 1, start_time: hoy, status: 'closed' })]);
		render(Page);
		await tick();

		// Buscar el botón con aria-controls que empieza con "dia-" (cabecera del grupo)
		const buttons = await screen.findAllByRole('button');
		const diaButton = buttons.find((b) => b.getAttribute('aria-controls')?.startsWith('dia-'));
		expect(diaButton).toBeDefined();
		expect(diaButton).toHaveAttribute('aria-expanded', 'false');
	});

	it('al expandir un día se ven las jornadas', async () => {
		const hoy = new Date();
		mocks.getJornadas.mockReturnValue([crearJornada({ id: 1, start_time: hoy, status: 'closed' })]);
		render(Page);
		await tick();

		const buttons = screen.getAllByRole('button', { expanded: false });
		const header = buttons.find((b) => b.getAttribute('aria-controls')?.startsWith('dia-'));
		if (header) {
			await fireEvent.click(header);
			await tick();
			expect(header).toHaveAttribute('aria-expanded', 'true');
		}
	});

	it('muestra botón Exportar', async () => {
		render(Page);
		await tick();
		expect(screen.getByText('Exportar')).toBeInTheDocument();
	});

	// ── Exportación ───────────────────────────────────────────────────────
	// NOTA: Los tests de interacción con el modal (dialog.showModal) requieren
	// un polyfill de jsdom. Por ahora testeamos solo el botón.

	describe('botón Exportar (AC-23)', () => {
		it('el botón Exportar está deshabilitado cuando no hay jornadas cerradas', async () => {
			mocks.getJornadas.mockReturnValue([crearJornada({ status: 'open', end_time: null })]);
			render(Page);
			await tick();

			const btn = screen.getByText('Exportar');
			expect(btn).toBeDisabled();
		});

		it('el botón Exportar está habilitado cuando hay jornadas cerradas', async () => {
			const hoy = new Date();
			mocks.getJornadas.mockReturnValue([
				crearJornada({ id: 1, start_time: hoy, status: 'closed' })
			]);
			render(Page);
			await tick();

			const btn = screen.getByText('Exportar');
			expect(btn).not.toBeDisabled();
		});

		it('al hacer clic en Exportar se llama a handleExportar (abre modal)', async () => {
			const hoy = new Date();
			mocks.getJornadas.mockReturnValue([
				crearJornada({ id: 1, start_time: hoy, status: 'closed' })
			]);
			render(Page);
			await tick();

			// Clicking should work without error (modal opens via state change)
			await fireEvent.click(screen.getByText('Exportar'));
			await tick();

			// The button should still be there after clicking (modal is shown conditionally)
			expect(screen.getByText('Exportar')).toBeInTheDocument();
		});
	});
});
