<script lang="ts">
	import { prepararAltaManual } from '$lib/utils/alta-manual';
	import { agregarJornadaManual, getJornadas } from '$lib/stores/app-state';

	let {
		open,
		onClose,
		minJornadaMinutos
	}: {
		open: boolean;
		onClose: () => void;
		minJornadaMinutos: number;
	} = $props();

	function isoLocal(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	const hoyISO = isoLocal(new Date());

	let dialogEl: HTMLDialogElement;
	let primerInput: HTMLInputElement | undefined = $state();
	let fecha = $state(hoyISO);
	let horaInicio = $state('');
	let horaFin = $state('');
	let diaSiguiente = $state(false);
	let error = $state('');
	let exito = $state(false);

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) dialogEl.showModal();
		else if (!open && dialogEl.open) dialogEl.close();
	});

	async function guardar(continuar: boolean): Promise<void> {
		error = '';
		const r = prepararAltaManual({
			fechaStr: fecha,
			horaInicio,
			horaFin,
			diaSiguiente,
			minJornadaMinutos,
			jornadas: getJornadas()
		});
		if ('error' in r) {
			error = r.error;
			return;
		}
		await agregarJornadaManual(r.start, r.end);
		exito = true;
		setTimeout(() => (exito = false), 2500);
		if (continuar) {
			horaInicio = '';
			horaFin = '';
			diaSiguiente = false;
			primerInput?.focus();
		} else {
			onClose();
		}
	}
</script>

<dialog
	bind:this={dialogEl}
	onclose={onClose}
	class="w-[min(92vw,24rem)] rounded-2xl border border-border bg-surface p-0 text-text backdrop:bg-black/60"
>
	<form method="dialog" class="flex flex-col gap-4 p-5" onsubmit={(e) => e.preventDefault()}>
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold">Añadir fichaje</h2>
			<button
				type="button"
				onclick={onClose}
				aria-label="Cerrar"
				class="text-text-muted hover:text-text">✕</button
			>
		</div>

		<label class="flex flex-col gap-1 text-sm">
			<span class="text-text-muted">Fecha</span>
			<input
				bind:this={primerInput}
				type="date"
				bind:value={fecha}
				max={hoyISO}
				required
				class="rounded-lg border border-border bg-surface-light px-3 py-2 text-text"
			/>
		</label>

		<div class="flex gap-3">
			<label class="flex flex-1 flex-col gap-1 text-sm">
				<span class="text-text-muted">Inicio</span>
				<input
					type="time"
					bind:value={horaInicio}
					required
					class="rounded-lg border border-border bg-surface-light px-3 py-2 text-text"
				/>
			</label>
			<label class="flex flex-1 flex-col gap-1 text-sm">
				<span class="text-text-muted">Fin</span>
				<input
					type="time"
					bind:value={horaFin}
					required
					class="rounded-lg border border-border bg-surface-light px-3 py-2 text-text"
				/>
			</label>
		</div>

		<label class="flex items-center gap-2 text-sm text-text-muted">
			<input type="checkbox" bind:checked={diaSiguiente} class="h-4 w-4" />
			Termina al día siguiente
		</label>

		{#if error}
			<p role="alert" class="text-sm text-danger">{error}</p>
		{/if}
		{#if exito}
			<p role="status" aria-live="polite" class="text-sm text-success">Fichaje añadido</p>
		{/if}

		<div class="mt-1 flex flex-col gap-2">
			<button
				type="button"
				onclick={() => guardar(false)}
				class="min-h-11 rounded-xl bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-dark"
			>
				Guardar
			</button>
			<button
				type="button"
				onclick={() => guardar(true)}
				class="min-h-11 rounded-xl border border-border px-4 py-2 font-medium text-text hover:bg-surface-light"
			>
				Guardar y añadir otra
			</button>
			<button
				type="button"
				onclick={onClose}
				class="min-h-11 rounded-xl px-4 py-2 text-text-muted hover:text-text"
			>
				Cancelar
			</button>
		</div>
	</form>
</dialog>
