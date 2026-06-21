# Arquitectura Multi-Agente para Spec-Driven Development (SDD)

> **Versión:** 1.0 — Junio 2026
> **Estado:** Propuesta de referencia
> **Audiencia:** Equipos que usan agentes de codificación IA (Claude Code, OpenCode, Cursor, Copilot Workspace, etc.)
> **Licencia sugerida:** CC-BY-4.0 — adapta libremente a tu contexto

---

## Índice

1. [Motivación y principios](#1-motivación-y-principios)
2. [Visión general de la arquitectura](#2-visión-general-de-la-arquitectura)
3. [Capa de conocimiento: los ficheros .md](#3-capa-de-conocimiento-los-ficheros-md)
4. [Capa de agentes: roles y responsabilidades](#4-capa-de-agentes-roles-y-responsabilidades)
5. [Flujos de trabajo](#5-flujos-de-trabajo)
6. [Gobernanza: quién puede cambiar qué](#6-gobernanza-quién-puede-cambiar-qué)
7. [Portabilidad: diseño agnóstico al agente](#7-portabilidad-diseño-agnóstico-al-agente)
8. [Ejemplo de implementación: OpenCode](#8-ejemplo-de-implementación-opencode)
9. [Mejoras futuras](#9-mejoras-futuras)
10. [Referencias](#10-referencias)

---

## 1. Motivación y principios

### 1.1 El problema

Los agentes de codificación IA son extraordinariamente capaces de generar código,
pero sufren tres patologías cuando se usan sin estructura:

1. **Improvisación arquitectónica.** Sin un plan aprobado, cada sesión reinventa
   decisiones de diseño, produciendo código inconsistente.
2. **Amnesia entre sesiones.** El contexto se pierde al cerrar la sesión; las
   correcciones del humano ("usamos pnpm, no npm") se repiten indefinidamente.
3. **Auto-validación.** Un agente que implementa, testea y aprueba su propio
   trabajo tiende a declarar "done" prematuramente para optimizar su contexto.

### 1.2 La solución: separación de poderes

Esta arquitectura aplica al desarrollo asistido por agentes el mismo principio
que la ingeniería de software aplica al código: **separación de responsabilidades
con interfaces explícitas**. Cada agente tiene:

- Un **único tipo de output** (planes, código, docs, estado…)
- Un **conjunto mínimo de herramientas** (principio de mínimo privilegio)
- **Prohibición de aprobar su propio trabajo**

El humano conserva el control de las **transiciones de estado críticas**
(`draft → approved`, `in-progress → done`).

### 1.3 Principios de diseño

| #   | Principio                              | Justificación                                                                                                                                                                        |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1  | Spec antes que código                  | El "qué" se acuerda antes del "cómo". Las specs son el contrato.                                                                                                                     |
| P2  | Plan antes que implementación          | El plan es revisable y aprobable; el código improvisado no.                                                                                                                          |
| P3  | Mínimo privilegio por agente           | Un revisor no necesita `Write`; un planner no necesita `Bash`. Reduce daño accidental y deriva.                                                                                      |
| P4  | Ningún agente se auto-aprueba          | Implementer no cierra features; architect no implementa.                                                                                                                             |
| P5  | El humano controla las puertas         | Las transiciones `approved` y `done` son humanas.                                                                                                                                    |
| P6  | Todo estado es texto plano versionable | Markdown + Git = inspeccionable, auditable, diff-able. Sin bases de datos opacas.                                                                                                    |
| P7  | Agnóstico al runtime                   | La arquitectura se define en .md portables; el binding a cada agente (Claude Code, OpenCode…) es una capa fina.                                                                      |
| P8  | Ante lo desconocido, preguntar         | Ningún agente inventa lo que no conoce. Requisito ausente, AC ambiguo o decisión técnica no cubierta → se escala al humano, no se asume. Una suposición no confirmada es un defecto. |

> **Nota sobre P8:** el fallo más caro de un agente no es no saber, sino
> rellenar el hueco con una suposición plausible que nadie aprobó. Aplica por
> igual al _qué_ (requisitos) y al _cómo_ (decisiones técnicas: contratos de
> API, nombres de campos, formatos, elección de librerías, comportamientos no
> especificados). Preguntar nunca es un fallo; inventar siempre lo es.

> **Nota sobre P6:** la elección de ficheros Markdown frente a bases de datos
> vectoriales o estado en memoria no es nostalgia: es la única forma de que el
> estado del proyecto sea revisable en PRs, recuperable desde Git y legible
> tanto por humanos como por cualquier LLM sin tooling adicional.

---

## 2. Visión general de la arquitectura

### 2.1 Diagrama

```
                          ┌──────────┐
                          │  HUMANO  │
                          └────┬─────┘
                               │ (peticiones, aprobaciones)
                               ▼
                      ┌────────────────┐
                      │  ORCHESTRATOR  │   Primario. Único punto de entrada.
                      │                │   Clasifica, delega, pausa.
                      └───────┬────────┘
              ┌───────────────┼────────────────────┐
              ▼               ▼                    ▼
       ┌────────────┐  ┌────────────┐      ┌──────────────┐
       │  PLANNER   │  │ ARCHITECT  │      │ PROJECT-MGR  │
       │ spec→plan  │  │ valida/veta│      │ sync estado  │
       └─────┬──────┘  └─────┬──────┘      └──────┬───────┘
             │               │                    │
             └───────┬───────┘                    ▼
                     ▼                     ┌──────────────┐
        ┌────────────────────────┐         │  DOC-WRITER  │
        │      IMPLEMENTERS      │         │ docs vivos   │
        │  ┌──────┐ ┌─────────┐  │         └──────────────┘
        │  │  Go  │ │ Python  │  │
        │  └──────┘ └─────────┘  │
        │  ┌──────┐ ┌─────────┐  │
        │  │ IaC  │ │Embedded │  │
        │  └──────┘ └─────────┘  │
        │       ┌────────┐       │
        │       │ TESTER │       │
        │       └────────┘       │
        └────────────────────────┘
```

### 2.2 Las dos capas

**Capa de conocimiento (estática-lenta):** ficheros `.md` que definen specs,
planes, convenciones, memoria. Cambia con deliberación, vive en Git.

**Capa de agentes (dinámica):** procesos LLM efímeros que leen la capa de
conocimiento, actúan, y escriben de vuelta solo en las zonas que su rol permite.

La frontera entre ambas capas es el **contrato central de la arquitectura**:
los agentes son intercambiables (puedes cambiar de Claude Code a OpenCode);
el conocimiento es permanente.

---

## 3. Capa de conocimiento: los ficheros .md

### 3.1 Estructura completa del repositorio

```
proyecto/
├── AGENTS.md                       # Contexto raíz para agentes (estándar abierto)
│                                   # En Claude Code: CLAUDE.md (puede ser symlink)
├── AGENTS.local.md                 # Overrides locales — NO versionado (.gitignore)
│
├── specs/                          # EL QUÉ — propiedad del humano + planner
│   ├── README.md                   # Índice navegable
│   ├── 00-overview.md              # Visión, objetivos, fuera-de-scope
│   ├── 01-requirements.md          # RF-xx / RNF-xx con IDs
│   ├── 02-architecture.md          # ADRs, capas, patrones obligatorios
│   ├── 03-data-model.md            # Entidades, esquemas, relaciones
│   ├── 04-api.md                   # Contratos: endpoints, tipos, errores
│   └── features/
│       ├── feature-X.md            # User story + ACs (Given/When/Then)
│       └── feature-X.plan.md       # Plan de ejecución generado (EL CÓMO)
│
├── .agents/                        # Capa de binding — portable entre runtimes
│   ├── roles/                      # Definiciones de rol AGNÓSTICAS
│   │   ├── orchestrator.md
│   │   ├── planner.md
│   │   ├── architect.md
│   │   ├── project-manager.md
│   │   ├── doc-writer.md
│   │   ├── implementer-go.md
│   │   ├── implementer-python.md
│   │   ├── implementer-embedded.md
│   │   ├── implementer-iac.md
│   │   └── implementer-test.md
│   ├── skills/                     # Conocimiento inyectable reutilizable
│   │   ├── go-conventions.md
│   │   ├── mqtt-patterns.md
│   │   └── mongodb-patterns.md
│   ├── memory/
│   │   ├── MEMORY.md               # Memoria de proyecto (versionada)
│   │   └── local/MEMORY.md         # Memoria local (no versionada)
│   └── workflows/                  # Flujos como documentos ejecutables
│       ├── new-feature.md
│       ├── bugfix.md
│       └── close-feature.md
│
└── .claude/ | .opencode/ | ...     # Binding específico del runtime (capa fina,
                                    # generada o symlinkeada desde .agents/)
```

### 3.2 Anatomía de cada tipo de fichero

#### `AGENTS.md` (raíz)

El estándar abierto `AGENTS.md` funciona como un README legible por máquina:
una ubicación predecible para contexto del proyecto, convenciones e
instrucciones operativas, adoptada por los principales asistentes de código
(OpenCode, Cursor, y mapeable a `CLAUDE.md` en Claude Code).

```markdown
# Proyecto X

## Stack

- Go 1.22 (backend), MicroPython (firmware ESP32)
- MongoDB, Mosquitto MQTT, Docker Compose

## Comandos

- `make test` — suite completa (NUNCA `go test` directo: hay setup de fixtures)
- `make flash` — flashea firmware

## Convenciones innegociables

- Errores: fmt.Errorf("contexto: %w", err)
- Interfaces en el lado consumidor

## Mapa de conocimiento

@specs/00-overview.md
@specs/02-architecture.md
@.agents/memory/MEMORY.md
```

#### `specs/features/feature-X.md` — la spec

```markdown
# Feature: <nombre>

status: draft | approved ← SOLO el humano cambia esto

## User story

Como <rol>, quiero <acción> para <beneficio>.

## Criterios de aceptación

- [ ] AC-01: Dado <contexto>, cuando <evento>, entonces <resultado>
- [ ] AC-02: ...

## Edge cases

## Fuera de scope
```

#### `specs/features/feature-X.plan.md` — el plan

```markdown
---
spec: specs/features/feature-X.md
status: draft | approved | in-progress | done | blocked
created: 2026-06-12
implementers: [go, test]
complexity: medium
---

# Plan: <nombre>

## Decisiones de diseño ← validadas por architect

## Tareas ordenadas por fases

### Fase 1 — Contratos/modelos

- [ ] 1.1 ... ← project-manager marca [x] al verificar

### Fase 2 — Lógica de negocio

### Fase 3 — Adaptadores (I/O)

### Fase 4 — Tests

## Riesgos identificados

## Fuera de scope de este plan
```

**Razonamiento del orden de fases:** contratos primero, lógica pura después,
I/O al final. Esto produce código testeable por construcción (la lógica de
negocio nunca depende de adaptadores) y permite paralelizar implementers a
partir de la Fase 3.

#### `.agents/memory/MEMORY.md` — la memoria

```markdown
# Memoria del proyecto

## Decisiones (append-only, con fecha)

- 2026-06-10 [architect]: Mutex en SetDeviceState por race MQTT/REST
- 2026-06-11 [pm]: feature-auth pospuesta a v2

## Lecciones aprendidas

- El broker MQTT tarda ~3s en estar listo tras docker compose up → retry+backoff

## Deuda técnica conocida
```

La memoria basada en ficheros (sin base vectorial) es totalmente
inspeccionable, editable y versionable — una decisión deliberada que comparten
los principales runtimes de agentes.

---

## 4. Capa de agentes: roles y responsabilidades

### 4.1 Matriz de responsabilidades (RACI adaptado)

| Artefacto                       | Orchestrator | Planner      | Architect        | PM                    | Doc-Writer    | Implementers       | VCS         | Humano                |
| ------------------------------- | ------------ | ------------ | ---------------- | --------------------- | ------------- | ------------------ | ----------- | --------------------- |
| `specs/*.md`                    | lee          | lee          | lee              | lee                   | lee           | lee                | —           | **escribe / `→done`** |
| `*.plan.md` (contenido)         | lee          | **escribe**  | revisa           | actualiza checkboxes  | lee           | lee                | —           | aprueba               |
| `*.plan.md` (status)            | lee          | crea `draft` | —                | `in-progress→blocked` | —             | —                  | —           | **`→approved`**       |
| Código fuente                   | —            | —            | revisa           | lee                   | lee           | **escribe**        | —           | revisa                |
| Tests                           | —            | —            | —                | verifica              | —             | **tester escribe** | —           | —                     |
| Ramas/commits/PR (Git)          | —            | —            | —                | —                     | —             | —                  | **escribe** | **mergea = cierre**   |
| `04-api.md`, `03-data-model.md` | —            | —            | revisa           | detecta drift         | **actualiza** | —                  | —           | aprueba               |
| `MEMORY.md`                     | lee          | lee          | añade decisiones | añade cierres         | —             | —                  | —           | edita libre           |

### 4.2 Definición de cada rol

Las definiciones siguientes son **agnósticas al runtime**: frontmatter con
metadatos comunes (nombre, descripción, herramientas, nivel de capacidad del
modelo) + cuerpo con el system prompt. La sección 8 muestra cómo se traducen
a un runtime concreto.

#### ORCHESTRATOR — director de orquesta

```markdown
---
name: orchestrator
description: Punto de entrada único. Clasifica peticiones y delega.
tools: [read, glob] # NO write, NO bash — no implementa nada
model-tier: high # razonamiento, no generación masiva
---

Eres el director del proyecto. NUNCA implementas código.

Al recibir una petición:

1. Clasifica: feature | bugfix | refactor | gestión
2. Verifica precondiciones (¿existe spec? ¿plan aprobado?)
3. Ejecuta el workflow correspondiente de .agents/workflows/
4. Las PAUSAS de los workflows son obligatorias: detente y espera
   confirmación humana explícita. No la simules ni la asumas.
```

**Por qué existe:** sin orquestador, el humano debe conocer y secuenciar todos
los agentes manualmente. Con él, la interfaz es una sola conversación, y la
disciplina del proceso (no saltarse el plan) está codificada en un agente que
no tiene herramientas para hacer trampa.

#### PLANNER — de spec a plan

```markdown
---
name: planner
description: Convierte specs aprobadas en planes de ejecución por fases.
tools: [read, write, glob, grep] # write SOLO en specs/features/*.plan.md
model-tier: high
---

1. Lee la spec y extrae dependencias entre ACs
2. Consulta MEMORY.md: decisiones previas que condicionen el diseño
3. Genera plan en fases: contratos → lógica → adaptadores → tests → docs
4. Asigna implementer por tarea según lenguaje
5. Declara riesgos técnicos explícitamente
6. Output: status siempre `draft`. NUNCA `approved`.
```

#### ARCHITECT — guardián técnico

```markdown
---
name: architect
description: Valida planes y código contra la arquitectura establecida.
tools: [read, glob, grep] # READ-ONLY deliberado
model-tier: high
---

Fuente de verdad: specs/02-architecture.md + MEMORY.md (léelos SIEMPRE primero).

Al revisar un plan o código:

- ¿Respeta las capas definidas? ¿Acoplamientos indebidos?
- ¿Reutiliza abstracciones existentes o reinventa?
- ¿Contratos de API cambiados sin spec?

Veredicto obligatorio: APPROVED | APPROVED_WITH_CHANGES | REJECTED + razones.
Registra toda decisión arquitectónica nueva en MEMORY.md (vía orchestrator).
```

**Read-only es la decisión clave:** un revisor con permisos de escritura
acaba "arreglando de paso", lo que destruye la trazabilidad de quién hizo qué.

#### PROJECT-MANAGER — coherencia y estado

```markdown
---
name: project-manager
description: Sincroniza estado real (código) con estado declarado (planes).
tools: [read, write, edit, glob, grep, bash]
model-tier: medium # tareas mecánicas, no creativas
---

Comandos:

- status: tabla Feature|Status|Fases|Bloqueos desde todos los .plan.md
- sync: verifica implementación real, actualiza [ ]→[x]
- drift-check: compara código↔specs (endpoints, modelos). DRIFT_CRITICAL/WARN
- close-feature <X>: verifica ACs con test verde + docs al día.
  Si OK, PROPONE el cierre. El humano escribe status: done.

REGLA DE ORO: puedes marcar checkboxes según evidencia.
NUNCA cambias status: approved→in-progress→done. Eso es del humano.
```

#### DOC-WRITER — documentación viva

```markdown
---
name: doc-writer
description: Mantiene specs de contratos y docs sincronizadas con el código.
tools: [read, write, edit, glob, grep]
model-tier: medium
---

Tras una feature implementada:

1. Actualiza 04-api.md (endpoints nuevos/cambiados) y 03-data-model.md
2. Entrada en CHANGELOG.md
3. Verifica README (comandos vigentes)
   PROHIBIDO tocar specs/features/\*.md: las user stories son del humano.
   Ejemplos de código en docs: siempre extraídos de tests que pasan.
```

#### VCS — control de versiones

```markdown
---
name: vcs
description: Operaciones Git/repositorio: ramas, commits, push, PRs. No modifica código ni hace merge.
tools: [read, grep, glob, bash]
model-tier: medium
skills: [git-conventions]
---

Solo opera el árbol Git y la API del forge (GitHub/GitLab…). NUNCA modifica
código, specs ni planes (sin write/edit). El que implementa no publica (P4).

1. Rama por feature/bugfix desde la base actualizada
2. Un commit por fase, mensaje convencional, cuando el implementer/tester reporta verde
3. Push + PR SOLO en el cierre, tras gates verdes y la puerta humana (P5)
   PROHIBIDO: merge, --force, reset --hard, reescribir historial publicado, secretos.
   El merge del PR lo hace el humano y ES el cierre.
```

> Las acciones outward-facing (push, PR, merge) se enforzan con permisos del
> runtime, no solo con el prompt: en OpenCode, `permission` por comando bash y
> por herramienta MCP (`git push → ask`, `git merge → deny`). Refuerzo
> adicional server-side: branch protection en la rama base.

#### IMPLEMENTERS — especialistas por dominio

Patrón común a todos:

```markdown
---
name: implementer-<dominio>
description: Implementa código <dominio> siguiendo planes aprobados.
tools: [read, write, edit, bash, glob, grep]
model-tier: medium
skills: [<dominio>-conventions] # convenciones inyectadas, no memorizadas
---

PRECONDICIÓN: solo trabajas sobre planes con status: approved | in-progress.

1. Lee la fase completa asignada del plan
2. Lee código existente relacionado — NO reinventes abstracciones
3. Implementa siguiendo .agents/skills/<dominio>-conventions.md
4. Compila y pasa tests locales ANTES de reportar
5. Reporta: DONE | BLOCKED(razón). Nunca marcas checkboxes del plan.
```

Especializaciones recomendadas (ajusta a tu stack):

| Implementer            | Dominio                       | Particularidades del rol                                                     |
| ---------------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| `implementer-go`       | Backend Go                    | Idiomático, stdlib-first, interfaces en consumidor                           |
| `implementer-python`   | Scripts/CPython y MicroPython | Distingue contextos: type hints en CPython, restricciones de RAM en embebido |
| `implementer-embedded` | C/C++, Arduino, PLC (SCL)     | Memoria/tiempo real siempre en el razonamiento                               |
| `implementer-iac`      | Docker, K8s, Terraform        | Paridad local↔prod como principio                                            |
| `implementer-test`     | Solo tests                    | **Nunca** modifica código de producción; mínimo 1 test por AC                |

**Por qué separar el tester:** si quien implementa escribe sus propios tests
de aceptación, los tests tienden a validar la implementación en lugar del AC.
Un tester independiente parte de la spec, no del código.

---

## 5. Flujos de trabajo

Los workflows viven en `.agents/workflows/` como documentos que el
orchestrator ejecuta paso a paso. Esto los hace auditables y modificables sin
tocar las definiciones de los agentes.

### 5.1 `new-feature.md`

```
1. PRECONDICIÓN  spec existe con status: approved (si no → pedir al humano)
2. PLANNER       genera feature-X.plan.md (status: draft)
3. ⏸ PAUSA       humano revisa el plan
4. ARCHITECT     valida → APPROVED / CHANGES / REJECTED
5. ⏸ PAUSA       humano escribe status: approved
6. IMPLEMENTERS  fase a fase, según asignación del plan
                 (fases 3+ paralelizables si no comparten ficheros)
7. TESTER        un test por AC mínimo; integración para entrypoints
8. ⏸ PAUSA       humano revisa diff completo
9. DOC-WRITER    actualiza contratos y changelog
10. PM           close-feature → propone cierre
11. ⏸ PAUSA      humano escribe status: done
```

### 5.2 `bugfix.md`

```
1. PM            localiza spec/plan/AC afectado (si no existe AC → es una
                 feature encubierta: redirigir a new-feature)
2. TESTER        escribe primero el test que reproduce el bug (rojo)
3. IMPLEMENTER   corrige hasta verde
4. TESTER        regresión completa
5. PM            anota en MEMORY.md: causa raíz + lección
```

### 5.3 Cadencia de mantenimiento

| Cuándo                             | Quién                                       | Qué                                |
| ---------------------------------- | ------------------------------------------- | ---------------------------------- |
| Inicio de sesión                   | PM (automático si el runtime soporta hooks) | `drift-check`                      |
| Tras cada escritura de implementer | PM (hook) o manual                          | `sync`                             |
| Fin de sesión                      | PM                                          | actualizar MEMORY.md               |
| Semanal                            | Humano                                      | revisar deuda técnica en MEMORY.md |

---

## 6. Gobernanza: quién puede cambiar qué

### 6.1 Máquina de estados de un plan

```
            planner                humano               humano
  (no existe) ──→ draft ──────────→ approved ──┐
                    ▲                          │ humano inicia trabajo
                    │ humano rechaza           ▼
                    └────────────────────  in-progress ──→ blocked
                                               │ PM propone   ▲ │ PM detecta
                                               ▼              └─┘
                                          (verificación PM)
                                               │ humano confirma
                                               ▼
                                             done
```

### 6.2 Las tres puertas humanas

1. **Puerta de spec:** ninguna spec entra al pipeline sin `status: approved` humano.
2. **Puerta de plan:** ningún implementer toca código sin plan `approved`.
3. **Puerta de cierre:** `done` solo lo escribe el humano, con la verificación
   del PM como evidencia (no como decisión).

**Razonamiento:** las tres puertas son los únicos puntos donde un error de
agente se vuelve caro (arquitectura equivocada, trabajo desperdiciado, deuda
oculta). Todo lo demás es barato de revertir con Git, así que se delega.

### 6.3 Anti-patrones que esta gobernanza previene

| Anti-patrón                                   | Mecanismo de prevención                          |
| --------------------------------------------- | ------------------------------------------------ |
| Agente declara "done" para limpiar contexto   | `done` es transición humana                      |
| Revisor que "arregla de paso"                 | Architect read-only                              |
| Tests que validan la implementación, no el AC | Tester independiente parte de la spec            |
| Specs desactualizadas tras 3 sprints          | `drift-check` del PM + doc-writer en el workflow |
| Decisiones de diseño perdidas                 | MEMORY.md append-only con autor y fecha          |

---

## 7. Portabilidad: diseño agnóstico al agente

### 7.1 El patrón: núcleo portable + binding fino

```
.agents/            ← NÚCLEO: 100% portable, markdown puro
  roles/            ← definiciones de rol con frontmatter genérico
  skills/
  workflows/
  memory/

.claude/agents/     ← BINDING Claude Code   (generado/symlink)
.opencode/agent/    ← BINDING OpenCode      (generado/symlink)
.cursor/rules/      ← BINDING Cursor        (generado)
```

El frontmatter del núcleo usa vocabulario neutral que cada binding traduce:

| Núcleo (`.agents/roles/`)    | Claude Code                                  | OpenCode                                                       |
| ---------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| `tools: [read, write, bash]` | `tools: Read, Write, Bash`                   | `tools: {read: true, write: true, bash: true}`                 |
| `model-tier: high`           | `model: opus`                                | `model: anthropic/claude-opus-4-x` (o el proveedor que elijas) |
| `model-tier: medium`         | `model: sonnet`                              | cualquier modelo medio de los 75+ proveedores                  |
| `model-tier: low`            | `model: haiku`                               | modelo rápido/económico (p. ej. `anthropic/claude-haiku-4-5`)  |
| Color identificativo del rol | `color: blue` (nombre)                       | `color: '#3B82F6'` (hex o tema con nombre)                     |
| Fichero de contexto raíz     | `CLAUDE.md`                                  | `AGENTS.md`                                                    |
| Subagente                    | `.claude/agents/*.md`, invocación `@agent-x` | `mode: subagent`, invocación `@x`                              |
| Memoria                      | `memory: project` nativo                     | fichero `MEMORY.md` + instrucción en prompt                    |

Un script trivial (`make bind-claude`, `make bind-opencode`) genera los
bindings desde el núcleo. Cambiar de runtime cuesta minutos, no semanas.

### 7.2 Mínimo común denominador

La arquitectura solo asume del runtime cuatro capacidades, presentes en
prácticamente todos los agentes de código actuales:

1. Cargar un fichero de contexto de proyecto (AGENTS.md / CLAUDE.md / rules)
2. Definir agentes/modos con prompt + restricción de herramientas
3. Leer/escribir ficheros del repositorio
4. Algún mecanismo de invocación dirigida (menciones, comandos o config)

Todo lo que no cumpla este mínimo (hooks, memoria nativa, paralelismo) se
trata como **mejora opcional**, nunca como dependencia.

---

## 8. Ejemplo de implementación: OpenCode

[OpenCode](https://opencode.ai) es un agente de código open source que admite
modelos de 75+ proveedores, lo que lo hace ideal para demostrar la
portabilidad: cada rol puede usar el modelo (y proveedor) más adecuado.

### 8.1 Conceptos de OpenCode relevantes

- **Dos tipos de agentes:** _primarios_ (conversación principal, se alternan
  con Tab) y _subagentes_ (invocables por los primarios o manualmente con
  `@nombre`). Trae de serie los primarios **Build** (todas las tools) y
  **Plan** (restringido, ideal para análisis sin tocar código), y los
  subagentes General, Explore y Scout.
- **Dos formas de configurar:** `opencode.json` o ficheros markdown en
  `.opencode/agent/` — el nombre del fichero se convierte en el nombre del
  agente (`review.md` → agente `review`).
- **`AGENTS.md`** como fichero de contexto de proyecto estándar.
- **Permisos por herramienta** (`tools: {write: false, ...}`), lo que permite
  aplicar mínimo privilegio de forma declarativa.

### 8.2 Estructura del proyecto con OpenCode

```
proyecto/
├── AGENTS.md                       # contexto raíz (sección 3.2)
├── specs/                          # idéntico al núcleo — NO cambia
├── .agents/                        # núcleo portable — NO cambia
└── .opencode/
    ├── opencode.json
    └── agent/
        ├── orchestrator.md         # primario
        ├── planner.md              # subagente
        ├── architect.md            # subagente
        ├── pm.md                   # subagente
        ├── doc-writer.md           # subagente
        ├── impl-go.md              # subagente
        ├── impl-python.md          # subagente
        └── tester.md               # subagente
```

### 8.3 `opencode.json`

```json
{
	"$schema": "https://opencode.ai/config.json",
	"agent": {
		"orchestrator": {
			"description": "Director del proyecto. Punto de entrada. Delega, nunca implementa.",
			"mode": "primary",
			"model": "anthropic/claude-opus-4",
			"temperature": 0.2,
			"tools": { "write": false, "edit": false, "bash": false }
		},
		"planner": {
			"description": "Convierte specs en planes de ejecución por fases. Invocar con la ruta de la spec.",
			"mode": "subagent",
			"model": "anthropic/claude-opus-4",
			"temperature": 0.3,
			"tools": { "bash": false }
		},
		"architect": {
			"description": "Valida planes y código contra specs/02-architecture.md. Solo lectura.",
			"mode": "subagent",
			"model": "openai/gpt-5",
			"temperature": 0.1,
			"tools": { "write": false, "edit": false, "bash": false }
		},
		"pm": {
			"description": "Sincroniza estado planes-código: status, sync, drift-check, close-feature.",
			"mode": "subagent",
			"model": "anthropic/claude-sonnet-4-5",
			"temperature": 0.1
		},
		"doc-writer": {
			"description": "Actualiza 04-api.md, 03-data-model.md y CHANGELOG tras cada feature.",
			"mode": "subagent",
			"model": "anthropic/claude-sonnet-4-5",
			"tools": { "bash": false }
		},
		"impl-go": {
			"description": "Implementa Go idiomático siguiendo planes aprobados y go-conventions.",
			"mode": "subagent",
			"model": "anthropic/claude-sonnet-4-5",
			"temperature": 0.2
		},
		"impl-python": {
			"description": "Implementa CPython y MicroPython (ESP32) según el contexto del plan.",
			"mode": "subagent",
			"model": "anthropic/claude-sonnet-4-5",
			"temperature": 0.2
		},
		"tester": {
			"description": "Solo tests: 1 por AC mínimo. Nunca toca código de producción.",
			"mode": "subagent",
			"model": "anthropic/claude-sonnet-4-5",
			"temperature": 0.1
		}
	}
}
```

> Observa la ventaja multi-proveedor: el architect puede correr sobre un
> modelo distinto al de los implementers — un "segundo par de ojos" de otro
> proveedor reduce sesgos de auto-coherencia en las revisiones.

### 8.4 Un agente markdown completo: `.opencode/agent/planner.md`

```markdown
---
description: Convierte specs aprobadas en planes de ejecución por fases
mode: subagent
model: anthropic/claude-opus-4
temperature: 0.3
tools:
  bash: false
---

Eres el planificador del proyecto. Tu único output son ficheros
specs/features/<nombre>.plan.md.

Proceso:

1. Lee la spec indicada. Si su status no es `approved`, DETENTE y repórtalo.
2. Lee .agents/memory/MEMORY.md: decisiones previas que condicionen el diseño.
3. Extrae los ACs y sus dependencias.
4. Genera el plan en fases: contratos → lógica → adaptadores → tests → docs.
5. Asigna cada tarea a un implementer: impl-go | impl-python | tester.
6. Declara riesgos técnicos y qué queda fuera de scope.
7. Frontmatter del plan: status: draft. NUNCA escribas approved.

No implementas. No modificas specs. No marcas checkboxes.
```

### 8.5 Sesión de ejemplo

```
$ opencode
# El primario por defecto es Build; cambia con Tab a orchestrator

> implementa la feature pvpc-scheduler

[orchestrator] La spec specs/features/feature-pvpc-scheduler.md está
approved. Delego la planificación.
[orchestrator] → @planner specs/features/feature-pvpc-scheduler.md

[planner] Plan generado en feature-pvpc-scheduler.plan.md (status: draft).
3 fases, implementers: impl-go, impl-python, tester. Riesgo principal:
la API PVPC publica precios D+1 a las 20:15 — necesario fallback.

[orchestrator] ⏸ PAUSA — revisa el plan y cámbialo a approved para continuar.

> (humano revisa, edita status: approved)
> continúa

[orchestrator] → @architect valida feature-pvpc-scheduler.plan.md
[architect] APPROVED_WITH_CHANGES: la tarea 3.2 acopla el scheduler al
cliente HTTP; inyectar interfaz PriceSource definida en el consumidor.

> aplica el cambio y continúa

[orchestrator] → @impl-go fase 1 ... → @impl-python fase 2b ...
[orchestrator] → @tester ACs 01-04
[tester] 6 tests, todos verdes. Cobertura lógica de negocio: 91%.
[orchestrator] → @doc-writer ... → @pm close-feature pvpc-scheduler
[pm] Verificación OK: 4/4 ACs con test verde, docs actualizadas.
     Propongo cierre. Cambia tú status: done.
```

---

## 9. Mejoras futuras

Esta sección recoge evoluciones naturales de la arquitectura, ordenadas por
relación esfuerzo/beneficio.

### 9.1 Memoria: de ficheros planos a memoria estructurada

**Estado actual:** `MEMORY.md` append-only. Simple, versionable, pero crece
sin límite y la recuperación es lectura secuencial.

**Evoluciones:**

1. **Memoria jerárquica por agente.** Cada rol con su propio directorio de
   memoria (`memory/architect/`, `memory/pm/`), con un `MEMORY.md` curado por
   el propio agente cuando excede un umbral de tamaño — patrón ya nativo en
   algunos runtimes, replicable en cualquiera vía prompt.
2. **Compactación periódica.** Un workflow mensual donde un agente resume
   entradas antiguas en "lecciones consolidadas", manteniendo el detalle en
   Git history.
3. **Índice semántico opcional.** Para proyectos grandes, un índice
   (embeddings locales o grep semántico) **sobre** los .md, nunca en
   sustitución de ellos: el markdown sigue siendo la fuente de verdad (P6).
4. **Memoria de fallos del propio sistema.** Registrar cuándo un agente se
   saltó el proceso (implementó sin plan, marcó algo indebido) para refinar
   prompts — meta-aprendizaje del pipeline.

### 9.2 Plugins: empaquetar la arquitectura

**Estado actual:** la arquitectura se copia repo a repo.

**Evolución:** empaquetarla como plugin instalable. Los ecosistemas actuales
de agentes admiten plugins que agrupan comandos, agentes, skills y hooks en
una unidad distribuible y versionada. Beneficios:

- `install sdd-architecture` en lugar de copiar 15 ficheros
- Versionado semántico del proceso (tu pipeline v1.3 vs v2.0)
- Variantes por dominio: `sdd-embedded`, `sdd-web`, `sdd-data`
- Actualizaciones de prompts de rol sin tocar los proyectos

### 9.3 MCP (Model Context Protocol): herramientas reales para los roles

**Estado actual:** los agentes interactúan con el mundo vía ficheros y bash.

**Evolución:** MCP estandariza la conexión de agentes a servicios externos, y
está soportado tanto en Claude Code como en OpenCode. Asignación natural por
rol (manteniendo mínimo privilegio):

| Rol             | Servidores MCP candidatos              | Para qué                                  |
| --------------- | -------------------------------------- | ----------------------------------------- |
| project-manager | GitHub/GitLab, Jira/Linear             | estado real de PRs e issues en `sync`     |
| architect       | servidor de docs internas              | ADRs corporativos fuera del repo          |
| implementer-\*  | LSP vía MCP, bases de datos de staging | tipos reales, esquemas reales             |
| tester          | CI (GitHub Actions...)                 | resultados de pipeline en `close-feature` |
| doc-writer      | Confluence/Notion                      | publicar docs donde las lee el equipo     |

**Precaución:** cada servidor MCP amplía la superficie de acción del agente.
La matriz de la sección 6 debe extenderse a las tools MCP (un architect con
MCP de Jira en read-only, nunca write).

### 9.4 Otras líneas

- **Paralelismo real de implementers:** runtimes con multi-sesión permiten
  ejecutar fases independientes en paralelo; requiere que el planner declare
  explícitamente qué fases no comparten ficheros.
- **Hooks como puertas automáticas:** validaciones pre-commit que rechacen
  código sin plan `approved` asociado — la gobernanza deja de depender de la
  disciplina del prompt.
- **Métricas del pipeline:** tiempo spec→done, % de planes rechazados por el
  architect, drift detectado por sprint. El PM puede generarlas desde los
  frontmatter con fechas.
- **AGENTS.md como contrato multi-herramienta:** consolidar todo el contexto
  en el estándar abierto y generar los formatos propietarios, eliminando
  duplicación cuando convivan varios asistentes en el mismo repo.

---

## 10. Referencias

### Documentación oficial de runtimes

1. **Claude Code — Subagents.** Definición de subagentes, frontmatter, memoria
   por agente y scopes. https://code.claude.com/docs/en/sub-agents
2. **Claude Code — Documentación general.**
   https://docs.claude.com/en/docs/claude-code/overview
3. **OpenCode — Agents.** Agentes primarios vs subagentes, configuración JSON
   y markdown, permisos de tools. https://opencode.ai/docs/agents/
4. **OpenCode — Documentación general.** https://opencode.ai/docs
5. **Model Context Protocol.** Especificación del protocolo de herramientas.
   https://modelcontextprotocol.io

### Estándares y especificaciones

6. **AGENTS.md** — especificación abierta de fichero de contexto para agentes
   de código. https://agents.md

### Análisis y guías de la comunidad

7. _Dive into Claude Code_ (VILA-Lab) — análisis sistemático de la
   arquitectura interna de un runtime de agentes: skills vs agents, hooks,
   construcción del contexto. https://github.com/VILA-Lab/Dive-into-Claude-Code
8. _Claude Code Subagents and Multi-Agent Orchestration Guide_
   (hidekazu-konishi.com) — qué cruza (y qué no) la frontera padre→subagente;
   diseño de tools como allowlist.
9. _OpenAgentsControl_ (darrenhinde) — framework plan-first con ejecución por
   aprobación sobre OpenCode; validación práctica del patrón de esta
   arquitectura. https://github.com/darrenhinde/OpenAgentsControl
10. _The Complete Guide to AI Agent Memory Files_ — panorámica de CLAUDE.md,
    AGENTS.md, jerarquías e imports.

### Fundamentos conceptuales

11. Parnas, D.L. (1972). _On the Criteria To Be Used in Decomposing Systems
    into Modules_ — la separación de responsabilidades que esta arquitectura
    aplica a agentes.
12. Saltzer & Schroeder (1975). _The Protection of Information in Computer
    Systems_ — origen del principio de mínimo privilegio (P3).
13. Cockburn, A. — _Hexagonal Architecture (Ports & Adapters)_ — justificación
    del orden de fases contratos→lógica→adaptadores.

---

_Documento generado como arquitectura de referencia. Adapta roles,
implementers y workflows a tu stack — la estructura de gobernanza (puertas
humanas, mínimo privilegio, no auto-aprobación) es la parte invariante._
