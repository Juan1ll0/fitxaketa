import { test, expect } from '@playwright/test';

test.describe('Modo offline', () => {
	test('la app debería seguir funcional sin conexión', async ({ page, context }) => {
		await page.goto('/');

		// Verificar estado inicial
		const button = page.getByRole('button', { name: /Fichar entrada/i });
		await expect(button).toBeVisible();

		// Activar modo offline
		await context.setOffline(true);

		// La página ya está cargada; verificar que el botón sigue visible y funcional
		await button.click();

		// Después de clicar, el texto debería cambiar a "Fichar salida"
		const stopButton = page.getByRole('button', { name: /Fichar salida/i });
		await expect(stopButton).toBeVisible();

		// Restaurar conexión
		await context.setOffline(false);
	});
});
