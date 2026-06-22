<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		startJornada,
		stopJornada,
		subscribe,
		getClockedIn,
		getElapsed,
		getJornadasHoy,
		getResumenHoy
	} from '$lib/stores/app-state';
	import { formatearFecha, type ResumenDia } from '$lib/utils/dashboard';
	import type { Jornada } from '$lib/db';

	let clockedIn = $state(false);
	let elapsed = $state('00:00:00');
	let hoy = $state('');
	let jornadasHoy = $state<Jornada[]>([]);
	let resumen = $state<ResumenDia>({ totalHoras: 0, totalJornadas: 0 });

	let unsubscribe: (() => void) | null = null;
	let fechaInterval: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		// initAppState lo dispara el layout (común a todas las rutas).
		hoy = formatearFecha(new Date());

		unsubscribe = subscribe(() => {
			clockedIn = getClockedIn();
			elapsed = getElapsed();
			jornadasHoy = getJornadasHoy();
			resumen = getResumenHoy();
		});

		fechaInterval = setInterval(() => {
			const nuevaFecha = formatearFecha(new Date());
			if (nuevaFecha !== hoy) {
				hoy = nuevaFecha;
			}
		}, 60000);
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
		if (fechaInterval) clearInterval(fechaInterval);
	});

	async function handleFichar() {
		if (clockedIn) {
			await stopJornada();
		} else {
			await startJornada();
		}
	}
</script>

<svelte:head>
	<title>Fitxaketa</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center px-4 py-8">
	<p class="text-lg text-text-muted">{hoy}</p>

	<div class="mt-8 text-center">
		<p class="font-mono text-6xl font-bold tabular-nums tracking-wider text-text">{elapsed}</p>
	</div>

	<div class="mt-4">
		{#if clockedIn}
			<span class="font-semibold text-primary">Trabajando</span>
		{:else}
			<span class="text-text-muted">Descansando</span>
		{/if}
	</div>

	<button
		onclick={handleFichar}
		class="mt-8 rounded-xl px-8 py-4 text-lg font-semibold text-white transition-colors"
		class:bg-primary={!clockedIn}
		class:hover:bg-primary-dark={!clockedIn}
		class:bg-danger={clockedIn}
		class:hover:bg-danger-dark={clockedIn}
	>
		{clockedIn ? 'Fichar salida' : 'Fichar entrada'}
	</button>

	<div class="mt-8 text-center text-text-muted">
		<p class="text-sm">
			Hoy: {Math.floor(resumen.totalHoras)}h {Math.round((resumen.totalHoras % 1) * 60)}m |
			{jornadasHoy.length}
			{jornadasHoy.length === 1 ? 'jornada' : 'jornadas'}
		</p>
	</div>
</div>
