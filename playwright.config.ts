import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	outputDir: './e2e/results',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [['html', { outputFolder: './e2e/report' }]],
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		serviceWorkers: 'block'
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
		// WebKit (motor de Safari/iOS) solo en CI: en distros rolling como Arch/CachyOS
		// faltan las librerías de ABI antigua que pide el WebKit de Playwright y
		// `playwright install-deps` usa apt, que no existe aquí. En CI (Ubuntu) sí funciona.
		...(process.env.CI ? [{ name: 'webkit', use: { ...devices['Desktop Safari'] } }] : [])
	],
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		// Fuerza http en el preview (los certs locales activarían https y romperían
		// la baseURL http de arriba). Ver `E2E_HTTP` en vite.config.ts.
		env: { E2E_HTTP: '1' }
	}
});
