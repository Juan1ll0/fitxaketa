<script lang="ts">
	import type { Jornada } from '$lib/db';
	import JornadaCard from './JornadaCard.svelte';

	let { fecha, jornadas }: { fecha: string; jornadas: Jornada[] } = $props();
</script>

<div class="mb-6">
	<h3
		class="sticky top-0 bg-surface-light px-4 py-2 text-sm font-semibold uppercase tracking-wide text-text-muted"
	>
		{fecha}
	</h3>
	<div>
		{#each jornadas as jornada (jornada.id)}
			<JornadaCard {jornada} />
		{/each}
	</div>
</div>
