import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default ts.config(
	{
		ignores: [
			'node_modules/',
			'.svelte-kit/',
			'build/',
			'dist/',
			'dev-dist/',
			'coverage/',
			'e2e/report/',
			'e2e/results/'
		]
	},

	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,

	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: { parser: ts.parser }
		},
		rules: {
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		files: ['src/**/*.svelte.ts'],
		languageOptions: {
			parser: ts.parser
		}
	},

	// Marcadores de calidad mecánicos — ver .agents/skills/coding-standards.md
	// Estos límites son gates: el lint falla, no se negocia con el agente.
	{
		rules: {
			complexity: ['error', 10],
			'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
			'max-depth': ['error', 3],
			'max-params': ['error', 4],
			'@typescript-eslint/no-explicit-any': 'error'
		}
	},
	{
		files: ['src/**/*.ts'],
		rules: {
			'max-lines': ['error', { max: 120, skipBlankLines: true, skipComments: true }]
		}
	},
	{
		files: ['**/*.svelte'],
		rules: {
			'max-lines': ['error', { max: 150, skipBlankLines: true, skipComments: true }]
		}
	},

	// Google Apps Script — sin módulos, globals propios, entrypoints "sin usar"
	{
		files: ['gas/**/*.js', 'gas/**/*.gs'],
		languageOptions: {
			sourceType: 'script',
			globals: {
				SpreadsheetApp: 'readonly',
				ContentService: 'readonly',
				PropertiesService: 'readonly',
				ScriptApp: 'readonly',
				Logger: 'readonly',
				Utilities: 'readonly',
				console: 'readonly'
			}
		},
		rules: {
			'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
			'no-unused-vars': ['error', { varsIgnorePattern: '^(doGet|doPost|CONFIG)$' }],
			'@typescript-eslint/no-unused-vars': 'off'
		}
	},

	// Tests — permitir globals de Vitest y Playwright
	{
		files: ['src/**/*.test.ts', 'src/**/*.test.svelte.ts', 'e2e/**/*.ts'],
		languageOptions: {
			globals: {
				describe: 'readonly',
				it: 'readonly',
				expect: 'readonly',
				beforeEach: 'readonly',
				afterEach: 'readonly',
				beforeAll: 'readonly',
				afterAll: 'readonly',
				vi: 'readonly',
				test: 'readonly'
			}
		},
		rules: {
			'max-lines': 'off',
			'max-lines-per-function': 'off',
			'@typescript-eslint/no-explicit-any': 'warn'
		}
	},

	// Desactiva reglas de formato que chocan con Prettier — debe ir el último
	prettier
);
