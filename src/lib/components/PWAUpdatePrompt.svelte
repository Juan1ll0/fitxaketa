<script lang="ts">
	import { useRegisterSW } from 'virtual:pwa-register/svelte';

	const { needRefresh, updateServiceWorker, offlineReady } = useRegisterSW({
		onRegistered(r) {
			console.log(`SW registered: ${r}`);
		},
		onRegisterError(error) {
			console.error('SW registration error', error);
		}
	});

	let showOffline = $state(false);

	$effect(() => {
		if ($offlineReady) {
			showOffline = true;
			setTimeout(() => {
				showOffline = false;
			}, 3000);
		}
	});

	function reload() {
		updateServiceWorker(true);
	}
</script>

{#if $needRefresh}
	<div class="fixed bottom-4 left-4 right-4 z-50 rounded-lg bg-primary p-4 shadow-lg">
		<div class="flex items-center justify-between">
			<p class="text-sm font-medium text-white">Nueva versión disponible</p>
			<button
				onclick={reload}
				class="rounded bg-white/20 px-3 py-1 text-sm font-medium text-white hover:bg-white/30"
			>
				Actualizar
			</button>
		</div>
	</div>
{/if}

{#if showOffline}
	<div class="fixed bottom-4 left-4 right-4 z-50 rounded-lg bg-surface-light p-4 shadow-lg">
		<p class="text-sm text-text-muted">App lista para usar sin conexión</p>
	</div>
{/if}
