<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import PWAUpdatePrompt from '$lib/components/PWAUpdatePrompt.svelte';
	import { initAppState } from '$lib/stores/app-state';
	import { asegurarPersistencia } from '$lib/utils/persistencia';

	let { children } = $props();

	// Carga el estado (settings, jornadas, jornada abierta) en cualquier ruta de
	// entrada, no solo en Fichar. onMount solo corre en el navegador.
	onMount(async () => {
		// Pide almacenamiento persistente para que el navegador no evacúe la caché del
		// service worker ni el IndexedDB por inactividad (iOS ~7 días / Android por
		// espacio). Fire-and-forget: no debe bloquear la carga de datos.
		void asegurarPersistencia();

		// Mantiene la pantalla de carga (app.html) hasta que los datos están
		// cargados Y un mínimo de tiempo, para que se vea de forma consistente en
		// todas las rutas (si no, en cargas muy rápidas no llega a pintarse) y la
		// vista aparezca ya poblada. `finally` garantiza quitarla aunque falle.
		const minimoVisible = new Promise((r) => setTimeout(r, 300));
		try {
			await Promise.all([initAppState(), minimoVisible]);
		} finally {
			document.getElementById('app-loading')?.remove();
		}
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
