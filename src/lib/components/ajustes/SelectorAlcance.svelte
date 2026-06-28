<script lang="ts">
	import type { Jornada, Settings } from '$lib/db';
	import { getJornadas, getSettings, subscribe } from '$lib/stores/app-state';
	import { settingsActual } from '$lib/utils/settings';
	import { periodosConDatos } from '$lib/utils/borrado-periodos';
	import type { Granularidad, SeleccionBorrado } from '$lib/utils/borrado-tipos';

	let {
		open,
		onCerrar,
		onElegir
	}: {
		open: boolean;
		onCerrar: () => void;
		onElegir: (sel: SeleccionBorrado) => void;
	} = $props();

	const NIVELES: { g: Granularidad; l: string }[] = [
		{ g: 'año', l: 'Año' },
		{ g: 'mes', l: 'Mes' },
		{ g: 'semana', l: 'Semana' },
		{ g: 'dia', l: 'Día' },
		{ g: 'jornada', l: 'Jornada' }
	];

	let dialogEl: HTMLDialogElement;
	let jornadas = $state<Jornada[]>(getJornadas());
	let settings = $state<Settings[]>(getSettings());
	let granularidad = $state<Granularidad | null>(null);

	$effect(() => {
		const u = subscribe(() => {
			jornadas = getJornadas();
			settings = getSettings();
		});
		return u;
	});

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) {
			dialogEl.showModal();
			granularidad = null;
		} else if (!open && dialogEl.open) {
			dialogEl.close();
		}
	});

	let primerDia = $derived(settings.length ? settingsActual(settings).primer_dia_semana : 1);
	let periodos = $derived(
		granularidad && granularidad !== 'jornada'
			? periodosConDatos(jornadas, granularidad, primerDia)
			: []
	);
	let jornadasOrdenadas = $derived(
		[...jornadas].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
	);

	function etiquetaJornada(j: Jornada): string {
		const f = new Date(j.start_time);
		const hora = (d: Date): string => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
		const fin = j.end_time ? hora(new Date(j.end_time)) : '…';
		return `${f.toLocaleDateString('es-ES')} · ${hora(f)}–${fin}`;
	}

	const filaCls =
		'flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-light px-4 py-3 text-left text-text hover:bg-surface';
</script>

<dialog
	bind:this={dialogEl}
	onclose={onCerrar}
	aria-label="Elegir qué borrar"
	class="w-[min(92vw,28rem)] rounded-2xl border border-border bg-surface p-0 text-text backdrop:bg-black/60"
>
	<div class="flex max-h-[80vh] flex-col gap-3 p-5">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold">
				{granularidad ? 'Elige el periodo' : 'Borrar jornadas'}
			</h2>
			<button type="button" onclick={onCerrar} aria-label="Cerrar" class="text-text-muted hover:text-text"
				>✕</button
			>
		</div>

		{#if !granularidad}
			<p class="text-sm text-text-muted">¿Qué alcance quieres borrar?</p>
			<div class="flex flex-col gap-2">
				{#each NIVELES as n (n.g)}
					<button type="button" class={filaCls} onclick={() => (granularidad = n.g)}>
						<span>{n.l}</span><span aria-hidden="true" class="text-text-muted">›</span>
					</button>
				{/each}
			</div>
		{:else}
			<button
				type="button"
				onclick={() => (granularidad = null)}
				class="self-start text-sm text-text-muted hover:text-text">‹ Cambiar alcance</button
			>
			<div class="flex flex-col gap-2 overflow-y-auto">
				{#if granularidad === 'jornada'}
					{#each jornadasOrdenadas as j (j.id)}
						<button
							type="button"
							class={filaCls}
							onclick={() => onElegir({ tipo: 'jornada', id: j.id!, etiqueta: etiquetaJornada(j) })}
						>
							<span>{etiquetaJornada(j)}</span>
						</button>
					{:else}
						<p class="text-sm text-text-muted">No hay jornadas registradas.</p>
					{/each}
				{:else}
					{#each periodos as p (p.clave)}
						<button
							type="button"
							class={filaCls}
							onclick={() =>
								onElegir({ tipo: 'rango', desde: p.desde, hasta: p.hasta, etiqueta: p.etiqueta, conteo: p.conteo })}
						>
							<span>{p.etiqueta}</span>
							<span class="text-xs text-text-muted">{p.conteo} {p.conteo === 1 ? 'jornada' : 'jornadas'}</span>
						</button>
					{:else}
						<p class="text-sm text-text-muted">No hay jornadas en este alcance.</p>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</dialog>
