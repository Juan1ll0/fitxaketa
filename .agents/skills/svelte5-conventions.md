# Convenciones Svelte 5 + SvelteKit v2

> Los principios generales (SOLID, DRY, funciones, errores, targets) están en `.agents/skills/coding-standards.md`. Aquí solo lo específico de frontend Svelte.

---

## Checklist normativo

### Runes

- Siempre runes: `$state`, `$derived`, `$effect`, `$props`
- PROHIBIDO: `$:`, `export let`, stores clásicos salvo justificación
- `onMount` solo si `$effect` no sirve (necesidad explícita de "solo una vez al montar")
- `$derived` para todo valor calculado — Svelte lo memoriza; no recalcular en handlers

### Componentes

- Un componente = una responsabilidad visual o de interacción
- [lint] Componente ≤ 150 líneas; template > 80 líneas → extraer subcomponentes
- Lógica de negocio NUNCA dentro del componente — vive en `src/lib/` y el componente la orquesta
- Nombrar por lo que muestran, no por dónde van: `FichajeButton`, no `HomepageButton`
- Orden interno del `<script>`: imports → props → estado → derivados → efectos → funciones

### Estado compartido

1. Props + eventos (padre/hijo) — primera opción siempre
2. Módulo `.svelte.ts` con `$state` exportado — para estado entre rutas
3. Stores clásicos — solo con justificación registrada

### Imports

- Siempre alias `$lib/` — prohibidas rutas relativas tipo `../../lib/`
- Chart.js y Leaflet: import dinámico en el componente que los usa, nunca estático ni global

### UI

- Texto de UI en español
- Toda operación async con estados visibles: `idle | loading | error` — nunca dejar al usuario sin feedback
- Accesibilidad: `aria-label` en botones sin texto, `<label for>` en inputs, color nunca como único indicador de estado, foco visible

### Routing

- `+page.svelte` / `+layout.svelte` / `+error.svelte`
- Evitar `+page.server.ts` — este proyecto es client-only

---

## Apéndice de ejemplos

### B1 — Runes básicos

```svelte
<script lang="ts">
	let { name, age = 0 }: { name: string; age?: number } = $props();
	let count = $state(0);
	let doubled = $derived(count * 2);
	$effect(() => {
		console.log(count);
	});
</script>
```

### B2 — Componente que orquesta, lógica fuera

```svelte
<script lang="ts">
	import { calcularHorasTrabajadas } from '$lib/utils/fichaje-calc';
	import { fichajeService } from '$lib/services/fichaje-service';

	let fichajes = $state<Fichaje[]>([]);
	let horasHoy = $derived(calcularHorasTrabajadas(fichajes, new Date()));

	async function onFichar() {
		await fichajeService.registrar('entrada');
	}
</script>
```

### B3 — Estado compartido en módulo .svelte.ts

```ts
// src/lib/stores/app-state.svelte.ts
export const syncState = $state({
	pendientes: 0,
	ultimaSync: null as Date | null,
	error: null as string | null
});
```

### B4 — Estados de operación async en UI

```svelte
<script lang="ts">
	let estado = $state<'idle' | 'loading' | 'error'>('idle');
	let errorMsg = $state('');

	async function fichar() {
		estado = 'loading';
		const result = await fichajeService.registrar('entrada');
		if (!result.ok) {
			estado = 'error';
			errorMsg = result.error;
		} else estado = 'idle';
	}
</script>

{#if estado === 'error'}
	<p class="text-danger text-sm">{errorMsg}</p>
{/if}
```

### B5 — Estructura de componentes del proyecto

```
src/lib/components/
  FichajeButton.svelte       ← botón de acción principal
  EstadoCronometro.svelte    ← tiempo transcurrido
  GraficaHoras.svelte        ← Chart.js encapsulado (import dinámico)
  MapaUbicaciones.svelte     ← Leaflet encapsulado (import dinámico)
  SyncIndicator.svelte       ← estado de sincronización
```
