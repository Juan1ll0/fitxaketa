import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

// HTTPS local opcional (mkcert) para probar la PWA en dispositivos físicos (iOS exige
// contexto seguro para service worker / instalación). Solo se activa si existen los
// certs en certs/ (gitignored); sin ellos, dev/preview siguen sirviendo por http.
const https =
	existsSync('certs/dev-key.pem') && existsSync('certs/dev.pem')
		? { key: readFileSync('certs/dev-key.pem'), cert: readFileSync('certs/dev.pem') }
		: undefined;

export default defineConfig({
	server: {
		host: true,
		https,
		fs: {
			// Permite servir el node_modules compartido al correr desde un git
			// worktree (.claude/worktrees/*): el runtime de SvelteKit vive en la
			// raíz del repo y queda fuera del allow-list por defecto de Vite.
			allow: [fileURLToPath(new URL('../../../', import.meta.url))]
		}
	},
	preview: { host: true, https },
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			serviceWorker: {
				register: false
			}
		}),
		SvelteKitPWA({
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'service-worker.ts',
			registerType: 'autoUpdate',
			manifest: {
				name: 'Fitxaketa',
				short_name: 'Fitxaketa',
				description: 'Registro de jornada laboral',
				theme_color: '#0f172a',
				background_color: '#0f172a',
				display: 'standalone',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					},
					{
						src: '/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			injectManifest: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,webmanifest}']
			},
			devOptions: {
				enabled: true,
				type: 'module',
				navigateFallback: '/'
			}
		})
	],
	define: {
		'process.env.NODE_ENV': process.env.NODE_ENV === 'production' ? '"production"' : '"development"'
	}
});
