<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import PWAUpdatePrompt from '$lib/components/PWAUpdatePrompt.svelte';
	import { initAppState } from '$lib/stores/app-state';

	let { children } = $props();

	// Carga el estado (settings, jornadas, jornada abierta) en cualquier ruta de
	// entrada, no solo en Fichar. onMount solo corre en el navegador.
	onMount(() => {
		initAppState();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#0f172a" />
</svelte:head>

<div class="min-h-screen bg-surface pb-20 text-text">
	{@render children()}
</div>
<BottomNav />
<PWAUpdatePrompt />
