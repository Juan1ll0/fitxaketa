import { describe, it, expect } from 'vitest';
import { dashboardLayoutPorDefecto } from '$lib/utils/dashboard-layout';

describe('dashboardLayoutPorDefecto', () => {
	it('define los 5 slots en orden con las variantes cerradas y visibles', () => {
		expect(dashboardLayoutPorDefecto).toEqual([
			{ id: 'cabecera', variante: 'A1', visible: true },
			{ id: 'cronometro', variante: 'B1', visible: true },
			{ id: 'estado', variante: 'C1', visible: true },
			{ id: 'resumen', variante: 'D1', visible: true },
			{ id: 'contexto', variante: 'E4', visible: true }
		]);
	});
});
