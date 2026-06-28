# Plan: 008 - Ajustes: gestión de datos (borrado y limpieza)

**Status:** approved
**Spec:** [008-ajustes-gestion-de-datos.md](./008-ajustes-gestion-de-datos.md) (status: approved)
**Generado:** 2026-06-28
**Autor:** planner

> Cubre los ACs `[ ]` de la spec: borrado (AC-01..AC-14) y limpieza (AC-15..AC-18). La **copia de seguridad está fuera de scope** (spec futura): este plan no toca Dexie schema, ni 007, ni Drive/OAuth/ZIP.

---

## Resumen de fases

| Fase | Contenido                                      | Implementers          | Paralelizable         |
| ---- | ---------------------------------------------- | --------------------- | --------------------- |
| 1    | Tipos / contratos (alcance de borrado)         | impl-svelte           | — (base de las demás) |
| 2    | Lógica: helpers de borrado, utils puras, store | impl-pwa, impl-svelte | parcial (ver tareas)  |
| 3    | Componentes Svelte / rutas (Ajustes, diálogos) | impl-svelte, impl-ui  | parcial (ficheros)    |
| 4    | UI / estilos (destructivo, a11y)               | impl-ui               | parcial               |
| 5    | Tests (un test por AC mínimo)                  | tester                | sí                    |

**Orden:** Fase 1 → Fase 2 → (Fase 3 ∥ Fase 4) → Fase 5.
**Conteo por implementer:** impl-svelte: 5 · impl-pwa: 1 · impl-ui: 2 · tester: 3 · impl-gas: 0.

---

## Fase 1 — Tipos / contratos

### T1.1 — Tipos de alcance de borrado · `impl-svelte`

**Ficheros:** `src/lib/utils/borrado-tipos.ts` (NUEVO, puro).

```ts
export type Granularidad = 'año' | 'mes' | 'semana' | 'dia' | 'jornada';
export interface PeriodoConDatos {
	clave: string;
	etiqueta: string;
	desde: Date;
	hasta: Date;
	conteo: number;
}
```

**ACs:** soporte de tipos para AC-04/05.
**Dependencias:** ninguna. **Bloquea:** T2.2, T3.x.

---

## Fase 2 — Lógica de negocio

