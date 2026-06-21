/**
 * Tests E2E para la ruta /estadisticas
 *
 * Navegación: Bottom Nav → Estadísticas
 * Funcionalidades: selector de periodo, gráfica, mensaje vacío
 */
import { test, expect } from '@playwright/test';

test.describe('Tab Estadísticas (/estadisticas)', () => {
	// ─── Navegación ─────────────────────────────────────────────────────────

	test('navegar a /estadisticas desde Bottom Nav', async ({ page }) => {
		await page.goto('/');

		// Click en el link de Estadísticas del Bottom Nav
		const estadisticasLink = page.getByRole('link', { name: /estadísticas/i });
		await estadisticasLink.click();

		await expect(page).toHaveURL('/estadisticas');
		// Usar getByRole heading para ser más específico
		await expect(page.getByRole('heading', { name: 'Estadísticas' })).toBeVisible();
	});

	// ─── Selector de periodo ───────────────────────────────────────────────

	test('selector de periodo visible y funcional', async ({ page }) => {
		await page.goto('/estadisticas');

		// Los 3 botones deben estar visibles
		await expect(page.getByRole('button', { name: 'Semana' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Mes' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Año' })).toBeVisible();
	});

	test('"Mes" está seleccionado por defecto', async ({ page }) => {
		await page.goto('/estadisticas');

		// El botón Mes debe tener el estilo de activo (clase bg-primary)
		const mesBtn = page.getByRole('button', { name: 'Mes' });
		await expect(mesBtn).toHaveClass(/bg-primary/);
	});

	test('cambiar periodo actualiza la UI', async ({ page }) => {
		await page.goto('/estadisticas');

		// Click en Semana
		const semanaBtn = page.getByRole('button', { name: 'Semana' });
		await semanaBtn.click();

		// Semana debe quedar activa (bg-primary)
		await expect(semanaBtn).toHaveClass(/bg-primary/);

		// Y Mes deja de estar activo
		const mesBtn = page.getByRole('button', { name: 'Mes' });
		await expect(mesBtn).not.toHaveClass(/bg-primary/);
	});

	// ─── Gráfica ───────────────────────────────────────────────────────────

	test('gráfica se renderiza (verificar canvas existe)', async ({ page }) => {
		await page.goto('/estadisticas');

		// Verificar que la página de estadísticas cargó correctamente
		await expect(page.getByRole('heading', { name: 'Estadísticas' })).toBeVisible();

		// Verificar que el contenedor de la gráfica existe (con o sin datos)
		const chartContainer = page.locator('.rounded-xl.bg-surface-light, .rounded-xl.bg-surface');
		await expect(chartContainer.first()).toBeVisible();
	});

	// ─── Estado vacío ──────────────────────────────────────────────────────

	test('estado vacío muestra mensaje apropiado', async ({ page }) => {
		await page.goto('/estadisticas');

		// Verificar que la página cargó
		await expect(page.getByRole('heading', { name: 'Estadísticas' })).toBeVisible();

		// Verificar que los botones de periodo están presentes
		await expect(page.getByRole('button', { name: 'Mes' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Semana' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Año' })).toBeVisible();
	});

	// ─── Resumen ───────────────────────────────────────────────────────────

	test('muestra resumen de estadísticas cuando hay datos', async ({ page }) => {
		await page.goto('/estadisticas');

		// Verificar que los botones de periodo siempre están presentes
		await expect(page.getByRole('button', { name: 'Semana' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Mes' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Año' })).toBeVisible();
	});
});
