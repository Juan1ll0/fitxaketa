import { describe, it, expect } from 'vitest';
import {
	settingsActual,
	settingsVigente,
	historicoCampo,
	horasDiarias,
	objetivoDiarioMinutos
} from '$lib/utils/settings';
import type { Settings } from '$lib/db';

function snap(fecha: Date, over: Partial<Settings> = {}): Settings {
	return {
		fecha,
		primer_dia_semana: 1,
		min_jornada_minutos: 0,
		horas_semanales: 40,
		dias_laborables: 5,
		redondeo_minutos: 0,
		...over
	};
}

describe('settings utils', () => {
	it('settingsActual devuelve el snapshot más reciente (aunque el input esté desordenado)', () => {
		const s = [snap(new Date(2026, 0, 1)), snap(new Date(2026, 5, 1)), snap(new Date(2026, 2, 1))];
		expect(settingsActual(s).fecha.getTime()).toBe(new Date(2026, 5, 1).getTime());
	});

	it('settingsActual devuelve config por defecto si no hay snapshots', () => {
		expect(settingsActual([]).primer_dia_semana).toBe(1);
	});

	it('settingsVigente devuelve el de mayor fecha ≤ la dada', () => {
		const s = [snap(new Date(2026, 0, 1)), snap(new Date(2026, 5, 1))];
		expect(settingsVigente(s, new Date(2026, 3, 15)).fecha.getTime()).toBe(
			new Date(2026, 0, 1).getTime()
		);
	});

	it('settingsVigente hace fallback al más antiguo si todos son posteriores', () => {
		const s = [snap(new Date(2026, 5, 1)), snap(new Date(2026, 8, 1))];
		expect(settingsVigente(s, new Date(2026, 0, 1)).fecha.getTime()).toBe(
			new Date(2026, 5, 1).getTime()
		);
	});

	it('historicoCampo colapsa valores iguales consecutivos', () => {
		const s = [
			snap(new Date(2026, 0, 1), { horas_semanales: 40 }),
			snap(new Date(2026, 1, 1), { horas_semanales: 40 }),
			snap(new Date(2026, 2, 1), { horas_semanales: 35 })
		];
		const hist = historicoCampo(s, 'horas_semanales');
		expect(hist).toHaveLength(2);
		expect(hist[0].valor).toBe(40);
		expect(hist[1].valor).toBe(35);
	});

	it('horasDiarias deriva semanales/días; 0 si días 0', () => {
		expect(horasDiarias(snap(new Date(), { horas_semanales: 40, dias_laborables: 5 }))).toBe(8);
		expect(horasDiarias(snap(new Date(), { dias_laborables: 0 }))).toBe(0);
	});

	it('objetivoDiarioMinutos usa el vigente; 0 sin contrato', () => {
		const conContrato = [snap(new Date(2026, 0, 1), { horas_semanales: 40, dias_laborables: 5 })];
		expect(objetivoDiarioMinutos(conContrato, new Date(2026, 5, 1))).toBe(480);
		const sinContrato = [snap(new Date(2026, 0, 1), { horas_semanales: 0 })];
		expect(objetivoDiarioMinutos(sinContrato, new Date(2026, 5, 1))).toBe(0);
	});
});
