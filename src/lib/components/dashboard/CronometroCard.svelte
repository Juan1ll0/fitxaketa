<script lang="ts">
	let { elapsed, clockedIn }: { elapsed: string; clockedIn: boolean } = $props();
</script>

<div
	class="rounded-2xl border bg-surface-light px-8 py-6 text-center transition-colors {clockedIn
		? 'border-success'
		: 'border-border'}"
>
	<p
		data-testid="cronometro"
		class="font-mono text-5xl font-bold tabular-nums tracking-wider text-text"
	>
		{elapsed}
	</p>
</div>
