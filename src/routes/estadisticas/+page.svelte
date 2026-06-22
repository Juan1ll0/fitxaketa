<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import {
		subscribe,
		getJornadas,
		getSettings,
		cargarJornadas,
		type Periodo
	} from '$lib/stores/app-state';
	import {
		filtrarPorPeriodo,
		calcularResumenPeriodo,
		formatearHorasDecimal,
		formatearFechaLarga,
		prepararDatosGrafica
	} from '$lib/utils/dashboard';
	import { settingsActual } from '$lib/utils/settings';
	import type { Jornada, Settings } from '$lib/db';
	import StatsChart from '$lib/components/StatsChart.svelte';

	let jornadas = $state<Jornada[]>([]);
	let settings = $state<Settings[]>([]);
	let periodo = $state<Periodo>('mes');

	let primerDia = $derived(settingsActual(settings).primer_dia_semana);
	let jornadasFiltradas = $derived(filtrarPorPeriodo(jornadas, periodo, primerDia));
	let resumen = $derived(calcularResumenPeriodo(jornadasFiltradas, settings));
	let datosGrafica = $derived(prepararDatosGrafica(jornadasFiltradas, periodo, settings));
	let fechaHoy = $derived(formatearFechaLarga(new Date()));

	const periodos: { value: Periodo; label: string }[] = [
		{ value: 'semana', label: 'Semana' },
		{ value: 'mes', label: 'Mes' },
		{ value: 'año', label: 'Año' }
	];

	function balanceTexto(min: number): string {
		const signo = min > 0 ? '+' : min < 0 ? '−' : '';
		return signo + formatearHorasDecimal(Math.abs(min) / 60);
	}

	let cajaExceso = $derived(
		resumen.balanceMinutos > 0
			? 'border border-success/30 bg-success/10'
			: resumen.balanceMinutos < 0
				? 'border border-warning/30 bg-warning/10'
				: 'bg-surface-light'
	);
	let textoExceso = $derived(
		resumen.balanceMinutos > 0
			? 'text-success'
			: resumen.balanceMinutos < 0
				? 'text-warning'
				: 'text-text'
	);

	$effect(() => {
		const unsubscribe = subscribe(() => {
			jornadas = getJornadas();
			settings = getSettings();
		});
		return unsubscribe;
	});

	afterNavigate(async () => {
		await cargarJornadas();
	});

	function cambiarPeriodo(p: Periodo) {
		periodo = p;
	}
</script>

<svelte:head>
	<title>Estadísticas - Fitxaketa</title>
</svelte:head>

<div class="min-h-screen bg-surface px-4 py-4">
	<div class="mx-auto max-w-2xl">
		<h1 class="text-2xl font-bold text-text">Estadísticas</h1>

		<div class="mt-4 flex flex-wrap items-center gap-2">
			<div class="flex gap-2">
				{#each periodos as p (p.value)}
					<button
						type="button"
						onclick={() => cambiarPeriodo(p.value)}
						class={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
							periodo === p.value
								? 'bg-primary text-white'
								: 'bg-surface-light text-text-muted hover:bg-surface-light/80'
						}`}
					>
						{p.label}
					</button>
				{/each}
			</div>
			<p class="ml-auto text-sm text-text-muted">{fechaHoy}</p>
		</div>

		<div class="mt-6 rounded-xl bg-surface-light p-4">
			{#if jornadasFiltradas.length === 0}
				<p class="py-12 text-center text-text-muted">No hay datos para este periodo</p>
			{:else}
				<StatsChart datos={datosGrafica} {periodo} />
			{/if}
		</div>

		{#if jornadasFiltradas.length > 0}
			<div class="mt-6 grid grid-cols-3 gap-4">
				<div class="row-span-2 flex flex-col justify-center rounded-xl p-4 {cajaExceso}">
					<p class="text-sm text-text-muted">Exceso</p>
					<p class="text-2xl font-bold {textoExceso}">{balanceTexto(resumen.balanceMinutos)}</p>
				</div>
				<div class="rounded-xl bg-surface-light p-4">
					<p class="text-sm text-text-muted">Total horas</p>
					<p class="text-xl font-bold text-text">{formatearHorasDecimal(resumen.totalHoras)}</p>
					{#if resumen.totalHorasReal !== resumen.totalHoras}
						<p class="text-xs text-text-muted">
							Real: {formatearHorasDecimal(resumen.totalHorasReal)}
						</p>
					{/if}
				</div>
				<div class="rounded-xl bg-surface-light p-4">
					<p class="text-sm text-text-muted">Media diaria</p>
					<p class="text-xl font-bold text-text">{formatearHorasDecimal(resumen.mediaDiaria)}</p>
				</div>
				<div class="rounded-xl bg-surface-light p-4">
					<p class="text-sm text-text-muted">Días trabajados</p>
					<p class="text-xl font-bold text-text">{resumen.diasTrabajados}</p>
				</div>
				<div class="rounded-xl bg-surface-light p-4">
					<p class="text-sm text-text-muted">Jornadas</p>
					<p class="text-xl font-bold text-text">{resumen.totalJornadas}</p>
				</div>
			</div>
		{/if}
	</div>
</div>
