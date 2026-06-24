<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { subscribe, getJornadas, getSettings, cargarJornadas } from '$lib/stores/app-state';
	import { settingsActual } from '$lib/utils/settings';
	import type { Jornada, Settings } from '$lib/db';
	import type { FiltroTemporal, FiltroEstado } from '$lib/utils/historial-filtros';
	import { aplicarFiltroTemporal, filtrarPorEstado } from '$lib/utils/historial-filtros';
	import { agruparPorDia } from '$lib/utils/dashboard';
	import HistorialFiltros from '$lib/components/HistorialFiltros.svelte';
	import DiaGroup from '$lib/components/DiaGroup.svelte';
	import { exportarJornadas } from '$lib/utils/historial-export';

	let jornadas = $state<Jornada[]>([]);
	let settings = $state<Settings[]>([]);
	let filtroTemporal = $state<FiltroTemporal>({
		tipo: 'periodo',
		periodo: 'mes',
		fechaReferencia: new Date()
	});
	let filtroEstado = $state<FiltroEstado>('todas');
	let mostrarAvisoExport = $state(false);

	let primerDia = $derived(settingsActual(settings).primer_dia_semana);
	let jornadasTemporal = $derived(aplicarFiltroTemporal(jornadas, filtroTemporal, primerDia));
	let jornadasFiltradas = $derived(filtrarPorEstado(jornadasTemporal, filtroEstado));
	let grupos = $derived(agruparPorDia(jornadasFiltradas));

	$effect(() => {
		const unsubscribe = subscribe(() => {
			jornadas = getJornadas();
			settings = getSettings();
		});
		return unsubscribe;
	});

	afterNavigate(async () => {
		filtroTemporal = { tipo: 'periodo', periodo: 'mes', fechaReferencia: new Date() };
		filtroEstado = 'todas';
		await cargarJornadas();
	});

	function handleExportar(): void {
		exportarJornadas(jornadasFiltradas);
		mostrarAvisoExport = true;
		setTimeout(() => (mostrarAvisoExport = false), 3000);
	}
</script>

<svelte:head>
	<title>Historial - Fitxaketa</title>
</svelte:head>

<div class="min-h-screen bg-surface px-4 py-4">
	<div class="mx-auto max-w-lg">
		<h1 class="text-2xl font-bold text-text">Historial</h1>

		<div class="mt-4">
			<HistorialFiltros
				bind:filtroTemporal
				bind:filtroEstado
				{primerDia}
				onExportar={handleExportar}
			/>
			{#if mostrarAvisoExport}
				<p
					class="mt-2 rounded-lg bg-primary/10 px-4 py-2 text-sm text-primary"
					role="status"
					aria-live="polite"
				>
					Exportación próximamente disponible
				</p>
			{/if}
		</div>

		{#if jornadas.length === 0}
			<div class="py-16 text-center">
				<p class="mb-4 text-4xl">📋</p>
				<p class="text-lg text-text-muted">Aún no hay fichajes registrados</p>
				<a
					href="/"
					class="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-white transition hover:bg-primary/90"
				>
					Fichar ahora
				</a>
			</div>
		{:else if grupos.size === 0}
			<p class="py-12 text-center text-text-muted">No hay fichajes para este filtro</p>
		{:else}
			<div class="mt-6">
				{#each [...grupos.entries()] as [fecha, lista] (fecha)}
					<DiaGroup {fecha} jornadas={lista} snapshots={settings} />
				{/each}
			</div>
		{/if}
	</div>
</div>
