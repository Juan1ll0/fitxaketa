# Fitxaketa

PWA de **registro de jornada laboral**: eficiente, gratuita, privada y de bajo consumo.
Funciona _offline-first_ — todos los datos se guardan en el propio dispositivo
(IndexedDB), sin servidores ni cuentas. Instalable en el móvil como app nativa.

> **Estado actual:** la app funciona **100% en local/offline**. El backend en la nube
> (Google Sheets + Apps Script) y la automatización móvil por geofencing (iOS Atajos /
> Android MacroDroid) están especificados como trabajo futuro (`specs/features/004`,
> `005`) y **aún no están implementados**.

## Funcionalidades

La app se organiza en cuatro pestañas (barra inferior):

- **Fichar** (`/`) — Dashboard principal: reloj y fecha en vivo, **cronómetro** de la
  jornada en curso, botón de iniciar/cerrar fichaje, **alta manual** de jornadas
  (modal), aviso de jornada abierta y resumen del periodo.
- **Historial** (`/historial`) — Jornadas agrupadas por día, con **filtros por rango de
  fechas** y exportación.
- **Estadísticas** (`/estadisticas`) — Gráficas (Chart.js) de horas por día/semana/mes,
  navegación entre periodos y paginación, con objetivo de horas configurable.
- **Ajustes** (`/configuracion`) — Primer día de la semana, horas semanales objetivo,
  días laborables, jornada mínima, **redondeo** de la duración y **histórico** de horas
  semanales (los cambios se guardan como snapshots con fecha).

Características PWA:

- **Instalable** ("Añadir a pantalla de inicio") y ejecución en modo **standalone**.
- **Offline**: la app carga y funciona sin red gracias al service worker.
- **Auto-actualización**: aviso de nueva versión (`PWAUpdatePrompt`).

## Stack

- **SvelteKit v2** + **Svelte 5** (runes: `$state`, `$derived`, `$effect`, `$props`)
- **Tailwind CSS v4** (config CSS-first en `src/app.css`, sin `tailwind.config.js`)
- **Dexie.js** — wrapper de IndexedDB para almacenamiento offline-first
- **Chart.js** — gráficas de estadísticas
- **@vite-pwa/sveltekit** — PWA con estrategia `injectManifest` (SW en `src/service-worker.ts`)
- **Vitest** + **@testing-library/svelte** (unit) y **Playwright** (e2e)

No hay `svelte.config.js`: el adapter y la config de Kit, PWA y Tailwind viven en
`vite.config.ts`.

## Requisitos

