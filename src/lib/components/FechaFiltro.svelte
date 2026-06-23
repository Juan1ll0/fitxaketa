<script lang="ts">
	import { parseFechaLocal } from '$lib/utils/historial-filtros';
	import { claveDia } from '$lib/utils/fecha-negocio';

	let {
		fecha = $bindable<Date>(),
		hoyISO
	}: {
		fecha: Date;
		hoyISO: string;
	} = $props();

	function actualizar(value: string): void {
		fecha = parseFechaLocal(value);
	}
</script>

<label for="fecha-filtro" class="text-sm text-text-muted">Fecha</label>
<input
	id="fecha-filtro"
	type="date"
	max={hoyISO}
	class="rounded-lg border border-border bg-surface-light px-3 py-2 text-text"
	bind:value={() => claveDia(fecha), actualizar}
/>
