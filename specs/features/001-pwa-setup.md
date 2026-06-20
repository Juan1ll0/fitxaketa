# 001 - Setup Inicial PWA

**Status:** done
**Creada:** 2026-06-10
**Autor:** sistema

## Resumen

Inicializar el proyecto Fitxaketa como PWA moderna con SvelteKit, TypeScript, Tailwind CSS v4 y capacidades PWA completas.

## Contexto

Punto de partida del proyecto. Se necesita un esqueleto funcional con offline support, web app manifest, push notifications y background sync.

## Historias de usuario

- Como desarrollador, quiero un proyecto SvelteKit funcional con TypeScript para tener type safety
- Como usuario, quiero que la app sea instalable en mi dispositivo móvil
- Como usuario, quiero que la app funcione sin conexión a internet
- Como usuario, quiero recibir notificaciones push relevantes

## Criterios de aceptación

- [x] SvelteKit v2 + Svelte 5 (runes mode) + TypeScript
- [x] Tailwind CSS v4 con Vite plugin (CSS-first config)
- [x] Web App Manifest con iconos
- [x] Service Worker con estrategia injectManifest
- [x] Offline support (app shell caching)
- [x] Push notifications (service worker listeners)
- [x] Background sync (Workbox BackgroundSyncPlugin)
- [x] Componente PWAUpdatePrompt para actualizaciones
- [x] Página principal con reloj de fichaje

## Notas técnicas

- `@vite-pwa/sveltekit` con `strategies: 'injectManifest'` para control total del SW
- `kit.serviceWorker.register: false` en vite.config.ts para evitar doble registro
- Tailwind v4: sin `tailwind.config.js`, todo en `src/app.css` via `@theme {}`
- Workbox `globPatterns` usa prefijo `client/` (requerido por SvelteKit)
- `process.env.NODE_ENV` definido en vite.config.ts para Workbox en producción

## Verificación

| Criterio        | Método                        | Evidencia                   |
| --------------- | ----------------------------- | --------------------------- |
| Build exitoso   | `npm run build`               | Sin errores                 |
| Type check      | `npm run check`               | Sin errores                 |
| Dev server      | `npm run dev`                 | App carga en localhost:5173 |
| PWA installable | Chrome DevTools > Application | Manifest detectado          |
