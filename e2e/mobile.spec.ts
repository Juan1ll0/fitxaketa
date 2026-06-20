import { test, expect } from '@playwright/test';

test.describe('iPhone 12 (emulación)', () => {
	test('debería mostrar el botón de fichaje en viewport móvil', async ({ page }) => {
		await page.goto('/');
		const button = page.getByRole('button', { name: /Fichar entrada/i });
		await expect(button).toBeVisible();
	});

	test('debería usar el viewport del iPhone 12', async ({ page }) => {
		await page.goto('/');
		const viewport = page.viewportSize();
		expect(viewport).not.toBeNull();
		expect(viewport?.width).toBe(390);
		expect(viewport?.height).toBe(844);
	});

	test('debería seguir funcional sin conexión en móvil', async ({ page, context }) => {
		await page.goto('/');

		const button = page.getByRole('button', { name: /Fichar entrada/i });
		await expect(button).toBeVisible();

		// Activar modo offline; la página ya está cargada
		await context.setOffline(true);

		await button.click();

		const stopButton = page.getByRole('button', { name: /Fichar salida/i });
		await expect(stopButton).toBeVisible();

		await context.setOffline(false);
	});
});
