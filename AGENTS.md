# AGENTS.md

## Objetivo del Proyecto

Sistema de fichaje de horas de trabajo: eficiente, gratuito, privado y de bajo consumo. Fichaje automático por geofencing (iOS Shortcuts / Android MacroDroid), contingencia manual vía PWA, y dashboard con analíticas. Sin servidores propios — backend en Google Apps Script + Google Sheets.

## Regla Innegociable: ante lo desconocido, preguntar

Ningún agente inventa lo que no conoce. Si falta un requisito, un AC es ambiguo, o una decisión técnica no está cubierta por la spec, el plan o estos documentos → **DETENTE y pregunta al humano** (vía `@orchestrator`). Nunca asumas, nunca rellenes huecos con suposiciones "plausibles". Aplica por igual a **requisitos** (el _qué_) y a **decisiones técnicas** (el _cómo_): nombres de campos, contratos de API, formatos, comportamientos no especificados, elección de librerías, etc. Una suposición no confirmada es un defecto, no un avance. Preguntar nunca es un fallo; inventar siempre lo es.

## Commands

```bash
npm run dev          # Dev server (localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run check        # svelte-check — tipos Y warnings a11y (--fail-on-warnings)
npm run check:watch  # svelte-check in watch mode
npm run lint         # ESLint — complejidad, tamaño, no-any (+ gas/** con globals GAS)
npm run format       # Prettier --write (incluye orden de clases Tailwind)
npm run depcruise    # dependency-cruiser — reglas de capas (utils puras, services sin UI)
npm run knip         # Knip — código muerto (ficheros, exports, deps sin usar)
npm run dup          # jscpd — duplicación de código (DRY mecánico)
npm run secrets      # secretlint — tokens/credenciales hardcodeadas
npm run size         # size-limit — presupuesto de bundle (tras build)
npm run quality      # TODO lo anterior en cadena — el quality gate completo
```

Run `npm run format && npm run lint && npm run check` after every code change. Run `npm run quality` before closing a feature.

## Quality Gates

Dos niveles de marcadores de calidad:

- **Mecánicos** (`npm run quality`): formato Prettier, ESLint (complejidad ≤ 10, funciones ≤ 50 líneas, ficheros ≤ 120/150, anidación ≤ 3, ≤ 4 params, sin `any`), tipos + a11y (svelte-check con warnings como error), capas (dependency-cruiser: `src/lib/utils/` pura, services sin UI, sin ciclos), código muerto (Knip), duplicación (jscpd ≤ 2%), secretos (secretlint), build, bundle (size-limit: entry < 150 KB / total < 300 KB gzip).
- **Cualitativos** (architect contra `.agents/skills/coding-standards.md`): SOLID, pureza de funciones, DRY con criterio, estrategia de rendimiento.

El cierre de features pasa por el quality gate G1-G11 de `.agents/workflows/close-feature.md` (los mecánicos + tests + Lighthouse ≥ 90).

## Node.js

Requires Node 24+ via fnm. Shell sessions need `eval "$(fnm env)" && fnm use 24` before running npm commands.

## Stack Tecnológico

### Frontend (PWA)

- **SvelteKit v2** + **Svelte 5** (runes mode: `$state`, `$props`, `$effect`, `$derived`)
- **Tailwind CSS v4** — CSS-first config en `src/app.css` via `@theme {}`. Sin `tailwind.config.js`. Plugin `@tailwindcss/vite`
- **Chart.js** — Gráficas en `<canvas>` nativo para estadísticas (horas/días/meses)
- **Leaflet.js** + OpenStreetMap — Mapas de ubicaciones sin APIs de pago
- **Dexie.js** — IndexedDB wrapper para almacenamiento offline-first
- **PWA** via `@vite-pwa/sveltekit` con estrategia `injectManifest`. Service worker en `src/service-worker.ts`

### Backend (Nube)

- **Google Sheets** — Base de datos principal (pestañas `Fichajes` y `Ubicaciones`)
- **Google Apps Script** — Web App con `doPost(e)` / `doGet(e)`, protegida por Token Secreto (API Key)

### Automatización Móvil (Sensores)

- **iOS:** App Atajos (Shortcuts) — GPS en segundo plano, alertas interactivas en pantalla de bloqueo
- **Android:** MacroDroid / Tasker — Misma lógica HTTP POST

## Arquitectura

- **No `svelte.config.js`** — adapter y kit config en `vite.config.ts` dentro del plugin `sveltekit()`
- Config de PWA y Tailwind también en `vite.config.ts`

## Flujo de Datos

```
[ Atajo iOS GPS ] ──(Token + Acción)──┐
                                       ▼
[ Botón PWA Svelte ] ──(Token + Datos)─┼─► [ Google Apps Script ] ─► [ Google Sheets ]
                                       ▲
[ Dashboard PWA ] ◄──(JSON GET)────────┘
```

1. **Seguridad:** Toda petición HTTP requiere `token` secreto. Tráfico por HTTPS.
2. **Offline-First:** Fichajes manuales se guardan en IndexedDB. Si hay red, se sincronizan con Google Sheets. El Service Worker detecta reconexión (`window.online`) y sube en segundo plano.

## PWA Gotchas

