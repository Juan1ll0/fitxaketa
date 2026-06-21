<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Chart, TooltipItem } from 'chart.js';
	import type { Jornada } from '$lib/db';
	import { formatearHora } from '$lib/utils/dashboard';

	let { jornadas }: { jornadas: Jornada[] } = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;
	let chartJornadas: Jornada[] = [];
	let isDestroyed = false;

	function construirDatos(jds: Jornada[]) {
		const ordenadas = [...jds].sort(
			(a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
		);
		const labels = ordenadas.map((j) => {
			const f = new Date(j.start_time);
			return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}`;
		});
		const datos = ordenadas.map((j) => (j.duration ?? 0) / 60);
		return { ordenadas, labels, datos };
	}

	function tooltipCallbacks() {
		return {
			title: (items: TooltipItem<'bar'>[]) => {
				const j = chartJornadas[items[0]?.dataIndex ?? 0];
				if (!j) return '';
				return new Intl.DateTimeFormat('es-ES', {
					weekday: 'long',
					day: '2-digit',
					month: 'long'
				}).format(new Date(j.start_time));
			},
			afterTitle: (items: TooltipItem<'bar'>[]) => {
				const j = chartJornadas[items[0]?.dataIndex ?? 0];
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
		const { ordenadas, labels, datos } = construirDatos(jornadas);
		chartJornadas = ordenadas;
		chart = new ChartCls(canvas, {
			type: 'bar',
			data: {
				labels,
				datasets: [
					{
						label: 'Horas',
						data: datos,
						backgroundColor: 'rgba(59, 130, 246, 0.7)',
						borderRadius: 4
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
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
		if (!chart) return;
		const { ordenadas, labels, datos } = construirDatos(jornadas);
		chartJornadas = ordenadas;
		chart.data.labels = labels;
		chart.data.datasets[0].data = datos;
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
