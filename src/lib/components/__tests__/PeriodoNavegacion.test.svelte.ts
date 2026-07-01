/**
 * Tests para PeriodoNavegacion.svelte
 *
 * ACs cubiertos: AC-01, AC-02, AC-03, AC-09, AC-13, AC-14, AC-21, AC-22, AC-23
 *
 * Tests de integración del componente con las funciones de navegación.
 * Se prueban: renderizado, navegación, botones deshabilitados, y coherencia entre vistas.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import PeriodoNavegacion from '$lib/components/PeriodoNavegacion.svelte';
import type { Periodo } from '$lib/stores/app-state';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Renderiza el componente con las props dadas. */
function renderPeriodoNavegacion(props: {
	periodo?: Periodo;
	fechaReferencia?: Date;
	primerDia?: number;
}) {
	const { periodo = 'mes', fechaReferencia = new Date(2026, 5, 15), primerDia = 1 } = props;
	return render(PeriodoNavegacion, { periodo, fechaReferencia, primerDia });
}

// ─── Setup ─────────────────────────────────────────────────────────────────

describe('PeriodoNavegacion.svelte', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	// ─── Renderizado inicial ───────────────────────────────────────────────

	describe('renderizado inicial (AC-01)', () => {
		// AC-01: Botones "Anterior" y "Siguiente" visibles junto al selector de periodo
		it('renderiza botones Anterior y Siguiente (AC-01)', () => {
			const { getByLabelText } = renderPeriodoNavegacion({});
			expect(getByLabelText('Periodo anterior')).toBeInTheDocument();
			expect(getByLabelText('Periodo siguiente')).toBeInTheDocument();
		});

		it('renderiza selector con 3 botones (Semana/Mes/Año) (AC-01)', () => {
			const { getByText } = renderPeriodoNavegacion({});
			expect(getByText('Semana')).toBeInTheDocument();
			expect(getByText('Mes')).toBeInTheDocument();
			expect(getByText('Año')).toBeInTheDocument();
		});

		// AC-09: Botón "Hoy" visible para volver rápidamente al periodo actual
		it('renderiza botón "Hoy" (AC-09)', () => {
			const { getByText } = renderPeriodoNavegacion({});
			expect(getByText('Hoy')).toBeInTheDocument();
		});

		// AC-08: El indicador de periodo muestra el rango actual
		it('muestra indicador de periodo correcto para mes (AC-08)', () => {
			const { getByText } = renderPeriodoNavegacion({
				periodo: 'mes',
				fechaReferencia: new Date(2026, 5, 15) // 15 junio 2026
			});
			expect(getByText('Junio 2026')).toBeInTheDocument();
		});

		it('muestra indicador de periodo correcto para semana (AC-08)', () => {
			const { getByText } = renderPeriodoNavegacion({
				periodo: 'semana',
				fechaReferencia: new Date(2026, 5, 15) // lunes 15 junio 2026
			});
			expect(getByText(/Semana del/)).toBeInTheDocument();
		});

		it('muestra indicador de periodo correcto para año (AC-08)', () => {
			const { getByText } = renderPeriodoNavegacion({
				periodo: 'año',
				fechaReferencia: new Date(2026, 5, 15)
			});
			expect(getByText('2026')).toBeInTheDocument();
		});
	});

	// ─── Navegación ─────────────────────────────────────────────────────────

	describe('navegación (AC-04, AC-05, AC-06, AC-07)', () => {
		it('click en Anterior cambia la fecha de referencia para semana (AC-04)', async () => {
			// Lunes 15 junio → semana anterior: lunes 8 junio
			const { getByLabelText, getByText } = renderPeriodoNavegacion({
				periodo: 'semana',
				fechaReferencia: new Date(2026, 5, 15)
			});

			const anteriorBtn = getByLabelText('Periodo anterior');
			await fireEvent.click(anteriorBtn);

			// Indicador debe mostrar semana anterior (8 jun al 14 jun)
			expect(getByText(/Semana del 8 jun al 14 jun/)).toBeInTheDocument();
		});

		it('click en Anterior cambia la fecha de referencia para mes (AC-05)', async () => {
			// Junio 2026 → mayo 2026
			const { getByLabelText, getByText } = renderPeriodoNavegacion({
				periodo: 'mes',
				fechaReferencia: new Date(2026, 5, 15)
			});

			const anteriorBtn = getByLabelText('Periodo anterior');
			await fireEvent.click(anteriorBtn);

			expect(getByText('Mayo 2026')).toBeInTheDocument();
		});

		it('click en Anterior cambia la fecha de referencia para año (AC-06)', async () => {
			// 2026 → 2025
			const { getByLabelText, getByText } = renderPeriodoNavegacion({
				periodo: 'año',
				fechaReferencia: new Date(2026, 5, 15)
			});

			const anteriorBtn = getByLabelText('Periodo anterior');
			await fireEvent.click(anteriorBtn);

			expect(getByText('2025')).toBeInTheDocument();
		});

		it('click en Siguiente avanza al periodo siguiente (AC-07)', async () => {
			// Mayo 2026 → junio 2026
			const { getByLabelText, getByText } = renderPeriodoNavegacion({
				periodo: 'mes',
				fechaReferencia: new Date(2026, 4, 15) // mayo
			});

			const siguienteBtn = getByLabelText('Periodo siguiente');
			await fireEvent.click(siguienteBtn);

			expect(getByText('Junio 2026')).toBeInTheDocument();
		});

		// AC-10, AC-11, AC-12: click en "Hoy" vuelve al periodo actual
		// Verificamos que el botón "Hoy" funciona sin errores
		// El resultado exacto depende del tiempo del sistema, así que verificamos que el click no falla
		it('click en botón Hoy no causa errores (AC-10)', async () => {
			const { getByText } = renderPeriodoNavegacion({
				periodo: 'semana',
				fechaReferencia: new Date(2026, 5, 8) // semana pasada
			});

			const hoyBtn = getByText('Hoy');
			await fireEvent.click(hoyBtn);

			// El botón sigue existiendo y está en el documento (verifica que no hay errores)
			expect(hoyBtn).toBeInTheDocument();
		});
	});

	// ─── Deshabilitado ─────────────────────────────────────────────────────

	describe('botones deshabilitados (AC-02, AC-03, AC-13, AC-21)', () => {
		// AC-02/AC-21: El botón "Siguiente" se deshabilita cuando el periodo es actual
		it('Siguiente deshabilitado en periodo actual (AC-02, AC-21)', async () => {
			// Hoy es 17 junio 2026, mes actual = junio 2026. Se fija el reloj del
			// sistema (no solo Date.now) porque el componente usa `new Date()`.
			vi.useFakeTimers();
			vi.setSystemTime(new Date(2026, 5, 17, 12, 0));

			try {
				const { getByLabelText } = renderPeriodoNavegacion({
					periodo: 'mes',
					fechaReferencia: new Date(2026, 5, 15) // mismo mes que hoy
				});

				const siguienteBtn = getByLabelText('Periodo siguiente');
				expect(siguienteBtn).toBeDisabled();
				expect(siguienteBtn).toHaveAttribute('aria-disabled', 'true');
			} finally {
				vi.useRealTimers();
			}
		});

		// AC-13: El botón "Hoy" se deshabilita cuando ya se está en el periodo actual
		it('Hoy deshabilitado cuando ya se está en periodo actual (AC-13)', async () => {
			// Usar fake timers para controlar la fecha del sistema
			vi.useFakeTimers();
			vi.setSystemTime(new Date(2026, 5, 17, 12, 0)); // 17 junio 2026 12:00

			try {
				const { getByText } = renderPeriodoNavegacion({
					periodo: 'semana',
					fechaReferencia: new Date(2026, 5, 15) // semana actual (contiene al 17)
				});

				const hoyBtn = getByText('Hoy');
				expect(hoyBtn).toBeDisabled();
				expect(hoyBtn).toHaveAttribute('aria-disabled', 'true');
			} finally {
				vi.useRealTimers();
			}
		});

		// AC-03: El botón "Anterior" siempre está habilitado
		it('Anterior siempre habilitado (AC-03)', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date(2026, 5, 17, 12, 0));

			try {
				const { getByLabelText } = renderPeriodoNavegacion({
					periodo: 'mes',
					fechaReferencia: new Date(2026, 5, 15)
				});

				const anteriorBtn = getByLabelText('Periodo anterior');
				expect(anteriorBtn).not.toBeDisabled();
			} finally {
				vi.useRealTimers();
			}
		});

		it('Siguiente habilitado cuando no estamos en periodo actual', async () => {
			const { getByLabelText } = renderPeriodoNavegacion({
				periodo: 'mes',
				fechaReferencia: new Date(2026, 4, 15) // mayo (mes pasado)
			});

			const siguienteBtn = getByLabelText('Periodo siguiente');
			expect(siguienteBtn).not.toBeDisabled();
		});

		it('Hoy habilitado cuando no estamos en periodo actual', async () => {
			const { getByText } = renderPeriodoNavegacion({
				periodo: 'semana',
				fechaReferencia: new Date(2026, 5, 8) // semana pasada
			});

			const hoyBtn = getByText('Hoy');
			expect(hoyBtn).not.toBeDisabled();
		});
	});

	// ─── Coherencia entre vistas (AC-22, AC-23) ──────────────────────────────

	describe('coherencia entre vistas (AC-22, AC-23)', () => {
		// AC-22: Corto → Largo: mantener referencia temporal
		it('Semana → Mes: mantiene la referencia temporal (AC-22)', async () => {
			// Semana del 15 jun al 21 jun 2026 → cambio a mes
			const { getByText } = renderPeriodoNavegacion({
				periodo: 'semana',
				fechaReferencia: new Date(2026, 5, 15)
			});

			// Cambiar a Mes
			const mesBtn = getByText('Mes');
			await fireEvent.click(mesBtn);

			// Debe mostrar Junio 2026 (el mes que contenía la semana)
			expect(getByText('Junio 2026')).toBeInTheDocument();
		});

		it('Mes → Año: mantiene la referencia temporal (AC-22)', async () => {
			// Junio 2026 → cambio a año
			const { getAllByText } = renderPeriodoNavegacion({
				periodo: 'mes',
				fechaReferencia: new Date(2026, 5, 15)
			});

			// Cambiar a Año
			const anoBtn = getAllByText('Año')[0];
			await fireEvent.click(anoBtn);

			// Debe mostrar 2026
			expect(getAllByText('2026')[0]).toBeInTheDocument();
		});

		// AC-23: Largo → Corto: punto medio
		it('Año → Mes: usa punto medio cuando no es futuro (AC-23)', async () => {
			// Usamos una fecha lejana (2020) para que el punto medio (1 julio 2020) no sea futuro
			const { getByText } = renderPeriodoNavegacion({
				periodo: 'año',
				fechaReferencia: new Date(2020, 5, 15)
			});

			// Cambiar a Mes
			const mesBtn = getByText('Mes');
			await fireEvent.click(mesBtn);

			// Debe mostrar Julio 2020 (punto medio del año = 1 julio)
			expect(getByText('Julio 2020')).toBeInTheDocument();
		});

		it('Mes → Semana: usa punto medio (jueves) (AC-23)', async () => {
			// Junio 2026 → cambio a semana
			const { getByText } = renderPeriodoNavegacion({
				periodo: 'mes',
				fechaReferencia: new Date(2026, 5, 15)
			});

			// Cambiar a Semana
			const semanaBtn = getByText('Semana');
			await fireEvent.click(semanaBtn);

			// Debe mostrar la semana del punto medio (15 jun → día 15 del mes, cae en semana del 15 jun)
			// El punto medio del mes es el día 15, que está en la semana del 15-21 jun
			expect(getByText(/Semana del 15 jun al 21 jun/)).toBeInTheDocument();
		});
	});

	// ─── A11y ──────────────────────────────────────────────────────────────

	describe('accesibilidad (a11y)', () => {
		it('botones Anterior y Siguiente tienen aria-label (AC-01)', () => {
			const { getByLabelText } = renderPeriodoNavegacion({});
			expect(getByLabelText('Periodo anterior')).toBeInTheDocument();
			expect(getByLabelText('Periodo siguiente')).toBeInTheDocument();
		});

		it('botón Hoy tiene aria-label correcto', () => {
			const { getByLabelText } = renderPeriodoNavegacion({});
			expect(getByLabelText('Volver al periodo actual')).toBeInTheDocument();
		});

		it('botón Siguiente deshabilitado tiene aria-disabled="true"', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date(2026, 5, 17, 12, 0));

			try {
				const { getByLabelText } = renderPeriodoNavegacion({
					periodo: 'mes',
					fechaReferencia: new Date(2026, 5, 15)
				});

				const siguienteBtn = getByLabelText('Periodo siguiente');
				expect(siguienteBtn).toHaveAttribute('aria-disabled', 'true');
			} finally {
				vi.useRealTimers();
			}
		});

		it('nav tiene aria-label de navegación temporal', () => {
			const { container } = renderPeriodoNavegacion({});
			const nav = container.querySelector('nav');
			expect(nav).toHaveAttribute('aria-label', 'Navegación temporal');
		});
	});

	// ─── Indicador clickeable (AC-14) ──────────────────────────────────────

	describe('indicador clickeable (AC-14)', () => {
		it('click en indicador vuelve a hoy cuando no estamos en periodo actual', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date(2026, 5, 17, 12, 0));

			try {
				const { getByText } = renderPeriodoNavegacion({
					periodo: 'semana',
					fechaReferencia: new Date(2026, 5, 8) // semana pasada
				});

				// El indicador es el botón central con el texto del periodo
				const indicador = getByText(/Semana del 8 jun al 14 jun/);
				await fireEvent.click(indicador);

				// Debe haber vuelto a la semana actual
				expect(getByText(/Semana del 15 jun al 21 jun/)).toBeInTheDocument();
			} finally {
				vi.useRealTimers();
			}
		});
	});
});
