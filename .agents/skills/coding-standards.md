# Estándares de Código — Fitxaketa

Estructura de este documento: **checklist normativo** (lo que se cumple, sin excepciones) y **apéndice de ejemplos** (consultar solo ante dudas).

Las reglas llevan un marcador con la herramienta que las bloquea automáticamente — `[lint]` ESLint, `[depcruise]` dependency-cruiser, `[jscpd]` detector de duplicados, `[knip]` código muerto, `[secretlint]` secretos, `[prettier]` formato, `[size]` presupuesto de bundle. Todas se ejecutan juntas con `npm run quality`. Las reglas sin marcador las valida el architect.

---

## Checklist normativo

### Ante lo desconocido (regla cero)

- Decisión técnica no cubierta por la spec, el plan o estos estándares → **NO improvisar**: escalar al humano vía `@orchestrator`. No inventes APIs, contratos, nombres de campos, formatos ni comportamientos no especificados.
- Si un requisito o AC es ambiguo, DETENTE y pregunta — no elijas la interpretación más cómoda. Una suposición no confirmada es un defecto.

### Funciones

- [lint] Máximo 50 líneas por función (objetivo: 30)
- [lint] Complejidad ciclomática ≤ 10
- [lint] Máximo 3 niveles de anidación
- [lint] Máximo 4 parámetros (más → objeto de opciones)
- Funciones puras siempre que sea posible: reciben todo por parámetro, no tocan estado externo
- Un nivel de abstracción por función: o orquesta o hace, no ambas
- [depcruise] Lógica pura en `src/lib/utils/` (no puede importar componentes, stores, services ni db); side effects (DOM, fetch, IndexedDB) en componentes, stores y adapters
- [depcruise] `src/lib/services/` no conoce la UI; `src/lib/` nunca importa de `src/routes/`; sin dependencias circulares

### Ficheros

- [lint] Módulos `.ts` ≤ 120 líneas; componentes `.svelte` ≤ 150 líneas; ficheros GAS ≤ 200 líneas
- [knip] Sin código muerto: ficheros, exports y dependencias sin usar se eliminan
- [prettier] Formato uniforme (incluye orden de clases Tailwind) — `npm run format` lo arregla solo
- Un fichero = una responsabilidad; si crece, dividir en módulos cohesivos

### TypeScript

- [lint] Prohibido `any` — usar `unknown` y estrechar
- Tipos explícitos en props e interfaces públicas
- `interface` para formas de datos, `type` para uniones/utilidades

### SOLID / DRY

- Single Responsibility: cada módulo tiene una razón para cambiar
- Dependencias inyectadas como interfaces, nunca instanciadas dentro del consumidor
- Interfaces pequeñas y específicas — no obligar a implementar lo que no se usa
- [jscpd] Tercera repetición del mismo código → extraer (umbral mecánico: ≤ 2% duplicado, clones ≥ 10 líneas)
- NO unificar código que parece igual pero cambia por razones distintas

### Seguridad

- [secretlint] Prohibido hardcodear tokens, API keys o credenciales — en cliente van a `localStorage` (config inicial PWA); en GAS a Script Properties

### Errores

- Errores esperados (red, permisos, validación) → `Result<T>` tipado, manejados en UI
- Errores inesperados (bugs) → dejar propagar, no silenciar con try/catch vacíos

### Nomenclatura

- camelCase variables/funciones · PascalCase tipos y componentes · SCREAMING_SNAKE constantes
- Ficheros: componentes `PascalCase.svelte`, utilidades `kebab-case.ts`
- Booleanos con prefijo `is/has/can`

### Comentarios

- Solo el **porqué** (restricciones no obvias), nunca el qué
- Si una función necesita comentario para entenderse → renombrarla o dividirla

---

## Tiempos de respuesta — targets

| Interacción                        | Target                  | Cómo se verifica                                                          |
| ---------------------------------- | ----------------------- | ------------------------------------------------------------------------- |
| Botón de fichaje → feedback visual | < 100 ms                | Diseño: UI optimista (IndexedDB primero, sync después) — valida architect |
| Carga inicial PWA (cached)         | < 1 s                   | Lighthouse en close-feature (gate G6)                                     |
| Carga inicial PWA (primera vez)    | < 3 s                   | Lighthouse + presupuesto de bundle (gate G4)                              |
| JS inicial                         | < 150 KB gzip           | [size] `npm run size` automático. Chart.js y Leaflet SOLO lazy            |
| Consulta de histórico local        | < 200 ms                | Diseño: índices Dexie en campos filtrados — valida architect              |
| Sync con Google Sheets             | < 5 s, nunca bloqueante | Diseño: sync en background — valida architect                             |
| Operación offline                  | Instantánea             | Diseño: IndexedDB siempre primero — valida architect                      |

---

## Apéndice de ejemplos

### A1 — Dividir funciones largas

```ts
// MAL — mezcla obtención, transformación y escritura en 40+ líneas
async function procesarFichajes(rawData: unknown[]) {
	/* ... */
}

// BIEN — cada subfunción tiene un nombre que dice exactamente qué hace
async function procesarFichajes(rawData: unknown[]) {
	const validados = validarFichajes(rawData);
	const normalizados = normalizarFichajes(validados);
	await guardarFichajes(normalizados);
}
```

### A2 — Función pura vs. impura

```ts
// MAL — depende de estado externo, imposible de testear aislada
function calcularHorasTrabajadas() {
  const fichajes = store.fichajes;
  return fichajes.reduce(...);
}

// BIEN — recibe todo, sin side effects
function calcularHorasTrabajadas(fichajes: Fichaje[]): number {
  return fichajes.reduce((acc, f) => acc + duracion(f), 0);
}
```

### A3 — Inyección de dependencias (SRP + DIP)

```ts
// Persistencia, HTTP y orquestación separados; dependencias como interfaces
interface SyncAdapter { sync(fichaje: Fichaje): Promise<void> }

class FichajeRepository { async save(f: Fichaje) { /* Dexie */ } }
class GASSync implements SyncAdapter { /* fetch no-cors */ }
class MockSync implements SyncAdapter { /* para tests */ }

function crearFichajeService(repo: FichajeRepository, sync: SyncAdapter) { ... }
```

### A4 — Result tipado para errores esperados

```ts
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function sincronizar(f: Fichaje): Promise<Result<void>> {
	try {
		await gasAdapter.sync(f);
		return { ok: true, data: undefined };
	} catch {
		return { ok: false, error: 'Sin conexión — se reintentará' };
	}
}
```

### A5 — UI optimista (target < 100 ms)

```ts
// MAL — bloquea UI esperando a GAS (3-5 s)
async function fichar() {
	await syncConGAS(evento);
	mostrarConfirmacion();
}

// BIEN — feedback inmediato, sync en background
async function fichar() {
	await db.fichajes.add(evento); // < 5 ms, local
	mostrarConfirmacion();
	void syncEnBackground(evento); // fire-and-forget con retry
}
```

### A6 — Lazy load de librerías pesadas

```ts
// En el componente que las usa, nunca en el layout global
const { Chart } = await import('chart.js');
const L = (await import('leaflet')).default;
```

### A7 — Comentario correcto

```ts
// MAL: repite el código
// suma las horas de los fichajes
const total = fichajes.reduce((a, f) => a + f.horas, 0);

// BIEN: explica una restricción no obvia
// GAS devuelve timestamps en UTC+0 independientemente del timezone del usuario
const horaLocal = new Date(gasTimestamp.getTime() + tzOffsetMs);
```
