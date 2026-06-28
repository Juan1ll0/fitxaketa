<script lang="ts">
	let {
		open,
		onCerrar,
		onElegir
	}: {
		open: boolean;
		onCerrar: () => void;
		onElegir: (opcion: 'ultima' | 'toda') => void;
	} = $props();

	let dialogEl: HTMLDialogElement;

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) dialogEl.showModal();
		else if (!open && dialogEl.open) dialogEl.close();
	});

	const fila =
		'flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-light px-4 py-3 text-left text-text hover:bg-surface';
</script>

<dialog
	bind:this={dialogEl}
	onclose={onCerrar}
	aria-label="Borrar configuración"
	class="w-[min(92vw,28rem)] rounded-2xl border border-border bg-surface p-0 text-text backdrop:bg-black/60"
>
	<div class="flex flex-col gap-3 p-5">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold">Borrar configuración</h2>
			<button
				type="button"
				onclick={onCerrar}
				aria-label="Cerrar"
				class="text-text-muted hover:text-text">✕</button
			>
		</div>
		<p class="text-sm text-text-muted">¿Qué quieres borrar?</p>
		<div class="flex flex-col gap-2">
			<button type="button" class={fila} onclick={() => onElegir('ultima')}>
				<span>Última configuración</span><span aria-hidden="true" class="text-text-muted">›</span>
			</button>
			<button type="button" class={fila} onclick={() => onElegir('toda')}>
				<span>Toda la configuración</span><span aria-hidden="true" class="text-text-muted">›</span>
			</button>
		</div>
		<button
			type="button"
			onclick={onCerrar}
			class="min-h-11 rounded-xl border border-border px-4 py-2 font-medium text-text hover:bg-surface-light"
		>
			Cancelar
		</button>
	</div>
</dialog>
