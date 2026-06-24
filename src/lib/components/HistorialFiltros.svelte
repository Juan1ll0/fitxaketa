<script lang="ts">
	import type { FiltroTemporal, FiltroEstado } from '$lib/utils/historial-filtros';
	import { claveDia } from '$lib/utils/fecha-negocio';
	import { slide } from 'svelte/transition';
	import PeriodoNavegacion from './PeriodoNavegacion.svelte';
	import FechaFiltro from './FechaFiltro.svelte';
	import RangoFechas from './RangoFechas.svelte';

	let {
		filtroTemporal = $bindable<FiltroTemporal>(),
		filtroEstado = $bindable<FiltroEstado>(),
		primerDia = 1
	}: {
		filtroTemporal: FiltroTemporal;
		filtroEstado: FiltroEstado;
		primerDia?: number;
	} = $props();

	const hoyISO = $derived(claveDia(new Date()));

	const modos = [
		{ value: 'periodo' as const, label: 'Periodo' },
		{ value: 'fecha' as const, label: 'Fecha' },
		{ value: 'rango' as const, label: 'Rango' }
	];

	const estados = [
		{ value: 'todas' as FiltroEstado, label: 'Todas' },
		{ value: 'abiertas' as FiltroEstado, label: 'Abiertas' },
		{ value: 'cerradas' as FiltroEstado, label: 'Cerradas' }
	];

	const baseBtn = 'min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium transition-colors';
	const activeBtn = 'bg-primary text-white';
	const inactiveBtn = 'bg-surface-light text-text-muted hover:bg-surface-light/80';

	const defecto: FiltroTemporal = { tipo: 'periodo', periodo: 'mes', fechaReferencia: new Date() };

	let panelAbierto = $state(false);

	let estadoLabel = $derived(estados.find((e) => e.value === filtroEstado)?.label ?? 'Todas');

	function setModo(value: FiltroTemporal['tipo']): void {
		filtroTemporal =
			value === 'periodo'
				? defecto
				: value === 'fecha'
					? { tipo: 'fecha', fecha: new Date() }
					: { tipo: 'rango', desde: new Date(), hasta: new Date() };
	}

	function limpiar(): void {
		filtroTemporal = defecto;
	}

	function togglePanel(): void {
		panelAbierto = !panelAbierto;
	}
</script>

<div class="flex flex-col gap-3">
	<!-- Control temporal principal (siempre visible) -->
	{#if filtroTemporal.tipo === 'periodo'}
		{@const f = filtroTemporal}
		<PeriodoNavegacion
			bind:periodo={() => f.periodo, (p) => (filtroTemporal = { ...f, periodo: p })}
			bind:fechaReferencia={
				() => f.fechaReferencia, (fr) => (filtroTemporal = { ...f, fechaReferencia: fr })
			}
			{primerDia}
		/>
	{:else if filtroTemporal.tipo === 'fecha'}
		{@const f = filtroTemporal}
		<div class="flex flex-wrap items-end gap-2">
			<div class="flex flex-col gap-1">
				<FechaFiltro
					bind:fecha={() => f.fecha, (v) => (filtroTemporal = { ...f, fecha: v })}
					{hoyISO}
				/>
			</div>
			<button type="button" onclick={limpiar} class="{baseBtn} {inactiveBtn}">Limpiar</button>
		</div>
	{:else}
		{@const f = filtroTemporal}
		<div class="flex flex-wrap items-end gap-2">
			<div class="flex flex-col gap-1">
				<RangoFechas
					bind:desde={() => f.desde, (d) => (filtroTemporal = { ...f, desde: d })}
					bind:hasta={() => f.hasta, (h) => (filtroTemporal = { ...f, hasta: h })}
					{hoyISO}
				/>
			</div>
			<button type="button" onclick={limpiar} class="{baseBtn} {inactiveBtn}">Limpiar</button>
		</div>
	{/if}

	<!-- Filtros secundarios (colapsables) -->
	<div>
		<button
			type="button"
			onclick={togglePanel}
			aria-expanded={panelAbierto}
			aria-controls="filtros-panel"
			class="flex min-h-11 w-full items-center gap-2 rounded-lg bg-surface-light px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-light/80"
		>
			<svg
				class="h-4 w-4 text-text-muted"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
			</svg>
			<span>Filtros</span>
			{#if !panelAbierto}
				<span class="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
					{estadoLabel}
				</span>
			{/if}
			<svg
				class="ml-auto h-5 w-5 text-text-muted transition-transform {panelAbierto
					? 'rotate-180'
					: ''}"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<path d="M6 9l6 6 6-6" />
			</svg>
		</button>

		{#if panelAbierto}
			<div
				id="filtros-panel"
				transition:slide
				class="mt-2 flex flex-col gap-4 rounded-lg bg-surface-light/40 p-3"
			>
				<div class="flex flex-col gap-2">
					<p class="text-xs font-medium uppercase tracking-wide text-text-muted">Vista</p>
					<div class="flex flex-wrap gap-2">
						{#each modos as modo (modo.value)}
							<button
								type="button"
								onclick={() => setModo(modo.value)}
								class="{baseBtn} {filtroTemporal.tipo === modo.value ? activeBtn : inactiveBtn}"
							>
								{modo.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<p class="text-xs font-medium uppercase tracking-wide text-text-muted">Estado</p>
					<div class="flex flex-wrap gap-2">
						{#each estados as estado (estado.value)}
							<button
								type="button"
								onclick={() => (filtroEstado = estado.value)}
								class="{baseBtn} {filtroEstado === estado.value ? activeBtn : inactiveBtn}"
							>
								{estado.label}
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
