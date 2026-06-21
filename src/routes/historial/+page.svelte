<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { cargarJornadas, subscribe, getJornadas } from '$lib/stores/app-state';
	import { agruparPorDia } from '$lib/utils/dashboard';
	import DiaGroup from '$lib/components/DiaGroup.svelte';
	import type { Jornada } from '$lib/db';

	let jornadas = $state<Jornada[]>([]);
	let cargando = $state(true);

	let grupos = $derived(agruparPorDia(jornadas));

	$effect(() => {
		const unsubscribe = subscribe(() => {
			jornadas = getJornadas();
		});
		return unsubscribe;
	});

	afterNavigate(async () => {
		cargando = true;
		await cargarJornadas();
		cargando = false;
	});
</script>

<svelte:head>
	<title>Historial - Fitxaketa</title>
</svelte:head>

<div class="min-h-screen bg-surface px-4 py-4">
	<div class="mx-auto max-w-lg">
		{#if cargando}
			<p class="py-8 text-center text-text-muted">Cargando...</p>
		{:else if grupos.size === 0}
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
		{:else}
			{#each [...grupos.entries()] as [fecha, lista] (fecha)}
				<DiaGroup {fecha} jornadas={lista} />
			{/each}
		{/if}
	</div>
</div>
