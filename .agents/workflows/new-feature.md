# Workflow: Nueva Feature

```
1. PRECONDICIÓN  spec existe en specs/features/ con status: approved
                 (si no → pedir al humano que cree/apruebe la spec)

2. PLANNER       genera specs/features/<nombre>.plan.md (status: draft)
                 Lee .agents/memory/MEMORY.md antes de planificar

3. ⏸ PAUSA       humano revisa el plan y lo ajusta si es necesario

4. ARCHITECT     valida el plan contra AGENTS.md y la arquitectura establecida
                 Veredicto: APPROVED | APPROVED_WITH_CHANGES | REJECTED

5. ⏸ PAUSA       si APPROVED_WITH_CHANGES: humano aplica o delega cambios
                 humano escribe status: approved en el plan para continuar

6. VCS           crea rama feat/NNN-nombre desde main actualizado

7. IMPLEMENTERS  fase a fase, según asignación del plan:
                 - impl-svelte: componentes, rutas, lógica frontend
                 - impl-gas: backend Google Apps Script
                 - impl-pwa: service worker, offline, Dexie
                 - impl-ui: estilos Tailwind, Chart.js, Leaflet
                 Fases 3+ paralelizables si no comparten ficheros
                 → tras cada fase con lint verde: @vcs commitea la fase

8. TESTER        un test por AC mínimo
                 npm run check sin errores TypeScript
                 → tests verdes: @vcs commitea los tests

9. ⏸ PAUSA       humano revisa diff completo y prueba en el browser

10. DOC-WRITER   actualiza AGENTS.md si cambia el stack o estructura
                 actualiza specs si hay notas técnicas nuevas

11. PM           close-feature → propone cierre con checklist de ACs

12. VCS          tras confirmación humana: push + abre PR (ACs + reporte de gates)

13. ⏸ PAUSA      humano mergea el PR y escribe status: done en la spec
```

> Detalle del ciclo Git (ramas, commits, push, PR): `.agents/workflows/git-flow.md`.

## Asignación de implementers por tipo de tarea

| Tarea                                | Implementer |
| ------------------------------------ | ----------- |
| Componentes `.svelte`, stores, rutas | impl-svelte |
| Google Apps Script, Sheets           | impl-gas    |
| Service Worker, Dexie, offline sync  | impl-pwa    |
| Tailwind CSS, Chart.js, Leaflet, UX  | impl-ui     |
| Tests (todos los dominios)           | tester      |
