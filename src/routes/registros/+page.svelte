<script lang="ts">
	import { getAllJornadas, type Jornada } from '$lib/db';

	let jornadas = $state<Jornada[]>([]);

	$effect(() => {
		loadJornadas();
	});

	async function loadJornadas() {
		jornadas = await getAllJornadas();
	}

	function formatDateTime(date: Date | null): string {
		if (!date) return '—';
		return date.toLocaleString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function formatDuration(minutes: number | null): string {
		if (minutes == null) return 'En curso';
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		if (h === 0) return `${m}min`;
		return `${h}h ${m}min`;
	}

	function formatCoords(lat: number | null, lng: number | null): string {
		if (lat == null || lng == null) return '—';
		return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
	}
</script>

<svelte:head>
	<title>Registros - Fitxaketa</title>
</svelte:head>

<div class="min-h-screen px-4 py-8">
	<div class="mx-auto max-w-2xl">
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-2xl font-bold">Registros</h1>
			<a href="/" class="text-primary hover:text-primary-dark underline"> Volver </a>
		</div>

		{#if jornadas.length === 0}
			<div class="rounded-2xl bg-surface-light p-8 text-center">
				<p class="text-text-muted">No hay registros todavía</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each jornadas as jornada (jornada.id)}
					<div class="rounded-xl bg-surface-light p-4">
						<div class="flex items-center justify-between">
							<span class="font-mono text-sm text-text-muted">
								{formatDateTime(jornada.start_time)}
							</span>
							<span
								class="rounded-full px-3 py-1 text-xs font-semibold {jornada.status === 'closed'
									? 'bg-danger/20 text-danger'
									: 'bg-success/20 text-success'}"
							>
								{jornada.status === 'closed' ? 'cerrada' : 'abierta'}
							</span>
						</div>
						<div class="mt-2 flex items-center justify-between text-sm">
							<span class="font-mono text-text-muted">
								{formatDuration(jornada.duration)}
							</span>
							<span class="font-mono text-xs text-text-muted">
								{formatCoords(jornada.lat_start, jornada.lng_start)}
							</span>
						</div>
						{#if jornada.end_time}
							<div class="mt-1 flex items-center justify-between text-xs text-text-muted">
								<span>Salida: {formatDateTime(jornada.end_time)}</span>
								<span class="font-mono">
									{formatCoords(jornada.lat_end, jornada.lng_end)}
								</span>
							</div>
						{/if}
						<div class="mt-1 text-xs text-text-muted">
							Sync: {jornada.synced === 1 ? '✅' : '❌'}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
