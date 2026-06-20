<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import PWAUpdatePrompt from '$lib/components/PWAUpdatePrompt.svelte';

	let { children } = $props();
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
