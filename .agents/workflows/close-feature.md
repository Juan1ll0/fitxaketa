# Workflow: Cierre de Feature

Invocado por: `@pm close-feature <nombre>`

```
1. PM   verifica cada AC de la spec:
        - [ ] AC tiene test verde o evidencia de implementación

2. PM   ejecuta el QUALITY GATE (sección siguiente) — todo debe pasar

3. PM   verifica documentación:
        - [ ] AGENTS.md refleja cambios de stack/estructura si los hay
        - [ ] .agents/memory/MEMORY.md actualizada con decisiones de esta feature
        - [ ] spec no tiene TODOs pendientes

4. PM   genera el reporte de cierre y PROPONE al humano:
        "Feature X lista para cierre. Confirma para abrir el PR."

5. ⏸    HUMANO confirma la publicación

6. VCS  push de la rama + abre PR (cuerpo = ACs de la spec + reporte de gates del PM)

7. ⏸    HUMANO revisa el PR, lo MERGEA y escribe status: done en la spec.
        El merge es el cierre. Solo el humano cierra; @vcs nunca mergea.
```

> El `status: done` se escribe en la **spec** (`specs/features/<nombre>.md`), no en el plan. Ver `.agents/workflows/git-flow.md`.

## Quality Gate

Un solo comando ejecuta todos los gates automáticos (requiere `eval "$(fnm env)" && fnm use 24`):

```bash
npm run quality
```

| #   | Gate                  | Herramienta               | Qué bloquea                                                        |
| --- | --------------------- | ------------------------- | ------------------------------------------------------------------ |
| G1  | Formato               | Prettier (`format:check`) | Código sin formatear (incluye orden de clases Tailwind)            |
| G2  | Lint                  | ESLint (`lint`)           | Complejidad > 10, funciones > 50 líneas, ficheros > 120/150, `any` |
| G3  | Tipos + a11y          | svelte-check (`check`)    | Errores de tipos Y warnings (accesibilidad incluida)               |
| G4  | Arquitectura de capas | dependency-cruiser        | utils importando side effects, services conociendo UI, ciclos      |
| G5  | Código muerto         | Knip                      | Ficheros, exports y dependencias sin usar                          |
| G6  | Duplicación (DRY)     | jscpd (`dup`)             | > 2% de líneas duplicadas (mín. 10 líneas por clon)                |
| G7  | Secretos              | secretlint (`secrets`)    | Tokens, API keys o credenciales hardcodeadas                       |
| G8  | Build                 | Vite (`build`)            | Errores de compilación                                             |
| G9  | Presupuesto de bundle | size-limit (`size`)       | Entry > 150 KB gzip o total cliente > 300 KB gzip                  |

Gates manuales (no automatizables aún):

| #   | Gate       | Cómo                                                           | Criterio                                                       |
| --- | ---------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| G10 | Tests      | `npm test` (cuando exista framework)                           | Todos verdes; `src/lib/utils/` con cobertura 100%              |
| G11 | Lighthouse | `npx lighthouse http://localhost:4173` sobre `npm run preview` | PWA ≥ 90, Performance ≥ 90. Si no hay Chrome: PENDIENTE_MANUAL |

Si CUALQUIER gate falla → la feature NO se propone para cierre.
El PM reporta el gate fallido y devuelve el trabajo al implementer correspondiente vía orchestrator.

## Formato de reporte del PM

```
Feature: 003-dashboard-componentes
Status propuesto: done

── ACs ──
AC-01: Cronómetro muestra tiempo activo [✓] — src/lib/components/EstadoCronometro.svelte
AC-02: Gráfica horas por día del mes    [✓] — src/lib/components/GraficaHoras.svelte
AC-03: Mapa con pins de ubicaciones     [✓] — src/lib/components/MapaUbicaciones.svelte

── Quality Gate ──
G1-G9 (npm run quality): ✓ — entry 87 KB gzip, chart.js en chunk lazy
G10 tests:               ✓ 12/12 — src/lib/utils 100%
G11 lighthouse:          PENDIENTE_MANUAL (sin Chrome en el entorno)

Estado: LISTO PARA CIERRE — pendiente G11 manual por el humano
```