> Utils **puras** en `src/lib/utils/` (sin importar componentes, stores ni `db.ts` salvo `type`); side effects (Dexie) en `db.ts` y store. Verificar `npm run depcruise` tras crear cada util (precedente 003.5, Riesgo #2).

### T2.1 — Helpers de borrado en Dexie · `impl-pwa`

**Ficheros:** `src/lib/db.ts`.

- **Sin cambio de esquema** (sigue en v4). Helpers exportados:
  - `borrarJornadasEnRango(desde, hasta): Promise<number>` → borra jornadas con `diaDeJornada(start_time) ∈ [desde, hasta)`; devuelve nº borradas. Como `diaDeJornada` deriva de `start_time`, implementar con `db.jornadas.where('start_time').between(desde, hasta, true, false).delete()` y devolver el count (o `filter` + `bulkDelete` si hace falta `diaDeJornada` exacto). Documentar que el corte es por `start_time`.
  - `borrarJornada(id): Promise<void>`.
  - `borrarTodasLasJornadas(): Promise<void>` → `db.jornadas.clear()`.
  - `borrarTodosLosSettings(): Promise<void>` → `db.settings.clear()` + `seedSettingsIfEmpty()`.
  - `resetDeFabrica(): Promise<void>` → `jornadas.clear()` + `settings.clear()` + `seedSettingsIfEmpty()`.
- `seedSettingsIfEmpty` ya existe (003.5); reutilizar.

**ACs:** AC-02, AC-03, AC-06..AC-10.
**Dependencias:** ninguna (usa `diaDeJornada`/seed existentes). **Paralelizable con:** T2.2.

### T2.2 — Utils puras: periodos con datos + rangos · `impl-svelte`

**Ficheros:** `src/lib/utils/borrado-periodos.ts` (NUEVO, puro).

- `periodosConDatos(jornadas, nivel, primerDia, padre?): PeriodoConDatos[]` → agrupa por `diaDeJornada(start_time)` y devuelve solo los periodos del `nivel` con ≥1 jornada, acotados al `padre`. `conteo` = nº jornadas.
- `rangoDe(nivel, ref, primerDia): { desde, hasta }` → reutiliza `fecha-negocio.ts` (`inicioDia`, `inicioSemana`); la semana respeta `primerDia`. Es el `[desde, hasta)` que consume `borrarJornadasEnRango`.

> Funciones ≤ 50 líneas; si el fichero se acerca a 120, separar `rangoDe` a `borrado-rangos.ts`.

**ACs:** AC-04, AC-05, AC-06..AC-09, AC-11.
**Dependencias:** T1.1. **Paralelizable con:** T2.1.

### T2.3 — Store: acciones de borrado + recarga reactiva · `impl-svelte`

**Ficheros:** `src/lib/stores/app-state.ts` (acciones), `src/lib/stores/app-state.svelte.ts` (si hace falta exponer algo).

- Acciones nuevas: `borrarRango(desde, hasta)`, `borrarJornadaPorId(id)`, `borrarSoloSettings()`, `resetFabrica()`.
- Cada una: llama al helper Dexie (T2.1) → `cargarJornadas()` (recarga jornadas/hoy/resumen) + recargar `settings` cuando aplique (`getAllSettings`) → `notificarCambio()` (AC-13).
- Si el borrado afecta a la **jornada abierta** activa, resetear el estado de fichaje a inactivo (AC-12). Para el reset de fábrica, parar cronómetro/estado activo.

**ACs:** AC-12, AC-13.
**Dependencias:** T2.1. **No paralelizable** con T2.1.

---

## Fase 3 — Componentes Svelte / rutas

### T3.1 — Quitar "Histórico de horas semanales" · `impl-svelte`

**Ficheros:** `src/routes/configuracion/+page.svelte`.

- Eliminar la `<section>` del histórico y el `$derived` `historico = historicoCampo(...)` (queda sin uso en esta vista). `historicoCampo` **sigue exportado** (otros usos/tests).

**ACs:** AC-17.
**Dependencias:** ninguna. **Paralelizable con:** T3.2..T3.4.

### T3.2 — `AccionesConfig`: quitar "Datos y sincronización" + montar Zona de peligro · `impl-svelte` (estilos → T4.1 `impl-ui`)

**Ficheros:** `src/lib/components/AccionesConfig.svelte`.

- **Eliminar** el grupo completo "Datos y sincronización" (filas Sync / Export / Backup) → AC-15.
- Dejar **solo** la "Zona de peligro" con tres acciones (AC-01): **Reseteo de fábrica**, **Borrar jornadas** (abre `SelectorAlcance`, T3.3), **Borrar solo configuración**; cada una abre `ConfirmacionDestructiva` (T3.4).
- Sin lógica de negocio en el componente: delega en las acciones del store (T2.3). Mantener ≤150 líneas extrayendo los diálogos a `ajustes/*` (T3.3/T3.4).

**ACs:** AC-01, AC-15, AC-16.
**Dependencias:** T2.3, T3.3, T3.4. **No paralelizable** con T4.1 (mismo fichero) — secuenciar T3.2→T4.1.

### T3.3 — Selector de alcance en cascada · `impl-svelte`

**Ficheros:** `src/lib/components/ajustes/SelectorAlcance.svelte` (NUEVO).

- Cascada **Año → Mes → Semana → Día → Jornada**, poblada con `periodosConDatos` (T2.2) acotando por el nivel padre; el usuario puede detenerse en cualquier nivel. Muestra `conteo` por opción. Al confirmar emite `{ desde, hasta }` (o `id` de jornada) hacia `ConfirmacionDestructiva` (T3.4).
- Solo periodos con datos (AC-05); si no hay datos, estado vacío/deshabilitado.

**ACs:** AC-04, AC-05, AC-06..AC-10.
**Dependencias:** T2.2. **Paralelizable con:** T3.1, T3.4.

### T3.4 — Bottom sheet de confirmación destructiva · `impl-ui`

**Ficheros:** `src/lib/components/ajustes/ConfirmacionDestructiva.svelte` (NUEVO).

- Bottom sheet con **"Se borrarán N jornadas"**, foco inicial en **Cancelar**, rojo sólido solo en **Confirmar** (patrón 003.5). `role="dialog"` + focus-trap. Cancelar no hace nada (AC-14).
- Reutilizable por las tres acciones de peligro.

**ACs:** AC-14 + patrón destructivo de AC-01/02/03.
**Dependencias:** ninguna funcional. **Paralelizable con:** T3.1, T3.3.

---

## Fase 4 — UI / estilos

### T4.1 — Estilos destructivos y a11y · `impl-ui`

**Ficheros:** `src/lib/components/AccionesConfig.svelte`, `src/lib/components/ajustes/*`.

- Zona de peligro: outline rojo + texto explicativo; reutiliza `--color-danger` (existente).
- A11y: filas como `<button>` reales `min-h-12`, iconos `aria-hidden`, focus-trap en los diálogos, color no como único indicador (texto acompañante).

**ACs:** acabado a11y de AC-01.
**Dependencias:** T3.2, T3.4. **No paralelizable** con T3.2 (mismo fichero).

---

## Fase 5 — Tests

> Un test por AC mínimo. Colocalizados; `fake-indexeddb/auto` para Dexie. `npm run check` sin errores. Paralelizable entre archivos.

### T5.1 — `borrado-periodos.test.ts` · `tester`

`periodosConDatos` (solo periodos con datos, conteo, acotado por padre, semana con `primerDia`); `rangoDe` (año/mes/semana/día; cruce de medianoche atribuido por `start_time`).

### T5.2 — `db.test.ts` (ampliar) · `tester`

`borrarJornadasEnRango` (borra solo el rango, devuelve count), `borrarJornada`, `borrarTodasLasJornadas`, `borrarTodosLosSettings` (+ re-seed), `resetDeFabrica` (jornadas+settings vacías, re-seed un default).

### T5.3 — `app-state.test.ts` (ampliar) · `tester`

Acciones de borrado recargan jornadas y notifican (AC-13); borrar la jornada abierta resetea el estado activo (AC-12).

**Dependencias:** las utils/store correspondientes. **Paralelizable:** sí.

---

## Riesgos técnicos

1. **`borrarJornadasEnRango` vs `diaDeJornada`.** El índice Dexie es `start_time`; `diaDeJornada` deriva de `start_time`, así que `where('start_time').between(...)` es correcto para el modelo. _Riesgo:_ confundir con `end_time`. _Mitigación:_ test T5.1/T5.2 con jornada que cruza medianoche en frontera de año/mes.
2. **dependency-cruiser (pureza).** `borrado-periodos.ts` y `borrado-tipos.ts` deben ser puros (solo `type` desde `$lib/db`). _Verificación:_ `npm run depcruise`; fallback `db-types.ts` si un `import type` rompiera la regla (precedente 003.5).
3. **Tamaño de componentes (≤150 líneas).** `AccionesConfig.svelte` + diálogos. _Mitigación:_ extraer `SelectorAlcance` y `ConfirmacionDestructiva` a `src/lib/components/ajustes/`; `AccionesConfig` solo orquesta.
4. **knip (código muerto).** Nuevos exports (`borrar*`, `resetDeFabrica`, `periodosConDatos`, `rangoDe`) deben tener consumidor. `app-state.ts` ya es entry. _Mitigación:_ no exportar helpers sin uso; `npm run knip` al final.
5. **Borrado irreversible.** No hay papelera; la confirmación (T3.4) es la única red. _Mitigación:_ foco en Cancelar, conteo visible antes de confirmar.

---

## Fuera de scope (de la spec, reiterado)

- **Copia de seguridad** (Excel periódico + entrega Drive/email): spec futura; mecanismo de entrega aún por decidir (OAuth `drive.file` / GAS relé / GAS autónomo).
- **Exportar/descarga**: ya vive en Historial (007).
- **Sincronización bidireccional**, **restauración/importación**, **papelera/deshacer**: fuera.
