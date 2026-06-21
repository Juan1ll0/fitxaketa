<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Chart, Plugin, TooltipItem } from 'chart.js';
	import type { Periodo } from '$lib/stores/app-state';
	import type { DatosGrafica } from '$lib/utils/dashboard';
	import { formatearHora, etiquetaEjeX } from '$lib/utils/dashboard';

	let { datos, periodo }: { datos: DatosGrafica; periodo: Periodo } = $props();

	let canvas: HTMLCanvasElement;
	let chart = $state<Chart | null>(null);
	let chartDatos: DatosGrafica = { labels: [], datasets: [] };
	let isDestroyed = false;

	let etiquetaX = $derived(etiquetaEjeX(periodo));

	function calcularTotalApilado(datasets: Chart['data']['datasets'], index: number) {
		let total = 0;
		for (const ds of datasets) {
			const val = ds.data[index];
			if (typeof val === 'number' && val > 0) total += val;
		}
		return total;
	}

	const dataLabelsPlugin: Plugin<'bar'> = {
		id: 'fitxaketaDataLabels',
		afterDatasetsDraw(chartInstance) {
			const { ctx } = chartInstance;
			const numLabels = chartInstance.data.labels?.length ?? 0;
			const meta = chartInstance.getDatasetMeta(chartInstance.data.datasets.length - 1);
			for (let i = 0; i < numLabels; i++) {
				const total = calcularTotalApilado(chartInstance.data.datasets, i);
				if (total <= 0) continue;
				const bar = meta.data[i];
				if (!bar) continue;
				const valor = Math.round(total * 10) / 10;
				ctx.save();
				ctx.fillStyle = '#f8fafc';
				ctx.font = '12px system-ui, sans-serif';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'bottom';
				ctx.fillText(`${valor}h`, bar.x, bar.y - 4);
				ctx.restore();
			}
		}
	};

	function tooltipCallbacks() {
		return {
			title: (items: TooltipItem<'bar'>[]) => {
				if (!items.length) return '';
				const idx = items[0].dataIndex;
				if (periodo === 'año') return chartDatos.labels[idx] ?? '';
				const jornada = chartDatos.datasets[0]?.jornadasPorLabel[idx];
				if (!jornada || Array.isArray(jornada)) return chartDatos.labels[idx] ?? '';
				return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(jornada.start_time));
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
			}
		};
	}

	function crearChart(ChartCls: typeof Chart) {
		chartDatos = datos;
		chart = new ChartCls(canvas, {
			type: 'bar',
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
				layout: { padding: { top: 20 } },
				plugins: {
					legend: { display: false },
					tooltip: { callbacks: tooltipCallbacks() }
				},
				scales: {
					x: {
						stacked: true,
						ticks: { color: '#94a3b8' },
						grid: { display: false }
					},
					y: {
						stacked: true,
						ticks: { color: '#94a3b8', callback: (val) => `${val}h` },
						grid: { color: 'rgba(148, 163, 184, 0.1)' }
					}
				}
			},
			plugins: [dataLabelsPlugin]
		});
	}

	onMount(async () => {
		const mod = await import('chart.js');
		if (isDestroyed) return;
		mod.Chart.register(mod.BarController, mod.BarElement, mod.CategoryScale, mod.LinearScale, mod.Tooltip, mod.Legend);
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
	{#if etiquetaX}
		<p class="mt-2 text-center text-sm text-text-muted">{etiquetaX}</p>
	{/if}
</div>
