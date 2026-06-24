/**
 * Scaffold de widgets configurables del dashboard (spec 003.8).
 *
 * Describe el orden y la variante de cada bloque de la pantalla principal.
 * En esta spec el registro es **estático** (combinación cerrada A1/B1/C1/D1/E4);
 * en el futuro lo sustituirá una preferencia del usuario (Settings/IndexedDB),
 * sin reescribir `+page.svelte`. El mapa `variante → componente` vive en la
 * página para no acoplar este módulo de utils con componentes Svelte.
 */

type SlotId = 'cabecera' | 'cronometro' | 'estado' | 'resumen' | 'contexto';

export interface DashboardSlot {
	id: SlotId;
	variante: string;
	visible: boolean;
}

/** Configuración por defecto y única en esta spec. */
export const dashboardLayoutPorDefecto: DashboardSlot[] = [
	{ id: 'cabecera', variante: 'A1', visible: true },
	{ id: 'cronometro', variante: 'B1', visible: true },
	{ id: 'estado', variante: 'C1', visible: true },
	{ id: 'resumen', variante: 'D1', visible: true },
	{ id: 'contexto', variante: 'E4', visible: true }
];