- `kit.serviceWorker.register: false` en vite.config.ts — evita doble registro del SW
- Workbox `globPatterns` debe usar prefijo `client/` (ej: `client/**/*.{js,css}`) — si no, se precachean archivos del servidor y rompe la app
- Módulos virtuales PWA (`virtual:pwa-register/svelte`) solo importar client-side (en componentes, no en `+layout.server.ts`)
- `process.env.NODE_ENV` definido en vite.config.ts — necesario para tree-shaking de Workbox en producción

## Seguridad

- **No hardcodear claves:** El `TOKEN_SECRETO` y la URL de Google Script se gestionan vía formulario de configuración inicial en la PWA (guardado en `localStorage`) o variables de entorno `.env.local` (excluidas en `.gitignore`)
- **CORS:** Toda petición `fetch` a Google Apps Script debe incluir `mode: 'no-cors'`

## Spec-Driven Development (Multi-Agente)

Arquitectura multi-agente SDD con separación de poderes. Ver `.agents/docs/arquitectura-agentes-sdd.md`.

Agentes disponibles en OpenCode (invocar con `@nombre`). Cada agente corre sobre el proveedor `opencode-go`; el modelo resuelve el `model-tier` portable que declara su rol en `.agents/roles/`: **high** para razonamiento profundo (planificar, validar), **medium** para implementación y gestión, **low** para tareas mecánicas. El `architect` usa una familia distinta al `planner` a propósito (segundo par de ojos).

| Agente          | Rol                                             | Modelo (`opencode-go/…`) | Tier   | Color             |
| --------------- | ----------------------------------------------- | ------------------------ | ------ | ----------------- |
| `@orchestrator` | Punto de entrada, clasifica y delega (primario) | `qwen3.7-plus`           | medium | `#3B82F6` azul    |
| `@planner`      | Genera planes desde specs aprobadas             | `qwen3.7-max`            | high   | `#EC4899` rosa    |
| `@architect`    | Valida planes y código (solo lectura)           | `deepseek-v4-pro`        | high   | `#F59E0B` ámbar   |
| `@pm`           | Estado, sync, drift-check, close-feature        | `glm-5.2`                | medium | `#14B8A6` teal    |
| `@doc-writer`   | Mantiene docs sincronizadas                     | `deepseek-v4-flash`      | low    | `#64748B` gris    |
| `@impl-svelte`  | Componentes Svelte 5, rutas, stores             | `kimi-k2.7-code`         | medium | `#FF3E00` naranja |
| `@impl-gas`     | Google Apps Script backend                      | `kimi-k2.7-code`         | medium | `#34A853` verde   |
| `@impl-pwa`     | Service Worker, Dexie, offline                  | `kimi-k2.7-code`         | medium | `#5A0FC8` morado  |
| `@impl-ui`      | Tailwind v4, Chart.js, Leaflet, UX              | `qwen3.7-plus`           | medium | `#06B6D4` cian    |
| `@tester`       | Tests desde ACs de la spec                      | `minimax-m2.7`           | medium | `#EF4444` rojo    |
| `@vcs`          | Git/GitHub: ramas, commits, push, PRs           | `glm-5.2`                | medium | `#24292E` grafito |

Flujo: spec aprobada → `@planner` → revisión humana → `@architect` → aprobación humana → `@vcs` crea rama → implementers (commit por fase) → `@tester` → `@pm close-feature` → `@vcs` push + PR → humano mergea = cierre.

Specs en `specs/features/`. Template en `specs/_template.md`. Ver `specs/README.md` para el workflow.

## Control de Versiones (Git/GitHub)

Gestionado por `@vcs` (ver `.agents/workflows/git-flow.md`). Reglas:

- **Ramas:** `feat/NNN-nombre`, `fix/NNN-nombre`, `chore/…` desde `main`. Commits convencionales, uno por fase del plan.
- **El que implementa no publica** (P4): solo `@vcs` opera Git. Hace commits locales libremente, pero `push` y abrir PR requieren confirmación humana (P5), y **nunca** hace merge ni `--force` (enforced por `permission` en `.opencode/agent/vcs.md`).
- **Cierre = merge del PR:** el humano mergea y escribe `status: done` en la **spec** (el plan ya no lleva `done`).
- **`main` protegida:** sin push directo; merge solo vía PR con revisión (refuerzo server-side de P5).
- **GitHub vía MCP:** servidor MCP oficial configurado en `.opencode/opencode.json`, autenticado con un PAT fine-grained en la env var `GITHUB_MCP_PAT` (nunca en el repo). Permisos del PAT: solo el repo, Contents RW + Pull requests RW + Metadata R.

## Project Structure

```
src/
├── lib/
│   ├── components/        # Svelte components ($lib alias)
│   └── index.ts           # Public API exports
├── routes/                # File-based routing
│   ├── +layout.svelte     # Root layout (CSS, PWA prompt)
│   └── +page.svelte       # Landing page
├── app.css                # Tailwind + theme config
├── app.html               # HTML template
├── app.d.ts               # Type declarations
├── pwa.d.ts               # PWA type declarations
└── service-worker.ts      # PWA service worker (injectManifest)
static/                    # Static assets (icons, robots.txt)
specs/                     # Feature specs (SDD workflow)
```

## Conventions

- Dark mode by default (`bg-surface`, `text-text` theme colors)
- Spanish UI text (app is for Spanish-speaking users)
- Svelte 5 runes everywhere — no legacy `$:` reactive statements
- Use `$lib/` alias for imports from `src/lib/`
