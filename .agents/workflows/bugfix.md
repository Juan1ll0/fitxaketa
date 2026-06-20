# Workflow: Bugfix

```
1. PM            localiza spec/plan/AC afectado
                 Si no existe AC que cubra el bug → es una feature encubierta
                 Redirigir a new-feature.md

2. VCS           crea rama fix/NNN-nombre desde main actualizado

3. TESTER        escribe primero el test que reproduce el bug (debe fallar: rojo)
                 Describe el comportamiento esperado, no el actual

4. IMPLEMENTER   corrige hasta verde
                 Lee .agents/memory/MEMORY.md para contexto de decisiones previas
                 Usa el implementer del dominio afectado (svelte/gas/pwa/ui)

5. TESTER        regresión completa: npm run check + todos los tests existentes
                 → verde: @vcs commitea fix + test (fix(NNN): …)

6. PM            anota en .agents/memory/MEMORY.md:
                 - causa raíz
                 - lección aprendida
                 - fecha y contexto

7. VCS           tras confirmación humana: push + abre PR

8. ⏸            humano mergea el PR (cierre)
```

> Detalle del ciclo Git: `.agents/workflows/git-flow.md`.

## Clasificación de gravedad

- **CRÍTICO**: La app no arranca, datos se pierden, seguridad comprometida → fix inmediato
- **ALTO**: Feature principal rota → fix antes de continuar con nuevas features
- **MEDIO**: Feature secundaria rota o UX degradada → incluir en próximo ciclo
- **BAJO**: Cosmético, texto, ajustes menores → acumular en batch
