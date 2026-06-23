<script lang="ts">
	import type { FiltroTemporal, FiltroEstado } from '$lib/utils/historial-filtros';
	import { claveDia } from '$lib/utils/fecha-negocio';
	import PeriodoNavegacion from './PeriodoNavegacion.svelte';
	import FechaFiltro from './FechaFiltro.svelte';
	import RangoFechas from './RangoFechas.svelte';

	let {
		filtroTemporal = $bindable<FiltroTemporal>(),
		filtroEstado = $bindable<FiltroEstado>(),
		primerDia = 1,
		onExportar
	}: {
		filtroTemporal: FiltroTemporal;
		filtroEstado: FiltroEstado;
		primerDia?: number;
		onExportar: () => void;
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
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-2">
		{#if filtroTemporal.tipo === 'periodo'}
			{@const f = filtroTemporal}
			<div class="min-w-0 flex-1">
				<PeriodoNavegacion
					bind:periodo={() => f.periodo, (p) => (filtroTemporal = { ...f, periodo: p })}
					bind:fechaReferencia={
						() => f.fechaReferencia, (fr) => (filtroTemporal = { ...f, fechaReferencia: fr })
					}
					{primerDia}
				/>
			</div>
		{/if}
		<button
			type="button"
			onclick={onExportar}
			class="ml-auto min-h-[44px] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
		>
			Exportar
		</button>
	</div>

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

	{#if filtroTemporal.tipo === 'fecha'}
		{@const f = filtroTemporal}
		<div class="flex flex-wrap items-center gap-2">
			<FechaFiltro
				bind:fecha={() => f.fecha, (v) => (filtroTemporal = { ...f, fecha: v })}
				{hoyISO}
			/>
			<button type="button" onclick={limpiar} class="{baseBtn} {inactiveBtn}">Limpiar</button>
		</div>
	{:else if filtroTemporal.tipo === 'rango'}
		{@const f = filtroTemporal}
		<div class="flex flex-wrap items-center gap-2">
			<RangoFechas
				bind:desde={() => f.desde, (d) => (filtroTemporal = { ...f, desde: d })}
				bind:hasta={() => f.hasta, (h) => (filtroTemporal = { ...f, hasta: h })}
				{hoyISO}
			/>
			<button type="button" onclick={limpiar} class="{baseBtn} {inactiveBtn}">Limpiar</button>
		</div>
	{/if}

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
