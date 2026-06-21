<script lang="ts">
	import type { Jornada } from '$lib/db';
	import { formatearHora, formatearDuracion } from '$lib/utils/dashboard';

	let { jornada }: { jornada: Jornada } = $props();

	const esAbierta = $derived(jornada.status === 'open');
</script>

<div class="flex items-center justify-between border-b border-surface-light px-4 py-3">
	<div class="flex items-center gap-4">
		<span class="w-14 text-sm text-text-muted">
			{formatearHora(jornada.start_time)}
		</span>
		<span class="text-text-muted">→</span>
		<span class="w-14 text-sm text-text-muted">
			{esAbierta ? 'En curso' : formatearHora(jornada.end_time!)}
		</span>
	</div>

	<div class="flex items-center gap-3">
		<span class="font-mono text-sm text-text">
			{esAbierta ? 'En curso' : formatearDuracion(jornada.duration)}
		</span>
		<span
			class="text-lg"
			title={jornada.synced ? 'Sincronizado' : 'No sincronizado'}
			aria-label={jornada.synced ? 'Sincronizado' : 'No sincronizado'}
		>
			{jornada.synced ? '✅' : '❌'}
		</span>
	</div>
</div>
