import { describe, it, expect } from 'vitest';
import { objetivoYBalancePorLabel } from '$lib/utils/dashboard-grafica-objetivo';
import { prepararDatosGrafica } from '$lib/utils/dashboard-grafica';
import { claveDia } from '$lib/utils/fecha-negocio';
import type { Jornada, Settings } from '$lib/db';

// Contrato 8h/día hasta el 16-jun, 7h/día desde el 16-jun (cambio a mitad).
const contratos: Settings[] = [
	base(new Date(2000, 0, 1), 40, 5),
	base(new Date(2026, 5, 16), 35, 5)
];

function base(fecha: Date, semanales: number, dias: number): Settings {
	return {
		fecha,
		primer_dia_semana: 1,
		min_jornada_minutos: 0,
		horas_semanales: semanales,
		dias_laborables: dias,
		redondeo_minutos: 0,
		redondeo_aplicar_a: 'ambas'
	};
}

function jornada(day: number, horas: number): Jornada {
	return {
		id: day,
		start_time: new Date(2026, 5, day, 9, 0),
		end_time: new Date(2026, 5, day, 9 + horas, 0),
		lat_start: null,
		lng_start: null,
		lat_end: null,
		lng_end: null,
		duration: horas * 60,
		status: 'closed',
		synced: 1
	};
}

describe('dashboard-grafica objetivo/balance por día', () => {
	it('objetivo escalonado (8h→7h) y balance por día con el objetivo vigente', () => {
		const d15 = claveDia(new Date(2026, 5, 15));
		const d20 = claveDia(new Date(2026, 5, 20));
		const diasUnicos = [d15, d20];
		const fechasPorDia = new Map([
			[d15, new Date(2026, 5, 15)],
			[d20, new Date(2026, 5, 20)]
		]);
		const jornadasPorDia = new Map([
			[d15, [jornada(15, 9)]], // objetivo 8h → +1h
			[d20, [jornada(20, 7)]] // objetivo 7h → 0
		]);

		const { objetivoDiarioPorLabel, balancePorLabel } = objetivoYBalancePorLabel(
			diasUnicos,
			fechasPorDia,
			jornadasPorDia,
			contratos
		);

		expect(objetivoDiarioPorLabel).toEqual([8, 7]); // escalón
		expect(balancePorLabel).toEqual([60, 0]);
	});

	it('vista año no calcula objetivo/balance por label', () => {
		const datos = prepararDatosGrafica([jornada(15, 8)], 'año', contratos);
		expect(datos.objetivoDiarioPorLabel).toBeUndefined();
		expect(datos.balancePorLabel).toBeUndefined();
	});
});
