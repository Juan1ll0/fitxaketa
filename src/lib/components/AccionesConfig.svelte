<script lang="ts">
	// Placeholder UX (implementación de reset/sync/export/backup diferida).
	const datos = [
		{ id: 'sync', label: 'Sincronizar' },
		{ id: 'export', label: 'Exportar datos' },
		{ id: 'backup', label: 'Copia de seguridad' }
	] as const;
</script>

<section class="mt-8" aria-labelledby="acciones-datos">
	<h2 id="acciones-datos" class="mb-2 px-1 text-sm font-medium text-text-muted">
		Datos y sincronización
	</h2>
	<ul
		class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-light"
	>
		{#each datos as accion (accion.id)}
			<li>
				<button
					type="button"
					disabled
					class="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-text opacity-60"
				>
					<span class="flex-1">{accion.label}</span>
					<span class="text-xs text-text-muted">Próximamente</span>
				</button>
			</li>
		{/each}
	</ul>
</section>

<section class="mt-8" aria-labelledby="acciones-peligro">
	<h2 id="acciones-peligro" class="mb-2 px-1 text-sm font-medium text-danger">Zona de peligro</h2>
	<button
		type="button"
		disabled
		aria-haspopup="dialog"
		class="flex min-h-12 w-full items-center gap-3 rounded-xl border border-danger/30 bg-surface-light px-4 py-3 text-left text-danger opacity-60"
	>
		<span class="flex-1">Restablecer y borrar datos</span>
		<span class="text-xs">Próximamente</span>
	</button>
	<p class="mt-2 px-1 text-sm text-text-muted">
		Borra todos los registros y la configuración. Esta acción no se puede deshacer.
	</p>
</section>
