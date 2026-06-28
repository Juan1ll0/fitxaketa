<script lang="ts">
	import { subscribe, getSettings, guardarSettings } from '$lib/stores/app-state';
	import { settingsActual } from '$lib/utils/settings';
	import type { Settings } from '$lib/db';
	import AccionesConfig from '$lib/components/AccionesConfig.svelte';

	let snapshots = $state<Settings[]>(getSettings());
	let seeded = false;

	let primerDia = $state(1);
	let minJornada = $state(0);
	let horasSemanales = $state(0);
	let diasLaborables = $state(5);
	let redondeoMin = $state(0);
	let estado = $state<'idle' | 'loading' | 'error'>('idle');

	let horasDiarias = $derived(diasLaborables > 0 ? horasSemanales / diasLaborables : 0);

	const dias = [
		{ v: 1, l: 'Lunes' },
		{ v: 2, l: 'Martes' },
		{ v: 3, l: 'Miércoles' },
		{ v: 4, l: 'Jueves' },
		{ v: 5, l: 'Viernes' },
		{ v: 6, l: 'Sábado' },
		{ v: 0, l: 'Domingo' }
	];

	$effect(() => {
		const unsubscribe = subscribe(() => {
			snapshots = getSettings();
		});
		return unsubscribe;
	});

	$effect(() => {
		if (seeded || snapshots.length === 0) return;
		const s = settingsActual(snapshots);
		primerDia = s.primer_dia_semana;
		minJornada = s.min_jornada_minutos;
		horasSemanales = s.horas_semanales;
		diasLaborables = s.dias_laborables;
		redondeoMin = s.redondeo_minutos;
		seeded = true;
	});

	async function guardar() {
		estado = 'loading';
		try {
			await guardarSettings({
				fecha: new Date(),
				primer_dia_semana: primerDia,
				min_jornada_minutos: minJornada,
				horas_semanales: horasSemanales,
				dias_laborables: diasLaborables,
				redondeo_minutos: redondeoMin
			});
			estado = 'idle';
		} catch {
			estado = 'error';
		}
	}

	const inputCls = 'mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text';
	const cardCls = 'rounded-xl bg-surface-light p-4';
</script>

<svelte:head><title>Configuración - Fitxaketa</title></svelte:head>

<div class="min-h-screen bg-surface px-4 py-4">
	<div class="mx-auto max-w-2xl">
		<h1 class="text-2xl font-bold text-text">Configuración</h1>

		<div class="mt-4 flex flex-col gap-3 {cardCls}">
			<label class="block">
				<span class="text-sm text-text-muted">Primer día de la semana</span>
				<select bind:value={primerDia} class={inputCls}>
					{#each dias as d (d.v)}<option value={d.v}>{d.l}</option>{/each}
				</select>
			</label>

			<label class="block">
				<span class="text-sm text-text-muted">Tiempo mínimo de jornada (min, 0 = desactivado)</span>
				<input type="number" min="0" bind:value={minJornada} class={inputCls} />
			</label>

			<div class="grid grid-cols-2 gap-3">
				<label class="block">
					<span class="text-sm text-text-muted">Horas semanales</span>
					<input type="number" min="0" step="0.5" bind:value={horasSemanales} class={inputCls} />
				</label>
				<label class="block">
					<span class="text-sm text-text-muted">Días laborables</span>
					<input type="number" min="1" max="7" bind:value={diasLaborables} class={inputCls} />
				</label>
			</div>
			<p class="text-sm text-text-muted">
				Horas diarias (derivado): <span class="font-semibold text-text"
					>{horasDiarias.toFixed(2)}h</span
				>
			</p>

			<label class="block">
				<span class="text-sm text-text-muted">Redondeo de la duración (min, 0 = desactivado)</span>
				<input type="number" min="0" bind:value={redondeoMin} class={inputCls} />
			</label>

			<button
				type="button"
				onclick={guardar}
				disabled={estado === 'loading'}
				class="mt-1 rounded-lg bg-primary px-4 py-2 font-medium text-white disabled:opacity-60"
			>
				{estado === 'loading' ? 'Guardando…' : 'Guardar'}
			</button>
			{#if estado === 'error'}
				<p class="text-sm text-danger" aria-live="polite">
					No se pudo guardar. Inténtalo de nuevo.
				</p>
			{/if}
		</div>

		<AccionesConfig />
	</div>
</div>
