# Patrones Google Apps Script — Fitxaketa

> Los principios generales están en `.agents/skills/coding-standards.md`, adaptados aquí al entorno GAS (sin clases ES6, sin imports, sin npm). ESLint cubre `gas/**` (tamaño de funciones/ficheros, complejidad, globals de Apps Script declarados en `eslint.config.js`); lo específico de GAS (token primero, batch, idempotencia) lo valida el architect.

---

## Checklist normativo

### Seguridad

- Validar `TOKEN_SECRETO` como PRIMER paso de todo handler
- Secretos SOLO en `PropertiesService.getScriptProperties()` — nunca hardcodeados
- `doPost(e)` y `doGet(e)` son los únicos entrypoints externos

### Estructura

- Un fichero por responsabilidad: `main.gs` (solo routing), `auth.gs`, `fichajes.gs`, `ubicaciones.gs`, `utils.gs` (puras), `response.gs`
- Ficheros ≤ 200 líneas
- `doPost`/`doGet` solo enrutan: parsear → validar token → delegar a función por acción → responder
- Transformaciones de datos en funciones puras (`utils.gs`), separadas de los side effects de Sheets

### Respuestas

- Siempre JSON via `ContentService.createTextOutput(...).setMimeType(ContentService.MimeType.JSON)`
- Formato uniforme: `{ ok: true, ...data }` | `{ ok: false, error: msg }`

### Rendimiento (límite GAS: 6 min/ejecución; cada llamada a Sheets ~100-500 ms)

- PROHIBIDO llamar a Sheets dentro de un bucle — usar batch `getValues()`/`setValues()`
- Validar token sin tocar Sheets (target: respuesta < 500 ms)
- Registrar un fichaje: < 1 s · consultar 100 registros: < 2 s · batch N fichajes: < 3 s

### Robustez

- Idempotencia: el cliente PWA reintenta — toda operación de registro acepta `clientId` (UUID) y tolera duplicados
- `console.log` en entrypoints para depuración (único acceso a logs en producción)

### Despliegue

- Ejecutar como: "Yo" · Acceso: "Cualquiera"
- Cada cambio requiere nueva versión de despliegue

---

## Apéndice de ejemplos

### C1 — main.gs: solo enrutamiento

```javascript
function doPost(e) {
	try {
		const params = JSON.parse(e.postData.contents);
		validarToken(params); // auth.gs
		if (params.accion === 'fichar') return respuestaOk(registrarFichaje(params));
		if (params.accion === 'ubicacion') return respuestaOk(guardarUbicacion(params));
		throw new Error('Acción desconocida: ' + params.accion);
	} catch (err) {
		return respuestaError(err.message);
	}
}

function doGet(e) {
	try {
		validarToken(e.parameter);
		return respuestaOk({ fichajes: obtenerFichajes(100) });
	} catch (err) {
		return respuestaError(err.message);
	}
}
```

### C2 — auth.gs y response.gs

```javascript
const CONFIG = {
	TOKEN: PropertiesService.getScriptProperties().getProperty('TOKEN_SECRETO'),
	SHEET_ID: PropertiesService.getScriptProperties().getProperty('SHEET_ID'),
	TAB_FICHAJES: 'Fichajes',
	TAB_UBICACIONES: 'Ubicaciones'
};

function validarToken(params) {
	if (!params || params.token !== CONFIG.TOKEN) throw new Error('Token inválido');
}

function respuestaOk(data) {
	return ContentService.createTextOutput(JSON.stringify({ ok: true, ...data })).setMimeType(
		ContentService.MimeType.JSON
	);
}

function respuestaError(mensaje) {
	return ContentService.createTextOutput(JSON.stringify({ ok: false, error: mensaje })).setMimeType(
		ContentService.MimeType.JSON
	);
}
```

### C3 — Puras en utils.gs, side effects en fichajes.gs

```javascript
// utils.gs — sin red ni Sheets
function calcularDuracionHoras(entrada, salida) {
	return (salida - entrada) / (1000 * 60 * 60);
}

// fichajes.gs — usa las puras, contiene el side effect
function registrarFichaje(params) {
	const sheet = getSheet(CONFIG.TAB_FICHAJES);
	sheet.appendRow([
		new Date(params.timestamp),
		params.accion,
		params.lat || '',
		params.lng || '',
		new Date()
	]);
	return { mensaje: 'Registrado' };
}
```

### C4 — Batch vs. bucle (rendimiento)

```javascript
// MAL — N llamadas a Sheets
fichajes.forEach((f) => sheet.appendRow([f.timestamp, f.tipo]));

// BIEN — 1 llamada
const filas = fichajes.map((f) => [f.timestamp, f.tipo, f.lat, f.lng]);
sheet.getRange(sheet.getLastRow() + 1, 1, filas.length, filas[0].length).setValues(filas);
```

### C5 — Idempotencia

```javascript
function registrarFichaje(params) {
	if (yaExiste(params.clientId)) {
		return { mensaje: 'Ya registrado', id: params.clientId };
	}
	// ... insertar con clientId como columna
}
```

### C6 — Llamada desde la PWA

```ts
// mode: 'no-cors' obligatorio — GAS no soporta preflight CORS.
// La respuesta es opaque: no se puede leer. Asumir éxito y confiar en idempotencia.
await fetch(gasUrl, {
	method: 'POST',
	mode: 'no-cors',
	body: JSON.stringify({ token, accion: 'fichar', clientId, timestamp })
});
```
