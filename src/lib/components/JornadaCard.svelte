<script lang="ts">
	import type { Jornada, Settings } from '$lib/db';
	import { formatearHora, formatearDuracion } from '$lib/utils/dashboard';
	import { duracionEfectivaMinutos } from '$lib/utils/redondeo';

	let { jornada, snapshots }: { jornada: Jornada; snapshots: Settings[] } = $props();

	const esAbierta = $derived(jornada.status === 'open');
	const duracion = $derived(
		esAbierta ? 'En curso' : formatearDuracion(duracionEfectivaMinutos(jornada, snapshots))
	);
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
		<span
			class="rounded-full px-2.5 py-0.5 text-xs font-medium {esAbierta
				? 'bg-success/20 text-success'
				: 'bg-surface-light text-text-muted'}"
		>
			{esAbierta ? 'Abierto' : 'Cerrado'}
		</span>
		<span class="font-mono text-sm text-text">
			{duracion}
		</span>
	</div>
</div>
