import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';
import type { ManifestTransform } from 'workbox-build';

// HTTPS local opcional (mkcert) para probar la PWA en dispositivos físicos (iOS exige
// contexto seguro para service worker / instalación). Solo se activa si existen los
// certs en certs/ (gitignored); sin ellos, dev/preview siguen sirviendo por http.
// `E2E_HTTP` (lo activa Playwright en su webServer) fuerza http aunque existan los
// certs locales, para que los tests e2e usen el mismo http que CI (sin certs) y no
// fallen por el desajuste http/https.
const https =
	!process.env.E2E_HTTP && existsSync('certs/dev-key.pem') && existsSync('certs/dev.pem')
		? { key: readFileSync('certs/dev-key.pem'), cert: readFileSync('certs/dev.pem') }
		: undefined;

// Librerías cargadas bajo demanda que NO se precachean: solo la pesada de export a
// Excel (write-excel-file), que es de uso ocasional. Chart.js (gráfica de Estadísticas,
// pestaña principal) SÍ se precachea para que funcione offline y no dependa de un fetch
// en runtime — su exclusión provocaba que la gráfica saliera en blanco.
const LIBS_FUERA_DEL_PRECACHE = [/write-excel-file/];

/**
 * Transformador de manifest de Workbox que (1) excluye del precache los chunks
 * dinámicos pesados de uso ocasional (ver `LIBS_FUERA_DEL_PRECACHE`) y (2) reescribe
 * las URLs internas del build (`client/…`, `prerendered/pages/…`) a sus rutas públicas.
 * Esta reescritura es la que hace vite-pwa por defecto, pero al proveer
 * `manifestTransforms` propios se reemplaza; sin ella, `precacheAndRoute` intentaría
 * cachear rutas inexistentes (`/client/…`) y el offline no funcionaría.
 */
function ajustesPrecache(): ManifestTransform {
	return async (entradas) => {
		const rutaManifest = path.resolve('.svelte-kit/output/client/.vite/manifest.json');
		const dinamicos = new Set<string>();
		if (existsSync(rutaManifest)) {
			const viteManifest = JSON.parse(readFileSync(rutaManifest, 'utf8')) as Record<
				string,
				{ file?: string; src?: string; isDynamicEntry?: boolean }
			>;
			for (const entrada of Object.values(viteManifest)) {
				const esPesada = LIBS_FUERA_DEL_PRECACHE.some((re) => re.test(entrada.src ?? ''));
				if (entrada.isDynamicEntry && entrada.file && esPesada) dinamicos.add(entrada.file);
			}
		}
		const manifest = entradas
			.filter((entrada) => !dinamicos.has(entrada.url.replace(/^client\//, '')))
			.map((entrada) => {
				const pagina = entrada.url.match(/^prerendered\/pages\/(.+)\.html$/);
				if (pagina) {
					return { ...entrada, url: pagina[1] === 'index' ? '/' : `/${pagina[1]}` };
				}
				return { ...entrada, url: `/${entrada.url.replace(/^client\//, '')}` };
			});
		return { manifest, warnings: [] };
	};
}

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
			// App 100% cliente (todas las rutas ssr=false, datos en IndexedDB) → sitio
			// estático con fallback SPA. El fallback (200.html) es el shell que el
			// service worker precachea para que la PWA cargue offline en frío.
			adapter: adapter({ fallback: '200.html' }),
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
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,webmanifest,html}'],
				manifestTransforms: [ajustesPrecache()]
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
