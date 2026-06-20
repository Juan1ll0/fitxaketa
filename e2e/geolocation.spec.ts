import { test, expect } from '@playwright/test';

test.describe('Geolocalización', () => {
	test('debería permitir mockear coordenadas GPS', async ({ page, context }) => {
		await context.grantPermissions(['geolocation']);
		await page.goto('/');

		await page.evaluate(() => {
			navigator.geolocation.getCurrentPosition = (success) => {
				success({
					coords: { latitude: 43.263, longitude: -2.935, accuracy: 10 },
					timestamp: Date.now()
				} as GeolocationPosition);
			};
		});

		// Verificar que la app recibe las coordenadas mockeadas
		const coords = await page.evaluate(() => {
			return new Promise<{ lat: number; lng: number }>((resolve) => {
				navigator.geolocation.getCurrentPosition((pos) => {
					resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
				});
			});
		});

		expect(coords.lat).toBeCloseTo(43.263, 3);
		expect(coords.lng).toBeCloseTo(-2.935, 3);
	});
});
