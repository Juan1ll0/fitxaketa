// App 100% cliente (datos en IndexedDB): sin SSR. Prerenderizamos el shell estático
// para que quede en la salida del build y el service worker pueda precachearlo y
// servir la PWA offline. La hidratación rellena el contenido en el cliente.
export const ssr = false;
export const prerender = true;
