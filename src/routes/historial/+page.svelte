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
	import ExportConfirmModal from '$lib/components/ExportConfirmModal.svelte';
	import { exportarJornadas, describirPeriodo } from '$lib/utils/historial-export';

	let jornadas = $state<Jornada[]>([]);
	let settings = $state<Settings[]>([]);
	let filtroTemporal = $state<FiltroTemporal>({
		tipo: 'periodo',
		periodo: 'mes',
		fechaReferencia: new Date()
	});
	let filtroEstado = $state<FiltroEstado>('cerradas');
	let mostrarModal = $state(false);

	let primerDia = $derived(settingsActual(settings).primer_dia_semana);
	let jornadasTemporal = $derived(aplicarFiltroTemporal(jornadas, filtroTemporal, primerDia));
	let jornadasFiltradas = $derived(filtrarPorEstado(jornadasTemporal, filtroEstado));
	let grupos = $derived(agruparPorDia(jornadasFiltradas));
	let hayCerradas = $derived(jornadasFiltradas.some((j) => j.status === 'closed'));

	$effect(() => {
		const unsubscribe = subscribe(() => {
			jornadas = getJornadas();
			settings = getSettings();
		});
		return unsubscribe;
	});

	afterNavigate(async () => {
		filtroTemporal = { tipo: 'periodo', periodo: 'mes', fechaReferencia: new Date() };
		filtroEstado = 'cerradas';
		await cargarJornadas();
	});

	function handleExportar(): void {
		mostrarModal = true;
	}

	async function confirmarExportacion(): Promise<void> {
		await exportarJornadas({
			jornadas: jornadasFiltradas,
			snapshots: settings,
			filtro: filtroTemporal
		});
		mostrarModal = false;
	}

	function cancelarExportacion(): void {
		mostrarModal = false;
	}
</script>

<svelte:head>
	<title>Historial - Fitxaketa</title>
</svelte:head>

<div class="min-h-screen bg-surface px-4 py-4">
	<div class="mx-auto max-w-lg">
		<div class="flex items-center justify-between gap-2">
			<h1 class="text-2xl font-bold text-text">Historial</h1>
			<button
				type="button"
				onclick={handleExportar}
				disabled={!hayCerradas}
				class="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-light disabled:cursor-not-allowed disabled:opacity-50"
			>
				<svg
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="7 10 12 15 17 10" />
					<line x1="12" y1="15" x2="12" y2="3" />
				</svg>
				Exportar
			</button>
		</div>

		<div class="mt-4">
			<HistorialFiltros bind:filtroTemporal bind:filtroEstado {primerDia} />
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

{#if mostrarModal}
	<ExportConfirmModal
		periodo={describirPeriodo(filtroTemporal, primerDia)}
		onConfirm={confirmarExportacion}
		onCancel={cancelarExportacion}
	/>
{/if}
