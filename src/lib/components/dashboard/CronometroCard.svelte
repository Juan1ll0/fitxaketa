<script lang="ts">
	let { elapsed, clockedIn }: { elapsed: string; clockedIn: boolean } = $props();

	// elapsed es "HH:MM:SS"; los segundos (":SS") se muestran más pequeños.
	const horasMinutos = $derived(elapsed.slice(0, 5));
	const segundos = $derived(elapsed.slice(5));
</script>

<div
	class="rounded-2xl border bg-surface-light px-8 py-6 text-center transition-colors {clockedIn
		? 'border-success'
		: 'border-border'}"
>
	<p data-testid="cronometro" class="font-mono font-bold tabular-nums tracking-wider text-text">
		<span class="text-6xl">{horasMinutos}</span><span class="text-4xl">{segundos}</span>
	</p>
</div>
