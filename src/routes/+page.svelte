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
	import { dashboardLayoutPorDefecto, type DashboardSlot } from '$lib/utils/dashboard-layout';
	import type { Jornada, Settings } from '$lib/db';
	import CabeceraFechaHora from '$lib/components/dashboard/CabeceraFechaHora.svelte';
	import CronometroCard from '$lib/components/dashboard/CronometroCard.svelte';
	import EstadoPill from '$lib/components/dashboard/EstadoPill.svelte';
	import ResumenStatCards from '$lib/components/dashboard/ResumenStatCards.svelte';
	import AvisoJornadaAbierta from '$lib/components/dashboard/AvisoJornadaAbierta.svelte';
	import AltaManualModal from '$lib/components/AltaManualModal.svelte';

	// Inicializa desde el store (ya poblado por initAppState) para que, al volver
	// al dashboard por navegación SPA, el primer render ya muestre los datos
	// reales y no un instante el estado por defecto.
	let clockedIn = $state(getClockedIn());
	let elapsed = $state(getElapsed());
	let ahora = $state(new Date());
	let jornadas = $state<Jornada[]>(getJornadas());
	let jornadasHoy = $state<Jornada[]>(getJornadasHoy());
	let settings = $state<Settings[]>(getSettings());
	let modalAbierta = $state(false);

	const minJornada = $derived(settings.length ? settingsActual(settings).min_jornada_minutos : 0);
	const avisoAnterior = $derived(jornadaAbiertaAnterior(jornadas, ahora));

	// Distribución vertical: cabecera arriba, cronómetro+estado centrados, resto abajo.
	function slotsDe(ids: DashboardSlot['id'][]): DashboardSlot[] {
		return dashboardLayoutPorDefecto.filter((s) => ids.includes(s.id) && s.visible);
	}

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

{#snippet widget(slot: DashboardSlot)}
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
{/snippet}

<!-- Altura = viewport menos la barra de navegación (5rem ≈ pb-20 del layout), para
	no introducir scroll. Tres tercios: cronómetro a 1/3 y botón de fichar a 2/3. -->
<div class="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-sm flex-col px-4">
	<div class="flex flex-1 flex-col items-center justify-between pt-8">
		{#each slotsDe(['cabecera']) as slot (slot.id)}
			<div class="w-full">{@render widget(slot)}</div>
		{/each}
		<div class="flex w-full flex-col items-center gap-4">
			{#each slotsDe(['cronometro', 'estado']) as slot (slot.id)}
				<div class="w-full">{@render widget(slot)}</div>
			{/each}
		</div>
	</div>

	<div class="flex flex-1 flex-col justify-end">
		<button
			onclick={handleFichar}
			class="min-h-16 w-full rounded-2xl px-8 py-6 text-2xl font-bold text-white transition-colors"
			class:bg-primary={!clockedIn}
			class:hover:bg-primary-dark={!clockedIn}
			class:bg-danger={clockedIn}
			class:hover:bg-danger-dark={clockedIn}
		>
			{clockedIn ? 'Fichar salida' : 'Fichar entrada'}
		</button>
	</div>

	<div class="flex flex-1 flex-col items-center gap-3 pt-4">
		{#each slotsDe(['resumen', 'contexto']) as slot (slot.id)}
			<div class="w-full">{@render widget(slot)}</div>
		{/each}
		<button
			type="button"
			onclick={() => (modalAbierta = true)}
			class="flex min-h-11 items-center gap-1.5 text-sm text-text-muted hover:text-text"
		>
			<span class="text-lg leading-none">＋</span> Añadir fichaje
		</button>
	</div>
</div>

<AltaManualModal
	open={modalAbierta}
	onClose={() => (modalAbierta = false)}
	minJornadaMinutos={minJornada}
/>
