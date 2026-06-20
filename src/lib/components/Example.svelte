<script lang="ts">
	let texto = $state('Fichar');

	function handleClick() {
		texto = texto === 'Fichar' ? 'Fichado ✓' : 'Fichar';
	}
</script>

<button onclick={handleClick} class="rounded bg-primary px-4 py-2 text-white">
	{texto}
</button>
