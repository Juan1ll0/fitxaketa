<script lang="ts">
	let { clockedIn }: { clockedIn: boolean } = $props();
</script>

<span
	class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium {clockedIn
		? 'bg-success/20 text-success'
		: 'bg-surface-light text-text-muted'}"
>
	<span
		class="h-2 w-2 rounded-full {clockedIn ? 'animate-pulse bg-success' : 'bg-text-muted'}"
		aria-hidden="true"
	></span>
	{clockedIn ? 'Trabajando' : 'Descansando'}
</span>
