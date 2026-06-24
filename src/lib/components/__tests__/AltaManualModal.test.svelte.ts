import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import type { Jornada } from '$lib/db';
import AltaManualModal from '../AltaManualModal.svelte';

const mocks = vi.hoisted(() => ({
	agregarJornadaManual: vi.fn().mockResolvedValue(undefined),
	getJornadas: vi.fn(() => [] as unknown[])
}));

vi.mock('$lib/stores/app-state', () => ({
	agregarJornadaManual: mocks.agregarJornadaManual,
	getJornadas: mocks.getJornadas
}));

function jornada(start: Date, end: Date): Jornada {
	return {
		id: 1,
		start_time: start,
		end_time: end,
		lat_start: null,
		lng_start: null,
		lat_end: null,
		lng_end: null,
		duration: Math.floor((end.getTime() - start.getTime()) / 60000),
		status: 'closed',
		synced: 0
	};
}

async function rellenar(fecha: string, inicio: string, fin: string): Promise<void> {
	await fireEvent.input(screen.getByLabelText('Fecha'), { target: { value: fecha } });
	await fireEvent.input(screen.getByLabelText('Inicio'), { target: { value: inicio } });
	await fireEvent.input(screen.getByLabelText('Fin'), { target: { value: fin } });
}

describe('AltaManualModal', () => {
	beforeEach(() => vi.clearAllMocks());
	afterEach(() => cleanup());

	it('Guardar persiste la jornada y cierra la modal', async () => {
		const onClose = vi.fn();
		render(AltaManualModal, { open: false, onClose, minJornadaMinutos: 0 });

		await rellenar('2020-01-02', '09:00', '13:00');
		await fireEvent.click(screen.getByRole('button', { name: 'Guardar', hidden: true }));

		await waitFor(() => expect(mocks.agregarJornadaManual).toHaveBeenCalledTimes(1));
		const [start, end] = mocks.agregarJornadaManual.mock.calls[0];
		expect(start.getHours()).toBe(9);
		expect(end.getHours()).toBe(13);
		expect(onClose).toHaveBeenCalled();
	});

	it('Guardar y añadir otra persiste sin cerrar y limpia las horas', async () => {
		const onClose = vi.fn();
		render(AltaManualModal, { open: false, onClose, minJornadaMinutos: 0 });

		await rellenar('2020-01-02', '09:00', '13:00');
		await fireEvent.click(
			screen.getByRole('button', { name: 'Guardar y añadir otra', hidden: true })
		);

		await waitFor(() => expect(mocks.agregarJornadaManual).toHaveBeenCalledTimes(1));
		expect(onClose).not.toHaveBeenCalled();
		expect(screen.getByLabelText('Inicio')).toHaveValue('');
		expect(screen.getByLabelText('Fin')).toHaveValue('');
		expect(screen.getByLabelText('Fecha')).toHaveValue('2020-01-02');
	});

	it('bloquea y muestra error si fin <= inicio', async () => {
		const onClose = vi.fn();
		render(AltaManualModal, { open: false, onClose, minJornadaMinutos: 0 });

		await rellenar('2020-01-02', '13:00', '09:00');
		await fireEvent.click(screen.getByRole('button', { name: 'Guardar', hidden: true }));

		await waitFor(() => expect(screen.getByRole('alert', { hidden: true })).toBeInTheDocument());
		expect(mocks.agregarJornadaManual).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});

	it('con "Termina al día siguiente" guarda la salida en la fecha+1', async () => {
		render(AltaManualModal, { open: false, onClose: vi.fn(), minJornadaMinutos: 0 });

		await rellenar('2020-01-02', '23:00', '02:00');
		await fireEvent.click(screen.getByLabelText('Termina al día siguiente'));
		await fireEvent.click(screen.getByRole('button', { name: 'Guardar', hidden: true }));

		await waitFor(() => expect(mocks.agregarJornadaManual).toHaveBeenCalledTimes(1));
		const [start, end] = mocks.agregarJornadaManual.mock.calls[0];
		expect(start.getDate()).toBe(2);
		expect(end.getDate()).toBe(3);
		expect((end.getTime() - start.getTime()) / 3600000).toBe(3);
	});

	it('bloquea el alta que se solapa con una jornada existente', async () => {
		mocks.getJornadas.mockReturnValueOnce([
			jornada(new Date(2020, 0, 2, 9, 0), new Date(2020, 0, 2, 13, 0))
		]);
		const onClose = vi.fn();
		render(AltaManualModal, { open: false, onClose, minJornadaMinutos: 0 });

		await rellenar('2020-01-02', '10:00', '12:00');
		await fireEvent.click(screen.getByRole('button', { name: 'Guardar', hidden: true }));

		await waitFor(() =>
			expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent(/solapa/i)
		);
		expect(mocks.agregarJornadaManual).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});
});
