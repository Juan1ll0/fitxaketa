<script lang="ts">
	import type { Jornada, Settings } from '$lib/db';
	import { formatearHorasCorto } from '$lib/utils/dashboard';
	import { duracionEfectivaMinutos } from '$lib/utils/redondeo';
	import { slide } from 'svelte/transition';
	import JornadaCard from './JornadaCard.svelte';

	let {
		fecha,
		jornadas,
		snapshots
	}: { fecha: string; jornadas: Jornada[]; snapshots: Settings[] } = $props();

	let expandido = $state(false);

	let totalMin = $derived(
		jornadas.reduce(
			(acc, jornada) =>
				acc + (jornada.status === 'open' ? 0 : duracionEfectivaMinutos(jornada, snapshots)),
			0
		)
	);
	let enCurso = $derived(jornadas.filter((jornada) => jornada.status === 'open').length);
	let numFichajes = $derived(jornadas.length);
	let resumenTexto = $derived(
		formatearHorasCorto(totalMin / 60) + (enCurso > 0 ? ` · ${enCurso} en curso` : '')
	);

	function toggle(): void {
		expandido = !expandido;
	}
</script>

<div class="mb-4">
	<button
		type="button"
		aria-expanded={expandido}
		aria-controls="dia-{fecha}"
		onclick={toggle}
		class="flex min-h-11 w-full items-center justify-between rounded-lg bg-surface-light px-4 py-3 transition-colors hover:bg-surface-light/80"
	>
		<span class="font-medium text-text">{fecha}</span>
		<div class="flex items-center gap-2">
			{#if numFichajes > 1}
				<span
					class="flex h-5 min-w-5 items-center justify-center rounded-full bg-surface px-1 text-xs font-medium text-text-muted"
				>
					{numFichajes}
				</span>
				<span class="text-sm text-text-muted">-</span>
			{/if}
			<span class="text-sm text-text-muted">{resumenTexto}</span>
			<svg
				class="h-5 w-5 text-text-muted transition-transform {expandido ? 'rotate-180' : ''}"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<path d="M6 9l6 6 6-6" />
			</svg>
		</div>
	</button>

	{#if expandido}
		<div id="dia-{fecha}" transition:slide>
			{#each jornadas as jornada (jornada.id)}
				<JornadaCard {jornada} {snapshots} />
			{/each}
		</div>
	{/if}
</div>
