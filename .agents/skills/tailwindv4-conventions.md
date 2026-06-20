# Convenciones Tailwind CSS v4

> Principios generales en `.agents/skills/coding-standards.md`. Aquí lo específico de estilos y sistema visual.

---

## Checklist normativo

- Config CSS-first: TODO en `src/app.css` via `@theme {}` — PROHIBIDO crear `tailwind.config.js`
- Dark mode por defecto: fondo `bg-surface`, texto `text-text` — usar siempre las variables del tema, no colores sueltos
- Mobile-first: diseñar para < 640px, expandir con `sm:` `md:` `lg:`
- Espaciado en escala de 4px (`p-1`=4px, `p-2`=8px, `p-4`=16px...)
- Sin CSS custom en componentes salvo lo que Tailwind no cubra (animaciones complejas, integración Leaflet/Chart.js)
- Estados interactivos siempre: `hover:` + `transition-colors` en botones y enlaces
- Plugin: `@tailwindcss/vite` ya configurado en vite.config.ts — no añadir PostCSS

---

## Apéndice de ejemplos

### E1 — Tema en app.css

```css
@import 'tailwindcss';

@theme {
	--color-surface: #0f172a;
	--color-surface-elevated: #1e293b;
	--color-text: #f1f5f9;
	--color-text-muted: #94a3b8;
	--color-primary: #3b82f6;
	--color-primary-hover: #2563eb;
	--color-success: #22c55e;
	--color-danger: #ef4444;
	--color-warning: #f59e0b;
	--font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
	--radius-card: 0.75rem;
}
```

### E2 — Componentes base del sistema

```html
<!-- Card -->
<div class="bg-surface-elevated rounded-card p-4 shadow-lg">
	<!-- Botón primario -->
	<button
		class="bg-primary hover:bg-primary-hover rounded-lg px-4 py-2 font-medium text-white transition-colors"
	>
		<!-- Botón de peligro -->
		<button
			class="bg-danger rounded-lg px-4 py-2 font-medium text-white transition-colors hover:bg-red-600"
		>
			<!-- Input -->
			<input
				class="bg-surface text-text focus:ring-primary w-full rounded-lg border border-white/10 px-3 py-2 focus:ring-2 focus:outline-none"
			/>

			<!-- Badge de estado -->
			<span class="bg-success/20 text-success rounded-full px-2 py-1 text-xs font-medium"
				>Activo</span
			>
		</button>
	</button>
</div>
```

### E3 — Clases dinámicas en Svelte

```svelte
<div class={activo ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}>...</div>
```
