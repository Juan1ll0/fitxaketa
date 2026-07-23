<script lang="ts">
	import { exportarCopia, importarCopia } from '$lib/stores/app-state-backup';
	import { parsearBackup } from '$lib/utils/backup';
	import ConfirmacionDestructiva from './ConfirmacionDestructiva.svelte';

	let fileInput: HTMLInputElement;
	let estado = $state<'idle' | 'exportando' | 'importando'>('idle');
	let feedback = $state<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

	let confirmOpen = $state(false);
	let mensajeConfirm = $state('');
	let textoPendiente = '';

	async function onExportar(): Promise<void> {
		feedback = null;
		estado = 'exportando';
		try {
			await exportarCopia();
		} catch {
			feedback = { tipo: 'error', texto: 'No se pudo exportar la copia.' };
		} finally {
			estado = 'idle';
		}
	}

	function abrirSelector(): void {
		feedback = null;
		fileInput.click();
	}

	async function onFichero(e: Event): Promise<void> {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = ''; // permite volver a elegir el mismo fichero
		if (!file) return;
		try {
			const texto = await file.text();
			const data = parsearBackup(texto); // valida; lanza si el fichero no es válido
			textoPendiente = texto;
			const n = data.jornadas.length;
			mensajeConfirm = `Se reemplazarán tus datos actuales por los de la copia (${n} ${n === 1 ? 'jornada' : 'jornadas'}). Esta acción no se puede deshacer.`;
			confirmOpen = true;
		} catch (err) {
			feedback = {
				tipo: 'error',
				texto: err instanceof Error ? err.message : 'El fichero no es válido.'
			};
		}
	}

	async function confirmarImport(): Promise<void> {
		estado = 'importando';
		try {
			await importarCopia(textoPendiente);
			feedback = { tipo: 'ok', texto: 'Copia importada correctamente.' };
		} catch {
			feedback = { tipo: 'error', texto: 'No se pudo importar la copia.' };
		} finally {
			estado = 'idle';
			confirmOpen = false;
			textoPendiente = '';
		}
	}

	function cancelarImport(): void {
		confirmOpen = false;
		textoPendiente = '';
	}
</script>

<section class="mt-8" aria-labelledby="copia-seguridad">
	<h2 id="copia-seguridad" class="mb-2 px-1 text-sm font-medium text-text-muted">
		Copia de seguridad
	</h2>
	<div class="flex flex-col gap-3 rounded-xl bg-surface-light p-4">
		<p class="text-sm text-text-muted">
			Guarda todas tus jornadas y tu configuración en un fichero, o restáuralas desde uno. Útil para
			pasar tus datos a otro dispositivo. La copia no sale del dispositivo salvo que tú la
			compartas.
		</p>
		<div class="flex flex-col gap-2 sm:flex-row">
			<button
				type="button"
				onclick={onExportar}
				disabled={estado !== 'idle'}
				class="rounded-lg bg-primary px-4 py-2 font-medium text-white disabled:opacity-60"
			>
				{estado === 'exportando' ? 'Exportando…' : 'Exportar copia'}
			</button>
			<button
				type="button"
				onclick={abrirSelector}
				disabled={estado !== 'idle'}
				class="rounded-lg border border-border bg-surface px-4 py-2 font-medium text-text disabled:opacity-60"
			>
				{estado === 'importando' ? 'Importando…' : 'Importar copia'}
			</button>
		</div>
		{#if feedback}
			<p
				class="text-sm {feedback.tipo === 'ok' ? 'text-primary' : 'text-danger'}"
				aria-live="polite"
			>
				{feedback.texto}
			</p>
		{/if}
		<input
			bind:this={fileInput}
			type="file"
			accept=".json,application/json"
			class="hidden"
			onchange={onFichero}
		/>
	</div>
</section>

<ConfirmacionDestructiva
	open={confirmOpen}
	titulo="Importar copia"
	mensaje={mensajeConfirm}
	onConfirmar={confirmarImport}
	onCancelar={cancelarImport}
/>
