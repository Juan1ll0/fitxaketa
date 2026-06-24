/**
 * Tests para HistorialFiltros.svelte
 *
 * Verifica el control temporal siempre visible (periodo/fecha/rango), el panel
 * colapsable de filtros secundarios (modo + estado) y el chip resumen de estado.
 *
 * ACs cubiertos: AC-03, AC-07, AC-08, AC-09, AC-10, AC-11, AC-13, AC-14, AC-24, AC-25
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import HistorialFiltros from '../HistorialFiltros.svelte';
import type { FiltroEstado } from '$lib/utils/historial-filtros';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultProps() {
	return {
		filtroTemporal: {
			tipo: 'periodo' as const,
			periodo: 'mes' as const,
			fechaReferencia: new Date(2026, 5, 23)
		},
		filtroEstado: 'cerradas' as FiltroEstado
	};
}

/** Abre el panel de filtros secundarios (modo + estado). */
async function abrirPanel(): Promise<void> {
	await fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
}

/** Convierte Date a YYYY-MM-DD para comparar con valores de input. */
function toYyyyMmDd(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('HistorialFiltros.svelte', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	// ─── Renderizado básico ─────────────────────────────────────────────────

	describe('renderizado por defecto (modo periodo) AC-03, AC-24', () => {
		it('muestra PeriodoNavegacion con botones Semana/Mes/Año (siempre visible)', () => {
			render(HistorialFiltros, { props: defaultProps() });

			expect(screen.getByRole('button', { name: 'Semana' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Mes' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Año' })).toBeInTheDocument();
		});

		it('muestra el botón "Filtros" para desplegar los filtros secundarios', () => {
			render(HistorialFiltros, { props: defaultProps() });
			expect(screen.getByRole('button', { name: /Filtros/ })).toBeInTheDocument();
		});

		it('los filtros secundarios (modo/estado) están colapsados por defecto', () => {
			render(HistorialFiltros, { props: defaultProps() });
			expect(screen.queryByRole('button', { name: 'Periodo' })).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Todas' })).not.toBeInTheDocument();
		});

		it('al abrir el panel muestra los tres botones de estado (Todas/Abiertas/Cerradas) (AC-14)', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();
			expect(screen.getByRole('button', { name: 'Todas' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Abiertas' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Cerradas' })).toBeInTheDocument();
		});

		it('el botón del estado por defecto (Cerradas) está activo (bg-primary)', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();
			const btn = screen.getByRole('button', { name: 'Cerradas' });
			expect(btn).toHaveClass('bg-primary');
		});

		it('los botones Todas y Abiertas no están activos inicialmente', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();
			expect(screen.getByRole('button', { name: 'Todas' })).not.toHaveClass('bg-primary');
			expect(screen.getByRole('button', { name: 'Abiertas' })).not.toHaveClass('bg-primary');
		});
	});

	// ─── Chip resumen de estado ──────────────────────────────────────────────

	describe('chip resumen de estado', () => {
		it('con el panel cerrado muestra el estado activo como chip resumen', () => {
			render(HistorialFiltros, { props: defaultProps() });
			// "Cerradas" aparece como chip aunque el panel esté cerrado
			expect(screen.getByText('Cerradas')).toBeInTheDocument();
			// pero no como botón (el botón está dentro del panel colapsado)
			expect(screen.queryByRole('button', { name: 'Cerradas' })).not.toBeInTheDocument();
		});
	});

	// ─── Cambio de modo (Periodo/Fecha/Rango) AC-09, AC-13 ───────────────

	describe('cambio de modo (AC-09, AC-13)', () => {
		it('al abrir el panel muestra los tres botones de modo (Periodo/Fecha/Rango)', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();
			expect(screen.getByRole('button', { name: 'Periodo' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Fecha' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Rango' })).toBeInTheDocument();
		});

		it('al hacer clic en "Fecha" aparece el input de fecha y desaparece PeriodoNavegacion', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();

			// PeriodoNavegacion visible inicialmente
			expect(screen.getByRole('button', { name: 'Semana' })).toBeInTheDocument();

			await fireEvent.click(screen.getByRole('button', { name: 'Fecha' }));

			// FechaFiltro aparece
			expect(screen.getByLabelText('Fecha')).toBeInTheDocument();
			// PeriodoNavegacion desaparece
			expect(screen.queryByRole('button', { name: 'Semana' })).not.toBeInTheDocument();
		});

		it('al hacer clic en "Rango" aparecen los inputs Desde/Hasta y desaparece PeriodoNavegacion', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();

			await fireEvent.click(screen.getByRole('button', { name: 'Rango' }));

			expect(screen.getByLabelText('Desde')).toBeInTheDocument();
			expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Semana' })).not.toBeInTheDocument();
		});

		it('al hacer clic en "Periodo" vuelve PeriodoNavegacion y desaparecen los otros', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();

			// Ir a Fecha
			await fireEvent.click(screen.getByRole('button', { name: 'Fecha' }));
			expect(screen.getByLabelText('Fecha')).toBeInTheDocument();

			// Volver a Periodo
			await fireEvent.click(screen.getByRole('button', { name: 'Periodo' }));
			expect(screen.getByRole('button', { name: 'Semana' })).toBeInTheDocument();
			expect(screen.queryByLabelText('Fecha')).not.toBeInTheDocument();
		});
	});

	// ─── Modo Fecha AC-07, AC-08 ─────────────────────────────────────────

	describe('modo fecha (AC-07, AC-08)', () => {
		it('input date tiene type="date" y max establecido', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();

			await fireEvent.click(screen.getByRole('button', { name: 'Fecha' }));

			const input = screen.getByLabelText('Fecha') as HTMLInputElement;
			expect(input.type).toBe('date');
			expect(input.max).toBeTruthy(); // max está establecido (fecha actual)
		});

		it('al seleccionar una fecha el valor del input cambia', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();

			await fireEvent.click(screen.getByRole('button', { name: 'Fecha' }));

			const input = screen.getByLabelText('Fecha');
			await fireEvent.input(input, { target: { value: '2026-06-20' } });

			expect((input as HTMLInputElement).value).toBe('2026-06-20');
		});
	});

	// ─── Modo Rango AC-10, AC-11 ─────────────────────────────────────────

	describe('modo rango (AC-10, AC-11)', () => {
		it('los inputs Desde y Hasta tienen type="date" y max establecido', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();

			await fireEvent.click(screen.getByRole('button', { name: 'Rango' }));

			const desdeInput = screen.getByLabelText('Desde') as HTMLInputElement;
			const hastaInput = screen.getByLabelText('Hasta') as HTMLInputElement;

			expect(desdeInput.type).toBe('date');
			expect(desdeInput.max).toBeTruthy();
			expect(hastaInput.type).toBe('date');
			expect(hastaInput.max).toBeTruthy();
		});

		it('los inputs tienen max igual a hoy', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();

			await fireEvent.click(screen.getByRole('button', { name: 'Rango' }));

			const desdeInput = screen.getByLabelText('Desde') as HTMLInputElement;
			const hastaInput = screen.getByLabelText('Hasta') as HTMLInputElement;
			const hoy = toYyyyMmDd(new Date());

			expect(desdeInput.max).toBe(hoy);
			expect(hastaInput.max).toBe(hoy);
		});
	});

	// ─── Botón Limpiar AC-09, AC-13 ──────────────────────────────────────

	describe('botón Limpiar (AC-09, AC-13)', () => {
		it('el botón Limpiar aparece en modo fecha', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();

			await fireEvent.click(screen.getByRole('button', { name: 'Fecha' }));
			expect(screen.getByRole('button', { name: 'Limpiar' })).toBeInTheDocument();
		});

		it('el botón Limpiar aparece en modo rango', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();

			await fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
			expect(screen.getByRole('button', { name: 'Limpiar' })).toBeInTheDocument();
		});

		it('el botón Limpiar no aparece en modo periodo', () => {
			render(HistorialFiltros, { props: defaultProps() });
			expect(screen.queryByRole('button', { name: 'Limpiar' })).not.toBeInTheDocument();
		});

		it('al hacer clic en Limpiar desde modo fecha vuelve a mostrar PeriodoNavegacion', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();

			await fireEvent.click(screen.getByRole('button', { name: 'Fecha' }));
			expect(screen.getByLabelText('Fecha')).toBeInTheDocument();

			await fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
			expect(screen.getByRole('button', { name: 'Semana' })).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Limpiar' })).not.toBeInTheDocument();
		});

		it('al hacer clic en Limpiar desde modo rango vuelve a mostrar PeriodoNavegacion', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();

			await fireEvent.click(screen.getByRole('button', { name: 'Rango' }));
			expect(screen.getByLabelText('Desde')).toBeInTheDocument();

			await fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
			expect(screen.getByRole('button', { name: 'Semana' })).toBeInTheDocument();
		});
	});

	// ─── Filtro de estado AC-14 ───────────────────────────────────────────

	describe('conmutador de estado (AC-14)', () => {
		it('al hacer clic en "Abiertas" este botón se activa con bg-primary', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();

			const abiertasBtn = screen.getByRole('button', { name: 'Abiertas' });
			await fireEvent.click(abiertasBtn);

			expect(abiertasBtn).toHaveClass('bg-primary');
		});

		it('al hacer clic en "Abiertas" el botón Cerradas pierde bg-primary', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();

			await fireEvent.click(screen.getByRole('button', { name: 'Abiertas' }));

			expect(screen.getByRole('button', { name: 'Cerradas' })).not.toHaveClass('bg-primary');
		});

		it('al hacer clic en "Todas" este botón se activa con bg-primary', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();

			const todasBtn = screen.getByRole('button', { name: 'Todas' });
			await fireEvent.click(todasBtn);

			expect(todasBtn).toHaveClass('bg-primary');
		});

		it('al hacer clic en "Todas" después de Abiertas, Todas vuelve a estar activa', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			await abrirPanel();

			// Cambiar a Abiertas
			await fireEvent.click(screen.getByRole('button', { name: 'Abiertas' }));
			expect(screen.getByRole('button', { name: 'Abiertas' })).toHaveClass('bg-primary');

			// Volver a Todas
			await fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
			expect(screen.getByRole('button', { name: 'Todas' })).toHaveClass('bg-primary');
			expect(screen.getByRole('button', { name: 'Abiertas' })).not.toHaveClass('bg-primary');
		});
	});

	// ─── Panel colapsable ─────────────────────────────────────────────────

	describe('panel colapsable de filtros', () => {
		it('al volver a hacer clic en "Filtros" el panel se colapsa (aria-expanded false)', async () => {
			render(HistorialFiltros, { props: defaultProps() });
			const toggle = screen.getByRole('button', { name: /Filtros/ });

			await fireEvent.click(toggle);
			expect(toggle).toHaveAttribute('aria-expanded', 'true');

			await fireEvent.click(toggle);
			expect(toggle).toHaveAttribute('aria-expanded', 'false');
		});

		it('el botón Filtros refleja el estado expandido con aria-expanded', async () => {
			render(HistorialFiltros, { props: defaultProps() });

			const toggle = screen.getByRole('button', { name: /Filtros/ });
			expect(toggle).toHaveAttribute('aria-expanded', 'false');

			await fireEvent.click(toggle);
			expect(toggle).toHaveAttribute('aria-expanded', 'true');
		});
	});
});
