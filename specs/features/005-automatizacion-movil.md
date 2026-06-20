# 005 - Automatización Móvil: iOS Shortcuts y Android

**Status:** draft
**Creada:** 2026-06-12
**Autor:** sistema

## Resumen

Configurar atajos nativos en iOS (Shortcuts) y Android (MacroDroid/Tasker) para fichaje automático por geofencing, con alertas interactivas en pantalla de bloqueo.

## Contexto

El fichaje manual es propenso a olvidos. La automatización por geofencing detecta entrada/salida del trabajo y pregunta al usuario si quiere fichar, sin consumo extra de batería.

## Historias de usuario

- Como usuario, quiero que al llegar al trabajo mi móvil me pregunte si quiero fichar, sin abrir la app
- Como usuario, quiero que al salir del trabajo mi móvil me pregunte si quiero fichar la salida
- Como usuario, quiero que el fichaje automático funcione en segundo plano sin gastar batería

## Criterios de aceptación

- [ ] iOS: Atajo "Fichar Entrada" con disparador "Al llegar" + menú SÍ/NO + HTTP POST a Google Apps Script
- [ ] iOS: Atajo "Fichar Salida" con disparador "Al salir" + menú SÍ/NO + HTTP POST a Google Apps Script
- [ ] Android (opcional): MacroDroid/Tasker con macros equivalentes
- [ ] POST envía `{"token": "xxx", "accion": "start|stop", "latitud": ..., "longitud": ...}`

## Notas técnicas

- iOS Shortcuts: automatización personal → "Al llegar" / "Al salir" → obtener localización → mostrar alerta → URL (POST) con body JSON
- Android MacroDroid: trigger "Llegar a ubicación" / "Salir de ubicación" → action HTTP POST
- La latitud/longitud se obtiene del sensor GPS en el momento del disparo
- Sin consumo adicional de batería: el geofencing usa el hardware GPS de bajo consumo

## Verificación

| Criterio     | Método                      | Evidencia                    |
| ------------ | --------------------------- | ---------------------------- |
| Atajo iOS    | Acercarse/salir del trabajo | Alerta SÍ/NO aparece         |
| POST exitoso | Atajo ejecutado             | Fila creada en Google Sheets |
