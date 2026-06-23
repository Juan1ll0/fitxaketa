<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Chart, TooltipItem, Plugin } from 'chart.js';
	import type { Periodo } from '$lib/stores/app-state';
	import type { DatosGrafica } from '$lib/utils/dashboard';
	import { formatearHora, etiquetaEjeX } from '$lib/utils/dashboard';
	import { dibujarLineaObjetivo, balanceTooltipTexto } from '$lib/utils/stats-chart';

	let { datos, periodo }: { datos: DatosGrafica; periodo: Periodo } = $props();

	let canvas: HTMLCanvasElement;
	let chart = $state<Chart | null>(null);
	let chartDatos: DatosGrafica = $state({ labels: [], datasets: [] });
	let isDestroyed = false;

	let etiquetaX = $derived(etiquetaEjeX(periodo));

	const COLOR_NORMAL = '#94a3b8';

	function tickColor(context: { index: number }): string {
		return chartDatos.labelColors?.[context.index] ?? COLOR_NORMAL;
	}

	const COLOR_OBJETIVO = '#ef4444';

	/** Línea de objetivo diario escalonada (un segmento por día). Solo semana/mes. */
	const objetivoPlugin: Plugin<'bar'> = {
		id: 'objetivoDiario',
		afterDraw(c) {
			const objetivos = chartDatos.objetivoDiarioPorLabel;
			if (periodo === 'año' || !objetivos?.length) return;
			dibujarLineaObjetivo(c, objetivos, COLOR_OBJETIVO);
		}
	};

	function balanceTooltip(idx: number): string {
		if (periodo === 'año') return '';
		return balanceTooltipTexto(chartDatos.balancePorLabel?.[idx]);
	}

	function tooltipCallbacks() {
		return {
			title: (items: TooltipItem<'bar'>[]) => {
				if (!items.length) return '';
				const idx = items[0].dataIndex;
				if (periodo === 'año') return chartDatos.labels[idx] ?? '';
				const jornada = chartDatos.datasets[0]?.jornadasPorLabel[idx];
				if (!jornada || Array.isArray(jornada)) return chartDatos.labels[idx] ?? '';
				return new Intl.DateTimeFormat('es-ES', {
					weekday: 'long',
					day: '2-digit',
					month: 'long'
				}).format(new Date(jornada.start_time));
			},
			afterTitle: (items: TooltipItem<'bar'>[]) => {
				if (!items.length) return '';
				const idx = items[0].dataIndex;
				if (periodo === 'año') {
					const jornadas = chartDatos.datasets[0]?.jornadasPorLabel[idx];
					if (Array.isArray(jornadas)) return `${jornadas.length} jornadas`;
					return '';
				}
				const jornada = chartDatos.datasets[0]?.jornadasPorLabel[idx];
				if (!jornada || Array.isArray(jornada)) return '';
				const inicio = formatearHora(new Date(jornada.start_time));
				const fin = jornada.end_time ? formatearHora(new Date(jornada.end_time)) : 'En curso';
				return `${inicio} – ${fin}`;
			},
			label: (item: TooltipItem<'bar'>) => {
				const dur = Number(item.raw);
				const h = Math.floor(dur);
				const m = Math.round((dur - h) * 60);
				return ` ${item.dataset.label}: ${h}h ${m}m`;
			},
			afterBody: (items: TooltipItem<'bar'>[]) =>
				items.length ? balanceTooltip(items[0].dataIndex) : ''
		};
	}

	function crearChart(ChartCls: typeof Chart) {
		chartDatos = datos;
		chart = new ChartCls(canvas, {
			type: 'bar',
			plugins: [objetivoPlugin],
			data: {
				labels: datos.labels,
				datasets: datos.datasets.map((ds) => ({
					label: ds.label,
					data: ds.data,
					backgroundColor: ds.backgroundColor,
					borderRadius: 4
				}))
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: { callbacks: tooltipCallbacks() }
				},
				scales: {
					x: {
						stacked: true,
						ticks: { color: tickColor },
						grid: { display: false }
					},
					y: {
						stacked: true,
						ticks: { color: '#94a3b8', callback: (val) => `${val}h` },
						grid: { color: 'rgba(148, 163, 184, 0.1)' }
					}
				}
			}
		});
	}

	onMount(async () => {
		const mod = await import('chart.js');
		if (isDestroyed) return;
		mod.Chart.register(
			mod.BarController,
			mod.BarElement,
			mod.CategoryScale,
			mod.LinearScale,
			mod.Tooltip,
			mod.Legend
		);
		crearChart(mod.Chart);
	});

	$effect(() => {
		const { labels, datasets } = datos;
		if (!chart) return;
		chartDatos = datos;
		chart.data.labels = labels;
		chart.data.datasets = datasets.map((ds) => ({
			label: ds.label,
			data: ds.data,
			backgroundColor: ds.backgroundColor,
			borderRadius: 4
		}));
		chart.update();
	});

	onDestroy(() => {
		isDestroyed = true;
		chart?.destroy();
		chart = null;
	});
</script>

<div class="flex flex-col">
	<div class="h-64 w-full">
		<canvas bind:this={canvas}></canvas>
	</div>
</div>
