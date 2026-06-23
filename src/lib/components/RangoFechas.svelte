<script lang="ts">
	import { parseFechaLocal } from '$lib/utils/historial-filtros';
	import { claveDia } from '$lib/utils/fecha-negocio';

	let {
		desde = $bindable<Date>(),
		hasta = $bindable<Date>(),
		hoyISO
	}: {
		desde: Date;
		hasta: Date;
		hoyISO: string;
	} = $props();

	function actualizar(tipo: 'desde' | 'hasta', value: string): void {
		const fecha = parseFechaLocal(value);
		if (tipo === 'desde') {
			desde = fecha;
			if (fecha.getTime() > hasta.getTime()) {
				hasta = fecha;
			}
		} else {
			hasta = fecha;
		}
	}
</script>

<label for="rango-desde" class="text-sm text-text-muted">Desde</label>
<input
	id="rango-desde"
	type="date"
	max={hoyISO}
	class="rounded-lg border border-border bg-surface-light px-3 py-2 text-text"
	bind:value={() => claveDia(desde), (v) => actualizar('desde', v)}
/>
<label for="rango-hasta" class="text-sm text-text-muted">Hasta</label>
<input
	id="rango-hasta"
	type="date"
	max={hoyISO}
	class="rounded-lg border border-border bg-surface-light px-3 py-2 text-text"
	bind:value={() => claveDia(hasta), (v) => actualizar('hasta', v)}
/>
