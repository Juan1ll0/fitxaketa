import { test, expect } from '@playwright/test';

// A diferencia de offline.spec.ts (que solo comprueba una página ya cargada), aquí
// verificamos el caso real que fallaba en el iPhone: recargar / abrir en frío SIN
// conexión. Eso exige que el service worker precachee el shell (200.html) y sirva
// la navegación offline. El SW está bloqueado globalmente en la config, así que lo
// habilitamos solo en este fichero.
test.use({ serviceWorkers: 'allow' });

test.describe('PWA offline (precache + navigation fallback)', () => {
	test('recarga y navega sin conexión tras precachear el shell', async ({ page, context }) => {
		// 1) Carga inicial ONLINE y espera a que el SW quede activo y precacheado.
		await page.goto('/');
		await expect(page.getByRole('button', { name: /Fichar entrada/i })).toBeVisible();

		await page.waitForFunction(async () => {
			if (!navigator.serviceWorker) return false;
			const reg = await navigator.serviceWorker.getRegistration();
			return !!reg?.active;
		});
		// Da un margen para que precacheAndRoute termine de descargar el shell.
		await page.waitForTimeout(1500);

		// 2) OFFLINE + recarga en frío: sin SW/precache esto daría el error de red.
		await context.setOffline(true);
		await page.reload();
		await expect(page.getByRole('button', { name: /Fichar entrada/i })).toBeVisible();

		// 3) Navegación directa a otra ruta estando offline (fallback SPA).
		await page.goto('/historial');
		await expect(page.getByRole('heading', { name: 'Historial' })).toBeVisible();

		await context.setOffline(false);
	});
});
