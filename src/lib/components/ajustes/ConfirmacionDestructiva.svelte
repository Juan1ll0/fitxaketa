<script lang="ts">
	let {
		open,
		titulo,
		mensaje,
		onConfirmar,
		onCancelar
	}: {
		open: boolean;
		titulo: string;
		mensaje: string;
		onConfirmar: () => void | Promise<void>;
		onCancelar: () => void;
	} = $props();

	let dialogEl: HTMLDialogElement;
	let cancelarEl: HTMLButtonElement | undefined = $state();
	let procesando = $state(false);

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) {
			dialogEl.showModal();
			cancelarEl?.focus(); // foco inicial en Cancelar (acción no destructiva)
		} else if (!open && dialogEl.open) {
			dialogEl.close();
		}
	});

	async function confirmar(): Promise<void> {
		procesando = true;
		try {
			await onConfirmar();
		} finally {
			procesando = false;
		}
	}
</script>

<dialog
	bind:this={dialogEl}
	onclose={onCancelar}
	aria-labelledby="confirmar-titulo"
	class="w-[min(92vw,24rem)] rounded-2xl border border-border bg-surface p-0 text-text backdrop:bg-black/60"
>
	<div class="flex flex-col gap-4 p-5">
		<h2 id="confirmar-titulo" class="text-lg font-semibold text-danger">{titulo}</h2>
		<p class="text-sm text-text-muted">{mensaje}</p>
		<div class="mt-1 flex flex-col gap-2">
			<button
				type="button"
				bind:this={cancelarEl}
				onclick={onCancelar}
				disabled={procesando}
				class="min-h-11 rounded-xl border border-border px-4 py-2 font-medium text-text hover:bg-surface-light"
			>
				Cancelar
			</button>
			<button
				type="button"
				onclick={confirmar}
				disabled={procesando}
				class="min-h-11 rounded-xl bg-danger px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-60"
			>
				{procesando ? 'Borrando…' : 'Confirmar borrado'}
			</button>
		</div>
	</div>
</dialog>
