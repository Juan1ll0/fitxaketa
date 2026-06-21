import { test, expect } from '@playwright/test';

test.describe('Persistencia del contador de fichaje', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('debería mantener el contador al navegar entre páginas', async ({ page }) => {
		const startButton = page.getByRole('button', { name: /Fichar entrada/i });
		await startButton.click();

		const stopButton = page.getByRole('button', { name: /Fichar salida/i });
		await expect(stopButton).toBeVisible();

		await page.goto('/registros');
		await expect(page.getByRole('heading', { name: /Historial/i })).toBeVisible();

		await page.goto('/');
		await expect(stopButton).toBeVisible();

		const elapsed = page.locator('p.font-mono');
		await expect(elapsed).not.toHaveText('00:00:00');
	});

	test('debería mantener el contador al refrescar la página', async ({ page }) => {
		const startButton = page.getByRole('button', { name: /Fichar entrada/i });
		await startButton.click();

		const stopButton = page.getByRole('button', { name: /Fichar salida/i });
		await expect(stopButton).toBeVisible();

		await page.reload();

		await expect(stopButton).toBeVisible();

		const elapsed = page.locator('p.font-mono');
		await expect(elapsed).not.toHaveText('00:00:00');
	});

	test('debería mantener el contador al cerrar y reabrir la pestaña', async ({ page, context }) => {
		const startButton = page.getByRole('button', { name: /Fichar entrada/i });
		await startButton.click();

		const stopButton = page.getByRole('button', { name: /Fichar salida/i });
		await expect(stopButton).toBeVisible();

		await page.close();

		const newPage = await context.newPage();
		await newPage.goto('/');

		const newStopButton = newPage.getByRole('button', { name: /Fichar salida/i });
		await expect(newStopButton).toBeVisible();

		const elapsed = newPage.locator('p.font-mono');
		await expect(elapsed).not.toHaveText('00:00:00');
	});

	test('debería mantener el contador al cerrar y reabrir la ventana', async ({ page, context }) => {
		const startButton = page.getByRole('button', { name: /Fichar entrada/i });
		await startButton.click();

		const stopButton = page.getByRole('button', { name: /Fichar salida/i });
		await expect(stopButton).toBeVisible();

		await page.close();

		const newPage = await context.newPage();
		await newPage.goto('/');

		await expect(newPage.getByRole('button', { name: /Fichar salida/i })).toBeVisible();

		const elapsed = newPage.locator('p.font-mono');
		await expect(elapsed).not.toHaveText('00:00:00');
	});
});
