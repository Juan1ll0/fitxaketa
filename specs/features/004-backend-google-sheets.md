# 004 - Backend: Google Apps Script + Google Sheets

**Status:** draft
**Creada:** 2026-06-12
**Autor:** sistema

## Resumen

Crear el backend serverless en Google Apps Script con Google Sheets como base de datos, exponiendo una Web App con `doPost(e)` / `doGet(e)` protegida por token secreto.

## Contexto

El sistema necesita persistencia en la nube sin servidores propios. Google Sheets ofrece almacenamiento gratuito y accesible, y Google Apps Script actúa como API intermediaria validando peticiones y escribiendo/leyendo datos.

## Historias de usuario

- Como usuario, quiero que mis fichajes se almacenen en la nube para consultarlos desde cualquier dispositivo
- Como usuario, quiero que solo yo pueda enviar datos a mi hoja de cálculo mediante un token secreto
- Como desarrollador, quiero una API REST simple (POST para escribir, GET para leer) para integrar con la PWA y los atajos móviles

## Criterios de aceptación

- [ ] Hoja de cálculo creada con pestañas `Fichajes` y `Ubicaciones`
- [ ] `doPost(e)` validando token y escribiendo en `Fichajes` (acciones start/stop con timestamp y coordenadas)
- [ ] `doGet(e)` validando token y devolviendo JSON con los registros de los últimos 30 días
- [ ] Web App desplegada como "/exec" con ejecución como "Yo" y acceso "Cualquiera"

## Notas técnicas

- Pestaña `Fichajes`: columnas `timestamp`, `accion`, `latitud`, `longitud`, `token`
- Pestaña `Ubicaciones`: columnas `nombre`, `latitud`, `longitud`
- `doPost(e)`: extraer body JSON, validar `token` contra `TOKEN_SECRETO`, append row
- `doGet(e)`: devolver JSON con `ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)`
- `TOKEN_SECRETO` definido como property del script (PropertiesService)
- `mode: 'no-cors'` requerido en fetch desde frontend

## Verificación

| Criterio           | Método                     | Evidencia           |
| ------------------ | -------------------------- | ------------------- |
| POST funciona      | curl o Postman a URL /exec | Devuelve 200        |
| GET funciona       | curl a URL /exec?token=xxx | Devuelve JSON array |
| Token inválido     | GET/POST con token erróneo | Devuelve 403        |
| Sheets actualizado | Abrir Google Sheets        | Filas en `Fichajes` |
