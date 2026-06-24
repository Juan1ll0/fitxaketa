<script lang="ts">
	import type { Jornada, Settings } from '$lib/db';
	import { formatearHorasDecimal } from '$lib/utils/dashboard';
	import { duracionEfectivaMinutos } from '$lib/utils/redondeo';
	import { objetivoDiarioMinutos } from '$lib/utils/settings';

	let {
		jornadasHoy,
		settings,
		ahora
	}: { jornadasHoy: Jornada[]; settings: Settings[]; ahora: Date } = $props();

	// Total efectivo de hoy: jornadas cerradas con redondeo + tiempo en curso de
	// la jornada abierta (coherente con Historial/Estadísticas).
	const minutosHoy = $derived.by(() => {
		let total = 0;
		for (const j of jornadasHoy) {
			if (j.status === 'open') {
				total += Math.floor((ahora.getTime() - j.start_time.getTime()) / 60000);
			} else {
				total += duracionEfectivaMinutos(j, settings);
			}
		}
		return total;
	});

	const objetivoMin = $derived(objetivoDiarioMinutos(settings, ahora));
	const restanteMin = $derived(Math.max(0, objetivoMin - minutosHoy));
</script>

<div class="grid grid-cols-3 gap-2">
	<div class="rounded-lg bg-surface-light px-3 py-2 text-center">
		<p class="text-xs text-text-muted">Hoy</p>
		<p class="text-base font-semibold text-text">{formatearHorasDecimal(minutosHoy / 60)}</p>
	</div>
	<div class="rounded-lg bg-surface-light px-3 py-2 text-center">
		<p class="text-xs text-text-muted">Jornadas</p>
		<p class="text-base font-semibold text-text">{jornadasHoy.length}</p>
	</div>
	<div class="rounded-lg bg-surface-light px-3 py-2 text-center">
		<p class="text-xs text-text-muted">Restante</p>
		<p class="text-base font-semibold text-text">
			{objetivoMin > 0 ? formatearHorasDecimal(restanteMin / 60) : '—'}
		</p>
	</div>
</div>
