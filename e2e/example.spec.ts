import { test, expect } from '@playwright/test';

test.describe('Página principal', () => {
	test('debería mostrar el botón de fichaje', async ({ page }) => {
		await page.goto('/');
		const button = page.getByRole('button', { name: /fichar/i });
		await expect(button).toBeVisible();
	});

	test('debería tomar un screenshot de referencia', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveScreenshot('landing.png', {
			maxDiffPixelRatio: 0.05
		});
	});
});
