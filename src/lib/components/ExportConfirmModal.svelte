<script lang="ts">
	let {
		periodo,
		onConfirm,
		onCancel
	}: {
		periodo: string;
		onConfirm: () => void | Promise<void>;
		onCancel: () => void;
	} = $props();

	let exporting = $state(false);
	let dialogEl: HTMLDialogElement;
	const mensajeId = 'export-confirm-message';

	$effect(() => {
		if (dialogEl && !dialogEl.open) {
			dialogEl.showModal();
		}
	});

	async function handleConfirm(): Promise<void> {
		exporting = true;
		try {
			await onConfirm();
		} finally {
			exporting = false;
		}
	}

	function handleDialogClose(): void {
		if (!exporting) onCancel();
	}
</script>

<dialog
	bind:this={dialogEl}
	onclose={handleDialogClose}
	aria-labelledby={mensajeId}
	aria-modal="true"
	class="w-[min(92vw,24rem)] rounded-2xl border border-border bg-surface p-0 text-text backdrop:bg-black/60"
>
	<form method="dialog" class="flex flex-col gap-4 p-5" onsubmit={(e) => e.preventDefault()}>
		<p id={mensajeId} class="text-sm text-text">
			¿Vas a exportar los datos del <strong>{periodo}</strong>? ¿Estás seguro?
		</p>

		<div class="mt-1 flex flex-col gap-2">
			<button
				type="button"
				onclick={handleConfirm}
				disabled={exporting}
				class="min-h-11 rounded-xl bg-primary px-4 py-2 font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
			>
				{exporting ? 'Exportando...' : 'Exportar'}
			</button>
			<button
				type="button"
				onclick={onCancel}
				disabled={exporting}
				class="min-h-11 rounded-xl px-4 py-2 text-text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
			>
				Cancelar
			</button>
		</div>
	</form>
</dialog>
