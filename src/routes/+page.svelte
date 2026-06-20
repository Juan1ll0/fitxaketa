<script lang="ts">
	import {
		initAppState,
		startJornada,
		stopJornada,
		subscribe,
		getClockedIn,
		getElapsed
	} from '$lib/stores/app-state';

	let clockedIn = $state(false);
	let elapsed = $state('00:00:00');

	$effect(() => {
		initAppState();
		const unsubscribe = subscribe(() => {
			clockedIn = getClockedIn();
			elapsed = getElapsed();
		});
		return unsubscribe;
	});

	async function toggleClock() {
		if (clockedIn) {
			await stopJornada();
		} else {
			await startJornada();
		}
	}
</script>

<svelte:head>
	<title>Fitxaketa</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center px-4">
	<div class="w-full max-w-sm space-y-8 text-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Fitxaketa</h1>
			<p class="mt-2 text-text-muted">Registro de jornada</p>
		</div>

		<div class="rounded-2xl bg-surface-light p-8">
			<p class="font-mono text-5xl font-bold tabular-nums tracking-wider">{elapsed}</p>
			<button
				onclick={toggleClock}
				class="mt-6 w-full rounded-xl px-6 py-4 text-lg font-semibold transition-colors {clockedIn
					? 'bg-danger hover:bg-danger-dark text-white'
					: 'bg-primary hover:bg-primary-dark text-white'}"
			>
				{clockedIn ? 'Fichar salida' : 'Fichar entrada'}
			</button>
		</div>

		<a href="/registros" class="text-primary hover:text-primary-dark underline"> Ver registros </a>
	</div>
</div>
