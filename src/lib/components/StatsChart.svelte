<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Chart, Plugin, TooltipItem } from 'chart.js';
	import type { Periodo } from '$lib/stores/app-state';
	import type { BarraGrafica } from '$lib/utils/dashboard';
	import { formatearHora } from '$lib/utils/dashboard';

	let { datos, periodo }: { datos: BarraGrafica[]; periodo: Periodo } = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;
	let chartBars: BarraGrafica[] = [];
	let isDestroyed = false;

	const dataLabelsPlugin: Plugin<'bar'> = {
		id: 'fitxaketaDataLabels',
		afterDatasetsDraw(chartInstance) {
			const { ctx } = chartInstance;
			const meta = chartInstance.getDatasetMeta(0);
			const dataset = chartInstance.data.datasets[0];
			meta.data.forEach((bar, index) => {
				const raw = dataset.data[index];
				if (raw == null || typeof raw !== 'number') return;
				const valor = Math.round(raw * 10) / 10;
				const texto = Number.isInteger(valor) ? `${valor}h` : `${valor}h`;
				ctx.save();
				ctx.fillStyle = '#f8fafc';
				ctx.font = '12px system-ui, sans-serif';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'bottom';
				ctx.fillText(texto, bar.x, bar.y - 4);
				ctx.restore();
			});
		}
	};

	function tooltipCallbacks() {
		return {
			title: (items: TooltipItem<'bar'>[]) => {
				const barra = chartBars[items[0]?.dataIndex ?? 0];
				if (!barra) return '';
				if (periodo === 'año') return barra.label;
				const j = barra.jornadas[0];
				if (!j) return barra.label;
				return new Intl.DateTimeFormat('es-ES', {
					weekday: 'long',
					day: '2-digit',
					month: 'long'
				}).format(new Date(j.start_time));
			},
			afterTitle: (items: TooltipItem<'bar'>[]) => {
				const barra = chartBars[items[0]?.dataIndex ?? 0];
				if (!barra) return '';
				if (periodo === 'año') return `${barra.jornadas.length} jornadas`;
				const j = barra.jornadas[0];
				if (!j) return '';
				const inicio = formatearHora(new Date(j.start_time));
				const fin = j.end_time ? formatearHora(new Date(j.end_time)) : 'En curso';
				return `${inicio} – ${fin}`;
			},
			label: (item: TooltipItem<'bar'>) => {
				const dur = Number(item.raw);
				const h = Math.floor(dur);
				const m = Math.round((dur - h) * 60);
				return ` Duración: ${h}h ${m}m`;
			}
		};
	}

	function crearChart(ChartCls: typeof Chart) {
		chartBars = datos;
		chart = new ChartCls(canvas, {
			type: 'bar',
			data: {
				labels: datos.map((d) => d.label),
				datasets: [
					{
						label: 'Horas',
						data: datos.map((d) => d.valor),
						backgroundColor: datos.map((d) => d.color),
						borderRadius: 4
					}
				]
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
					x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
					y: {
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
		if (!chart) return;
		chartBars = datos;
		chart.data.labels = datos.map((d) => d.label);
		chart.data.datasets[0].data = datos.map((d) => d.valor);
		chart.data.datasets[0].backgroundColor = datos.map((d) => d.color);
		chart.update();
	});

	onDestroy(() => {
		isDestroyed = true;
		chart?.destroy();
		chart = null;
	});
</script>

<div class="h-64 w-full">
	<canvas bind:this={canvas}></canvas>
</div>
