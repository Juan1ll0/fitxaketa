<script lang="ts">
	import type { Periodo } from '$lib/stores/app-state';
	import {
		navegarPeriodo,
		esPeriodoActual,
		obtenerPuntoMedioPeriodo,
		formatearIndicadorPeriodo
	} from '$lib/utils/dashboard';
	import { PRIMER_DIA_SEMANA } from '$lib/utils/fecha-negocio';

	let {
		periodo = $bindable<Periodo>(),
		fechaReferencia = $bindable<Date>(),
		primerDia = PRIMER_DIA_SEMANA
	}: {
		periodo: Periodo;
		fechaReferencia: Date;
		primerDia?: number;
	} = $props();

	const periodos: { value: Periodo; label: string }[] = [
		{ value: 'semana', label: 'Semana' },
		{ value: 'mes', label: 'Mes' },
		{ value: 'año', label: 'Año' }
	];

	let esActual = $derived(esPeriodoActual(periodo, fechaReferencia, new Date(), primerDia));
	let indicador = $derived(formatearIndicadorPeriodo(periodo, fechaReferencia, primerDia));

	function anterior() {
		fechaReferencia = navegarPeriodo(periodo, fechaReferencia, 'anterior', primerDia);
	}

	function siguiente() {
		fechaReferencia = navegarPeriodo(periodo, fechaReferencia, 'siguiente', primerDia);
	}

	function irAHoy() {
		fechaReferencia = new Date();
	}

	function cambiarPeriodo(nuevo: Periodo) {
		const orden: Periodo[] = ['semana', 'mes', 'trimestre', 'año'];
		if (orden.indexOf(nuevo) < orden.indexOf(periodo)) {
			const puntoMedio = obtenerPuntoMedioPeriodo(periodo, fechaReferencia, primerDia);
			const hoy = new Date();
			fechaReferencia = puntoMedio.getTime() > hoy.getTime() ? hoy : puntoMedio;
		}
		periodo = nuevo;
	}
</script>

<nav aria-label="Navegación temporal" class="flex flex-col gap-3">
	<div class="flex items-center gap-1">
		<button
			type="button"
			onclick={anterior}
			aria-label="Periodo anterior"
			class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-light text-text transition-colors hover:bg-surface-light/70 active:bg-surface-light/50"
		>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				aria-hidden="true"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="m15 18-6-6 6-6" />
			</svg>
		</button>

		<button
			type="button"
			onclick={irAHoy}
			disabled={esActual}
			aria-disabled={esActual}
			aria-label="Volver al periodo actual"
			class="min-w-0 flex-1 truncate px-2 py-2 text-center text-sm transition-all {esActual
				? 'cursor-default font-medium text-text-muted'
				: 'cursor-pointer font-semibold text-text hover:text-primary hover:underline'}"
		>
			{indicador}
		</button>

		<button
			type="button"
			onclick={siguiente}
			disabled={esActual}
			aria-disabled={esActual}
			aria-label="Periodo siguiente"
			class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-light text-text transition-colors hover:bg-surface-light/70 active:bg-surface-light/50 {esActual
				? 'opacity-40 cursor-not-allowed'
				: ''}"
		>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				aria-hidden="true"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="m9 18 6-6-6-6" />
			</svg>
		</button>
	</div>

	<!-- Fila 2: Selector + chip Hoy -->
	<div class="flex items-center gap-2">
		<div class="flex gap-1">
			{#each periodos as p (p.value)}
				<button
					type="button"
					onclick={() => cambiarPeriodo(p.value)}
					class={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
						periodo === p.value
							? 'bg-primary text-white'
							: 'bg-surface-light text-text-muted hover:bg-surface-light/70'
					}`}
				>
					{p.label}
				</button>
			{/each}
		</div>

		<button
			type="button"
			onclick={irAHoy}
			disabled={esActual}
			aria-disabled={esActual}
			class="ml-auto rounded-full px-3 py-1 text-xs font-medium transition-colors {esActual
				? 'opacity-40 cursor-not-allowed bg-surface-light text-text-muted'
				: 'bg-primary/15 text-primary hover:bg-primary/25'}"
		>
			Hoy
		</button>
	</div>
</nav>
