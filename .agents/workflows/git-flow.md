# Workflow: Git Flow

Operado por `@vcs`. Referencia única del ciclo Git; los workflows `new-feature.md`, `bugfix.md` y `close-feature.md` enganchan aquí en vez de duplicar los pasos.

Principio: los commits locales son libres; **`push`, abrir PR y merge son outward-facing** y caen sobre las puertas humanas (P5). El que implementa no publica (P4): solo `@vcs` opera Git.

```
1. RAMA          al aprobarse el plan (status: approved):
   @vcs          git fetch + git switch -c feat/NNN-nombre  (desde main actualizado)

2. COMMIT/FASE   cada vez que un implementer reporta DONE (lint verde)
   @vcs          o el tester reporta tests verdes:
                 git add <ficheros de la fase> + git commit
                 mensaje convencional (ver skill git-conventions)
                 → un commit por fase, no monolítico ni micro-commits

3. ⏸ PAUSA       [cierre] @pm close-feature da gates verdes y propone cierre
                 humano confirma publicar

4. PUSH + PR     @vcs git push -u origin feat/NNN-nombre   (acción gateada)
                 @vcs abre PR con plantilla: ACs + reporte G1–G11 + enlace a spec/plan

5. ⏸ PAUSA       humano revisa el PR

6. MERGE = DONE  el HUMANO mergea el PR (squash/merge a main)
                 el HUMANO escribe status: done en la spec
                 @vcs NUNCA mergea
```

## Reglas

- Ramas: `feat/NNN-nombre`, `fix/NNN-nombre`, `chore/descripcion`.
- `main` protegida: sin push directo, merge solo vía PR con revisión.
- Prohibido: merge por agente, `--force`, `reset --hard`, historial reescrito, secretos en commits.
- Ante ambigüedad (qué incluir, conflictos, qué rama): preguntar al humano (P8), no asumir.

## Estados tras introducir Git

- **Spec** (`specs/features/NNN-*.md`): `draft → approved → done`. El `done` lo escribe el humano al mergear el PR.
- **Plan** (`specs/features/NNN-*.plan.md`): `draft → approved → in-progress`. Ya **no** lleva `done`; su cierre lo refleja el merge + el `done` de la spec.
