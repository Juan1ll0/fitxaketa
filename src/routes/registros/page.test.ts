import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '$lib/db';
import RegistrosPage from './+page.svelte';
import type { Jornada } from '$lib/db';

// Mock de SvelteKit para navegación
const mockPushState = vi.fn();
const mockBack = vi.fn();

vi.mock('$app/navigation', () => ({
	goto: mockPushState
}));

vi.mock('$app/history', () => ({
	back: mockBack
}));

describe('Registros page (/registros)', () => {
	beforeEach(async () => {
		await db.delete();
		await db.open();
	});

	// Helper para crear jornadas de prueba
	async function createTestJornada(overrides: Partial<Jornada> = {}): Promise<number> {
		const jornada: Jornada = {
			start_time: new Date(),
			end_time: null,
			lat_start: null,
			lng_start: null,
			lat_end: null,
			lng_end: null,
			duration: null,
			status: 'open',
			synced: 0,
			...overrides
		};
		return await db.jornadas.add(jornada);
	}

	describe('estado vacío', () => {
		// AC-06: La página muestra mensaje cuando no hay registros

		it('debería mostrar mensaje cuando no hay jornadas', async () => {
			render(RegistrosPage);

			await waitFor(() => {
				expect(screen.getByText('No hay registros todavía')).toBeInTheDocument();
			});
		});
	});

	describe('lista de jornadas', () => {
		// AC-06: Cada registro muestra hora de inicio, hora de fin, duración formateada, sync

		it('debería mostrar la lista de jornadas', async () => {
			// Crear jornadas de prueba
			await createTestJornada({
				start_time: new Date('2026-06-15T08:00:00'),
				end_time: new Date('2026-06-15T17:00:00'),
				duration: 540,
				status: 'closed',
				synced: 1
			});

			await createTestJornada({
				start_time: new Date('2026-06-14T08:30:00'),
				end_time: new Date('2026-06-14T16:30:00'),
				duration: 480,
				status: 'closed',
				synced: 0
			});

			render(RegistrosPage);

			await waitFor(() => {
				// Debería haber al menos un registro visible
				const cards = screen.queryAllByText(/cerrada|abierta/);
				expect(cards.length).toBe(2);
			});
		});

		it('debería mostrar la hora de inicio de cada jornada', async () => {
			await createTestJornada({
				start_time: new Date('2026-06-15T08:00:00'),
				status: 'closed'
			});

			render(RegistrosPage);

			await waitFor(() => {
				// La fecha debería aparecer en formato español
				expect(screen.getByText(/15\/06\/2026/)).toBeInTheDocument();
				expect(screen.getByText(/08:00:00/)).toBeInTheDocument();
			});
		});

		it('debería mostrar la hora de fin cuando la jornada está cerrada', async () => {
			await createTestJornada({
				start_time: new Date('2026-06-15T08:00:00'),
				end_time: new Date('2026-06-15T17:00:00'),
				status: 'closed'
			});

			render(RegistrosPage);

			await waitFor(() => {
				expect(screen.getByText(/Salida:/)).toBeInTheDocument();
				expect(screen.getByText(/17:00:00/)).toBeInTheDocument();
			});
		});

		it('debería mostrar "En curso" para jornadas abiertas sin duración', async () => {
			await createTestJornada({
				start_time: new Date(),
				end_time: null,
				duration: null,
				status: 'open'
			});

			render(RegistrosPage);

			await waitFor(() => {
				expect(screen.getByText('En curso')).toBeInTheDocument();
			});
		});

		it('debería formatear la duración correctamente para horas y minutos', async () => {
			await createTestJornada({
				start_time: new Date('2026-06-15T08:00:00'),
				end_time: new Date('2026-06-15T17:30:00'),
				duration: 570, // 9h 30min
				status: 'closed'
			});

			render(RegistrosPage);

			await waitFor(() => {
				expect(screen.getByText('9h 30min')).toBeInTheDocument();
			});
		});

		it('debería formatear duración de solo minutos cuando < 1 hora', async () => {
			await createTestJornada({
				start_time: new Date('2026-06-15T08:00:00'),
				end_time: new Date('2026-06-15T08:45:00'),
				duration: 45,
				status: 'closed'
			});

			render(RegistrosPage);

			await waitFor(() => {
				expect(screen.getByText('45min')).toBeInTheDocument();
			});
		});

		it('debería mostrar estado de sincronización con emoji', async () => {
			await createTestJornada({
				start_time: new Date('2026-06-15T08:00:00'),
				end_time: new Date('2026-06-15T17:00:00'),
				duration: 540,
				status: 'closed',
				synced: 1
			});

			render(RegistrosPage);

			await waitFor(() => {
				expect(screen.getByText(/Sync: ✅/)).toBeInTheDocument();
			});
		});

		it('debería mostrar emoji ❌ para jornadas no sincronizadas', async () => {
			await createTestJornada({
				start_time: new Date('2026-06-15T08:00:00'),
				end_time: new Date('2026-06-15T17:00:00'),
				duration: 540,
				status: 'closed',
				synced: 0
			});

			render(RegistrosPage);

			await waitFor(() => {
				expect(screen.getByText(/Sync: ❌/)).toBeInTheDocument();
			});
		});

		it('debería mostrar badge "cerrada" para jornadas con status closed', async () => {
			await createTestJornada({
				status: 'closed',
				end_time: new Date()
			});

			render(RegistrosPage);

			await waitFor(() => {
				expect(screen.getByText('cerrada')).toBeInTheDocument();
			});
		});

		it('debería mostrar badge "abierta" para jornadas con status open', async () => {
			await createTestJornada({
				status: 'open'
			});

			render(RegistrosPage);

			await waitFor(() => {
				expect(screen.getByText('abierta')).toBeInTheDocument();
			});
		});

		it('debería mostrar coordenadas de inicio cuando están disponibles', async () => {
			await createTestJornada({
				start_time: new Date(),
				status: 'open',
				lat_start: 43.123456,
				lng_start: -2.654321
			});

			render(RegistrosPage);

			await waitFor(() => {
				expect(screen.getByText(/43.123456/)).toBeInTheDocument();
				expect(screen.getByText(/-2.654321/)).toBeInTheDocument();
			});
		});

		it('debería mostrar "—" cuando las coordenadas son null', async () => {
			await createTestJornada({
				start_time: new Date(),
				status: 'open',
				lat_start: null,
				lng_start: null
			});

			render(RegistrosPage);

			await waitFor(() => {
				expect(screen.getByText(/—/)).toBeInTheDocument();
			});
		});
	});

	describe('ordenación de la lista', () => {
		// AC-06: Lista ordenada por start_time descendente (más reciente primero)

		it('debería ordenar jornadas por start_time descendente', async () => {
			// Crear jornadas en orden cronológico inverso (más antigua primero)
			await createTestJornada({
				start_time: new Date('2026-06-10T08:00:00'),
				end_time: new Date('2026-06-10T17:00:00'),
				duration: 540,
				status: 'closed'
			});

			await createTestJornada({
				start_time: new Date('2026-06-20T08:00:00'),
				end_time: new Date('2026-06-20T17:00:00'),
				duration: 540,
				status: 'closed'
			});

			await createTestJornada({
				start_time: new Date('2026-06-15T08:00:00'),
				end_time: new Date('2026-06-15T17:00:00'),
				duration: 540,
				status: 'closed'
			});

			render(RegistrosPage);

			await waitFor(() => {
				const cards = document.querySelectorAll('.space-y-3 > div');
				expect(cards.length).toBe(3);

				// Verificar que la más reciente (20/06) aparece primero
				// Buscar texto que contenga "20/06/2026"
				const firstCard = cards[0];
				expect(firstCard.textContent).toContain('20/06/2026');
			});
		});

		it('debería mostrar la jornada más reciente primero', async () => {
			await createTestJornada({
				start_time: new Date('2026-06-01'),
				status: 'closed',
				end_time: new Date('2026-06-01'),
				duration: 60
			});

			await createTestJornada({
				start_time: new Date('2026-06-20'),
				status: 'closed',
				end_time: new Date('2026-06-20'),
				duration: 480
			});

			render(RegistrosPage);

			await waitFor(() => {
				const cards = document.querySelectorAll('.space-y-3 > div');
				const firstCardText = cards[0].textContent;
				expect(firstCardText).toContain('20/06/2026');
			});
		});
	});

	describe('navegación', () => {
		// AC-06: La página /registros tiene un botón para volver a la página principal

		it('debería tener un enlace para volver a la página principal', async () => {
			render(RegistrosPage);

			await waitFor(() => {
				const backLink = screen.getByText('Volver');
				expect(backLink).toBeInTheDocument();
			});
		});

		it('debería tener enlace con clase text-primary', async () => {
			render(RegistrosPage);

			await waitFor(() => {
				const backLink = screen.getByText('Volver');
				expect(backLink).toHaveClass('text-primary');
			});
		});

		it('debería enlazar a la raíz ("/")', async () => {
			render(RegistrosPage);

			await waitFor(() => {
				const backLink = screen.getByText('Volver') as HTMLAnchorElement;
				expect(backLink.getAttribute('href')).toBe('/');
			});
		});
	});

	describe('título y estructura', () => {
		it('debería tener título "Registros - Fitxaketa"', async () => {
			render(RegistrosPage);

			await waitFor(() => {
				expect(document.title).toBe('Registros - Fitxaketa');
			});
		});

		it('debería tener encabezado h1 con "Registros"', async () => {
			render(RegistrosPage);

			await waitFor(() => {
				expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Registros');
			});
		});

		it('debería tener estructura de contenedor centrado', async () => {
			render(RegistrosPage);

			await waitFor(() => {
				const container = document.querySelector('.max-w-2xl');
				expect(container).toBeInTheDocument();
			});
		});
	});
});
