<script lang="ts">
	import type { Jornada } from '$lib/db';

	let { jornada }: { jornada: Jornada | null } = $props();

	const fechaCorta = $derived(
		jornada
			? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(
					jornada.start_time
				)
			: ''
	);
</script>

{#if jornada}
	<div
		role="status"
		aria-live="polite"
		class="flex items-center justify-between gap-3 rounded-lg border border-warning bg-warning/10 px-3 py-2 text-sm"
	>
		<span class="flex items-center gap-2 text-warning">
			<svg
				class="h-4 w-4 shrink-0"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<path
					d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
				/>
			</svg>
			<span class="text-text">Jornada sin cerrar del {fechaCorta}</span>
		</span>
		<a href="/historial" class="shrink-0 font-medium text-warning underline">Revisar</a>
	</div>
{/if}
