import { el } from '../ui/dom.js';

export function crearAvisoActualizacion(onActualizar, onDespues) {
  return el(
    'div',
    { class: 'aviso aviso-actualizacion', role: 'status' },
    'Hay una versión nueva de la app. ',
    el('button', { type: 'button', name: 'actualizar', onClick: onActualizar }, 'Actualizar'),
    el('button', { type: 'button', name: 'despues', onClick: onDespues }, 'Luego'),
  );
}

// Se añade al documento (fuera de las pantallas) para que un bloqueo no lo borre.
export function mostrarAvisoActualizacion(doc, onActualizar) {
  if (doc.querySelector('.aviso-actualizacion')) return;
  const aviso = crearAvisoActualizacion(onActualizar, () => aviso.remove());
  doc.body.prepend(aviso);
  return aviso;
}
