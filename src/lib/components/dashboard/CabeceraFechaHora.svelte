<script lang="ts">
	import { formatearFecha, formatearHora } from '$lib/utils/dashboard';

	let { ahora }: { ahora: Date } = $props();

	const fecha = $derived(formatearFecha(ahora));
	const hora = $derived(formatearHora(ahora));
</script>

<div class="text-center">
	<p class="text-sm text-text-muted">{fecha}</p>
	<p class="mt-1 font-mono text-4xl font-semibold tabular-nums text-text-muted">{hora}</p>
</div>
