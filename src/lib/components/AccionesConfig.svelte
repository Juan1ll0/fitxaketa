<script lang="ts">
	import {
		resetFabrica,
		borrarSoloSettings,
		borrarUltimaConfig,
		borrarRango,
		borrarJornadaPorId
	} from '$lib/stores/app-state-borrado';
	import type { SeleccionBorrado } from '$lib/utils/borrado-tipos';
	import SelectorAlcance from './ajustes/SelectorAlcance.svelte';
	import SelectorConfig from './ajustes/SelectorConfig.svelte';
	import ConfirmacionDestructiva from './ajustes/ConfirmacionDestructiva.svelte';

	let selectorOpen = $state(false);
	let configOpen = $state(false);
	let confirmOpen = $state(false);
	let titulo = $state('');
	let mensaje = $state('');
	let ejecutar: () => Promise<void> = async () => {};

	function pedirConfirmacion(t: string, m: string, fn: () => Promise<void>): void {
		titulo = t;
		mensaje = m;
		ejecutar = fn;
		confirmOpen = true;
	}

	function onReset(): void {
		pedirConfirmacion(
			'Reseteo de fábrica',
			'Se borrarán TODAS las jornadas y la configuración. Esta acción no se puede deshacer.',
			resetFabrica
		);
	}

	function onElegirConfig(opcion: 'ultima' | 'toda'): void {
		configOpen = false;
		if (opcion === 'ultima') {
			pedirConfirmacion(
				'Borrar última configuración',
				'Se eliminará el último cambio de configuración y volverá a regir el anterior. Tus jornadas se conservan.',
				borrarUltimaConfig
			);
			return;
		}
		pedirConfirmacion(
			'Borrar toda la configuración',
			'Se borrará toda la configuración y se restaurará la de por defecto. Tus jornadas se conservan.',
			borrarSoloSettings
		);
	}

	function onElegir(sel: SeleccionBorrado): void {
		selectorOpen = false;
		if (sel.tipo === 'jornada') {
			pedirConfirmacion('Borrar jornada', `Se borrará la jornada ${sel.etiqueta}.`, () =>
				borrarJornadaPorId(sel.id)
			);
			return;
		}
		const n = sel.conteo === 1 ? 'jornada' : 'jornadas';
		pedirConfirmacion('Borrar jornadas', `Se borrarán ${sel.conteo} ${n} (${sel.etiqueta}).`, () =>
			borrarRango(sel.desde, sel.hasta)
		);
	}

	async function confirmar(): Promise<void> {
		await ejecutar();
		confirmOpen = false;
	}

	const fila =
		'flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-danger/30 bg-surface-light px-4 py-3 text-left text-danger hover:bg-danger/10';
</script>

<section class="mt-8" aria-labelledby="acciones-peligro">
	<h2 id="acciones-peligro" class="mb-2 px-1 text-sm font-medium text-danger">Zona de peligro</h2>
	<div class="flex flex-col gap-2">
		<button type="button" class={fila} aria-haspopup="dialog" onclick={() => (selectorOpen = true)}>
			<span>Borrar jornadas</span><span aria-hidden="true">›</span>
		</button>
		<button type="button" class={fila} aria-haspopup="dialog" onclick={() => (configOpen = true)}>
			<span>Borrar solo la configuración</span><span aria-hidden="true">›</span>
		</button>
		<button type="button" class={fila} aria-haspopup="dialog" onclick={onReset}>
			<span>Reseteo de fábrica</span><span aria-hidden="true">›</span>
		</button>
	</div>
	<p class="mt-2 px-1 text-sm text-text-muted">El borrado es definitivo: no se puede deshacer.</p>
</section>

<SelectorAlcance open={selectorOpen} onCerrar={() => (selectorOpen = false)} {onElegir} />
<SelectorConfig open={configOpen} onCerrar={() => (configOpen = false)} onElegir={onElegirConfig} />
<ConfirmacionDestructiva
	open={confirmOpen}
	{titulo}
	{mensaje}
	onConfirmar={confirmar}
	onCancelar={() => (confirmOpen = false)}
/>
