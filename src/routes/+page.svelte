<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		startJornada,
		stopJornada,
		subscribe,
		getClockedIn,
		getElapsed,
		getJornadas,
		getJornadasHoy,
		getSettings
	} from '$lib/stores/app-state';
	import { settingsActual } from '$lib/utils/settings';
	import { jornadaAbiertaAnterior } from '$lib/utils/dashboard-avisos';
	import { dashboardLayoutPorDefecto } from '$lib/utils/dashboard-layout';
	import type { Jornada, Settings } from '$lib/db';
	import CabeceraFechaHora from '$lib/components/dashboard/CabeceraFechaHora.svelte';
	import CronometroCard from '$lib/components/dashboard/CronometroCard.svelte';
	import EstadoPill from '$lib/components/dashboard/EstadoPill.svelte';
	import ResumenStatCards from '$lib/components/dashboard/ResumenStatCards.svelte';
	import AvisoJornadaAbierta from '$lib/components/dashboard/AvisoJornadaAbierta.svelte';
	import AltaManualModal from '$lib/components/AltaManualModal.svelte';

	let clockedIn = $state(false);
	let elapsed = $state('00:00:00');
	let ahora = $state(new Date());
	let jornadas = $state<Jornada[]>([]);
	let jornadasHoy = $state<Jornada[]>([]);
	let settings = $state<Settings[]>([]);
	let modalAbierta = $state(false);

	const minJornada = $derived(settings.length ? settingsActual(settings).min_jornada_minutos : 0);
	const avisoAnterior = $derived(jornadaAbiertaAnterior(jornadas, ahora));

	let unsubscribe: (() => void) | null = null;
	let reloj: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		unsubscribe = subscribe(() => {
			clockedIn = getClockedIn();
			elapsed = getElapsed();
			jornadas = getJornadas();
			jornadasHoy = getJornadasHoy();
			settings = getSettings();
		});
		reloj = setInterval(() => (ahora = new Date()), 1000);
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
		if (reloj) clearInterval(reloj);
	});

	async function handleFichar() {
		if (clockedIn) await stopJornada();
		else await startJornada();
	}
</script>

<svelte:head>
	<title>Fitxaketa</title>
</svelte:head>

<div class="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center gap-6 px-4 py-8">
	{#each dashboardLayoutPorDefecto as slot (slot.id)}
		{#if slot.visible}
			<div class="w-full">
				{#if slot.id === 'cabecera' && slot.variante === 'A1'}
					<CabeceraFechaHora {ahora} />
				{:else if slot.id === 'cronometro' && slot.variante === 'B1'}
					<CronometroCard {elapsed} {clockedIn} />
				{:else if slot.id === 'estado' && slot.variante === 'C1'}
					<div class="text-center"><EstadoPill {clockedIn} /></div>
				{:else if slot.id === 'resumen' && slot.variante === 'D1'}
					<ResumenStatCards {jornadasHoy} {settings} {ahora} />
				{:else if slot.id === 'contexto' && slot.variante === 'E4'}
					<AvisoJornadaAbierta jornada={avisoAnterior} />
				{/if}
			</div>
		{/if}

		{#if slot.id === 'estado'}
			<button
				onclick={handleFichar}
				class="min-h-11 w-full rounded-xl px-8 py-4 text-lg font-semibold text-white transition-colors"
				class:bg-primary={!clockedIn}
				class:hover:bg-primary-dark={!clockedIn}
				class:bg-danger={clockedIn}
				class:hover:bg-danger-dark={clockedIn}
			>
				{clockedIn ? 'Fichar salida' : 'Fichar entrada'}
			</button>
		{/if}

		{#if slot.id === 'resumen'}
			<button
				type="button"
				onclick={() => (modalAbierta = true)}
				class="flex min-h-11 items-center gap-1.5 text-sm text-text-muted hover:text-text"
			>
				<span class="text-lg leading-none">＋</span> Añadir fichaje
			</button>
		{/if}
	{/each}
</div>

<AltaManualModal
	open={modalAbierta}
	onClose={() => (modalAbierta = false)}
	minJornadaMinutos={minJornada}
/>
