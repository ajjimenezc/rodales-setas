// Registro del service worker. Solo lo importa main.js (usa un módulo virtual de Vite).
import { registerSW } from 'virtual:pwa-register';
import { mostrarAvisoActualizacion } from './avisoActualizacion.js';

export function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const actualizar = registerSW({
    // Hay una versión nueva esperando: se usará en el siguiente arranque, o ya si el usuario acepta.
    onNeedRefresh() {
      mostrarAvisoActualizacion(document, () => actualizar(true));
    },
  });
}
