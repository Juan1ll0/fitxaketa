# Spec-Driven Development (SDD)

Las specs son el contrato del proyecto. El "qué" se acuerda antes del "cómo".

## Flujo completo

```
1. Humano escribe spec en specs/features/NNN-nombre.md (status: draft)
2. Humano revisa y cambia status: approved
3. @planner genera NNN-nombre.plan.md (status: draft)
4. Humano revisa el plan
5. @architect valida → APPROVED / CHANGES / REJECTED
6. Humano escribe status: approved en el plan → @vcs crea rama feat/NNN-nombre
7. Implementers ejecutan por fases → @vcs commitea cada fase
8. @tester verifica ACs → @vcs commitea los tests
9. @pm close-feature NNN-nombre → checklist; tras confirmar, @vcs push + abre PR
10. Humano mergea el PR y escribe status: done en la spec
```

## Las tres puertas humanas

1. **Spec aprobada** — ningún agente genera planes sin `status: approved` en la spec
2. **Plan aprobado** — ningún implementer toca código sin plan `status: approved`
3. **Cierre = merge del PR** — el humano mergea (con la verificación del PM como evidencia) y escribe `status: done` en la **spec**. `@vcs` nunca mergea; `main` está protegida.

## Estados

### Spec (`specs/features/*.md`)

`draft` → `approved` → `done`

> El `done` lo escribe el humano al **mergear el PR** de la feature. Es la única señal de cierre.

### Plan (`specs/features/*.plan.md`)

`draft` → `approved` → `in-progress` → `blocked`

> El plan ya **no** lleva `done`: el cierre lo refleja el merge del PR + el `done` de la spec.

## Control de versiones

Ver `.agents/workflows/git-flow.md`. Operado por `@vcs`: ramas `feat/NNN-nombre`, commits convencionales por fase, push y PR gateados por el humano. El merge del PR es el cierre.

## Estructura

```
specs/
├── README.md                         # Este archivo
├── _template.md                      # Plantilla para nuevas specs
└── features/
    ├── 001-pwa-setup.md              # done — Infraestructura PWA
    ├── 002-almacenamiento-offline-dexie.md  # draft — Almacenamiento offline Dexie
    ├── 003-dashboard-componentes.md  # draft — Cronómetro, Chart.js, Leaflet
    ├── 004-backend-google-sheets.md  # draft — GAS + Sheets
    ├── 005-automatizacion-movil.md   # draft — iOS Shortcuts + Android
    └── 006-testing-infrastructure.md # done — Playwright + Vitest
```

## Convenciones

- Numeración secuencial: `001`, `002`, ...
- Una spec = una funcionalidad cohesiva
- Los ACs en formato Given/When/Then cuando aplique
- Las specs son propiedad del humano — los agentes no modifican ACs ni status
