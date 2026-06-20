/**
 * Reglas de arquitectura mecánicas — la versión verificable de la
 * separación de capas de .agents/skills/coding-standards.md.
 *
 * Limitación: dependency-cruiser parsea .ts/.js, no el interior de .svelte.
 * Las reglas cubren la capa de lógica (la crítica); lo que importan los
 * componentes lo revisa el architect.
 */
module.exports = {
	forbidden: [
		{
			name: 'no-circular',
			severity: 'error',
			comment: 'Dependencias circulares prohibidas',
			from: {},
			to: { circular: true }
		},
		{
			name: 'utils-son-puras',
			severity: 'error',
			comment:
				'src/lib/utils/ es la capa pura: no puede importar de capas con side effects (componentes, stores, services, db, service worker, rutas)',
			from: { path: '^src/lib/utils' },
			to: {
				path: '^src/(lib/(components|stores|services|db)|routes|service-worker)'
			}
		},
		{
			name: 'services-sin-ui',
			severity: 'error',
			comment: 'La capa de servicios no conoce la UI (componentes ni rutas)',
			from: { path: '^src/lib/services' },
			to: { path: '^src/(lib/components|routes)' }
		},
		{
			name: 'lib-no-importa-rutas',
			severity: 'error',
			comment: 'src/lib/ es reutilizable: nunca importa desde src/routes/',
			from: { path: '^src/lib' },
			to: { path: '^src/routes' }
		}
	],
	options: {
		doNotFollow: { path: 'node_modules' },
		tsConfig: { fileName: 'tsconfig.json' },
		exclude: { path: '\\.svelte-kit|node_modules' }
	}
};
