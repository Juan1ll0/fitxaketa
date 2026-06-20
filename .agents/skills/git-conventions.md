# Convenciones Git/GitHub — Fitxaketa

Fuente de verdad portable para el agente `@vcs`. El control de versiones respeta las puertas humanas (P5): los commits locales son libres; `push`, abrir PR y **merge** son outward-facing.

---

## Ramas

- Base: `main` (protegida — sin push directo, merge solo vía PR).
- Una rama por feature/bugfix, creada desde `main` actualizado:
  - `feat/NNN-nombre` — feature (NNN = número de la spec).
  - `fix/NNN-nombre` — bugfix sobre una spec/AC existente.
  - `chore/descripcion` — tareas sin spec (tooling, deps, config).
- Nombre en kebab-case, derivado del nombre de la spec.

## Commits (Conventional Commits)

Formato: `tipo(NNN): asunto`

- Tipos: `feat`, `fix`, `test`, `docs`, `chore`, `refactor`.
- Asunto en imperativo, ≤ 72 caracteres, sin punto final.
- Cuerpo (opcional): el **porqué**, no el qué. Líneas ≤ 72.
- Footer: `Refs: AC-01, AC-02` cuando el commit cubre ACs concretos.

Ejemplos:

```
feat(006): añade configuración base de Vitest y Playwright

Separa vitest.config.ts de vite.config.ts para no contaminar el build.

Refs: AC-09, AC-12, AC-13
```

```
test(006): tests E2E de geolocalización y modo offline

Refs: AC-05, AC-06
```

### Granularidad

- **Un commit por fase del plan.** Ni un commit monolítico al final, ni micro-commits por fichero.
- Cada commit debe dejar el árbol en un estado coherente (lint verde antes de commitear).

## Pull Requests

- Se abre **solo en el cierre**, tras gates verdes del `@pm` y confirmación humana.
- Título: `feat(NNN): <nombre de la feature>`.
- Cuerpo (plantilla):

```markdown
## Spec

`specs/features/NNN-nombre.md` · plan `specs/features/NNN-nombre.plan.md`

## Acceptance Criteria

- [x] AC-01: …
- [x] AC-02: …

## Quality Gate (reporte de @pm)

G1–G9 (`npm run quality`): ✓
G10 tests: ✓ N/N
G11 Lighthouse: ✓ / PENDIENTE_MANUAL

## Notas

<decisiones o riesgos relevantes>
```

- El **merge lo hace el humano** y es la señal de cierre → tras mergear, el humano escribe `status: done` en la spec. `@vcs` NUNCA mergea.

## Prohibido

- `git push --force` / `--force-with-lease` sobre ramas compartidas.
- `git reset --hard` que descarte trabajo no respaldado.
- Reescribir historial ya publicado (rebase de commits pusheados).
- Commitear: secretos, `.env*`, `node_modules/`, artefactos de build (`build/`, `.svelte-kit/`) o de test (`coverage/`, `e2e/report/`, `e2e/results/`). Verificar contra `.gitignore` y `npm run secrets`.