- **Node 24+** (gestionado con [fnm](https://github.com/Schniz/fnm)).
  En cada shell: `eval "$(fnm env)" && fnm use 24`.

## Instalación y desarrollo

```sh
npm install
npm run dev          # servidor de desarrollo en http://localhost:5173
```

Build de producción y previsualización local:

```sh
npm run build
npm run preview      # sirve el build en http://localhost:4173
```

### Scripts útiles

```sh
npm run check        # svelte-check: tipos + a11y (warnings como error)
npm run lint         # ESLint (complejidad, tamaño, no-any)
npm run format       # Prettier (incluye orden de clases Tailwind)
npm run test:unit    # Vitest
npm run test:e2e     # Playwright
npm run quality      # quality gate completo (format, lint, check, build, tests, size…)
```

Tras cada cambio: `npm run format && npm run lint && npm run check`.
Antes de cerrar una feature: `npm run quality`.

## Probar en un dispositivo físico (iOS / Android)

Safari iOS solo activa el service worker y la instalación PWA en **contexto seguro
(HTTPS)**. La IP de la red local por `http://` **no** es contexto seguro, así que para
probar la PWA en un iPhone/iPad real necesitas servir por HTTPS con un certificado en
el que el dispositivo confíe. Lo conseguimos con [mkcert](https://github.com/FiloSottile/mkcert)
(una CA local), sin exponer nada a internet.

> Solo hay que hacer esto una vez. El root CA se instala en el dispositivo una sola vez;
> después basta con `npm run build && npm run preview` para cada prueba.

### 1. Instalar mkcert

Con tu gestor de paquetes (Arch/CachyOS: `sudo pacman -S mkcert`; macOS: `brew install
mkcert`), o descargando el binario:

```sh
# Linux x86_64, sin permisos de root:
curl -fsSL -o ~/.local/bin/mkcert \
  https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
chmod +x ~/.local/bin/mkcert
```

### 2. Generar la CA local y el certificado

Genera el certificado para el **nombre mDNS** de tu equipo (`<hostname>.local`, estable
aunque cambie la IP por DHCP) y, opcionalmente, para tu IP de LAN como respaldo:

```sh
mkcert -CAROOT                       # ruta donde queda rootCA.pem
mkdir -p certs
mkcert -cert-file certs/dev.pem -key-file certs/dev-key.pem \
  "$(hostname).local" 192.168.1.50 localhost 127.0.0.1 ::1
```

`vite.config.ts` activa HTTPS automáticamente **solo si existen** `certs/dev.pem` y
`certs/dev-key.pem` (la carpeta `certs/` está en `.gitignore`). Sin ellos, `dev`/`preview`
siguen sirviendo por `http` con normalidad.

### 3. Confiar la CA en el dispositivo (una sola vez)

Transfiere `rootCA.pem` al dispositivo. Una opción sin AirDrop es servirlo por HTTP en
la LAN y abrirlo desde el navegador del móvil:

```sh
python3 -m http.server 8000 --directory "$(mkcert -CAROOT)"
# En el móvil: http://<hostname>.local:8000/rootCA.pem  (o por IP)
```

En **iOS**:

1. Safari descarga el perfil → **Ajustes → General → VPN y gestión de dispositivos** →
   instalar el perfil "mkcert".
2. ⚠️ **Paso crítico:** **Ajustes → General → Información → Ajustes de confianza de
   certificados** → activa el interruptor de la CA de mkcert.

(En **Android** se importa desde **Ajustes → Seguridad → Cifrado y credenciales →
Instalar un certificado → Certificado de CA**.)

### 4. Servir la app por HTTPS y abrirla en el móvil

```sh
npm run build
npm run preview      # ahora en https://<hostname>.local:4173
```

En el móvil (misma Wi-Fi) abre `https://<hostname>.local:4173` (o por IP si el `.local`
no resuelve). Debe verse como sitio **seguro** (candado, sin avisos). Después:
**Compartir → Añadir a pantalla de inicio** y abre el icono — debería abrir en modo
**standalone**. Para probar el offline, activa el **Modo Avión** y reábrela.

### Firewall

Si usas `ufw`, abre los puertos en la LAN:

```sh
sudo ufw allow 4173/tcp           # preview HTTPS
sudo ufw allow 8000/tcp           # temporal, solo para transferir la CA
# al terminar: sudo ufw delete allow 8000/tcp
```

### Notas

- Al usar el nombre mDNS `.local` (publicado por `avahi-daemon`/Bonjour) el certificado
  sigue siendo válido aunque cambie la IP del equipo.
- Si una Wi-Fi tiene _aislamiento de clientes_ (AP isolation), los dispositivos no se ven
  entre sí: prueba en otra red o con un hotspot.
- Si tras instalar una versión nueva ves "código antiguo", borra el icono de la pantalla
  de inicio y los datos del sitio (iOS: **Ajustes → Safari → Avanzado → Datos de sitios
  web**) para limpiar el service worker cacheado, y vuelve a añadir el icono.

## Estructura del proyecto

```
src/
├── lib/
│   ├── components/      # Componentes Svelte (dashboard, gráficas, modales…)
│   ├── stores/          # Estado de la app (runes)
│   ├── utils/           # Lógica pura (cálculos de dashboard, fechas, redondeo…)
│   ├── db.ts            # Esquema Dexie (jornadas)
│   └── db-settings.ts   # Ajustes con histórico (snapshots)
├── routes/              # Rutas (Fichar, Historial, Estadísticas, Ajustes)
├── app.css             # Tailwind + tema
├── app.html            # Plantilla HTML (meta PWA iOS, link al manifest)
└── service-worker.ts   # Service worker PWA (injectManifest)
static/                 # Iconos, manifest, robots.txt
specs/                  # Especificaciones (workflow SDD)
```

## Especificaciones

El desarrollo sigue un flujo _Spec-Driven Development_ multi-agente. Las
especificaciones de cada feature están en `specs/features/` (ver `specs/README.md` y
`AGENTS.md` para el workflow y la arquitectura de agentes).
