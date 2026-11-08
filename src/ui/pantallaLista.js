import { el } from './dom.js';
import { formatearFecha, formatearCoordenadas } from './formato.js';
import { ordenarRecientesPrimero } from '../db/rodales.js';

export function pantallaLista({ rodales, onNuevo, onAbrir, avisoCopia = null }) {
  const aviso = avisoCopia
    ? el('div', { class: 'aviso aviso-copia', role: 'status' }, 'Hace tiempo que no exportas una copia de tus rodales. ',
        el('button', { type: 'button', name: 'ir-copia', onClick: avisoCopia.onIr }, 'Exportar ahora'))
    : null;
  const nuevo = el('button', { type: 'button', name: 'nuevo', class: 'principal-accion', onClick: onNuevo }, 'Nuevo rodal');
  if (rodales.length === 0) {
    return el('section', { class: 'lista vacia' }, el('p', {}, 'Aún no hay rodales guardados.'), nuevo);
  }
  return el(
    'section',
    { class: 'lista' },
    aviso,
    nuevo,
    el(
      'ul',
      {},
      ordenarRecientesPrimero(rodales).map((r) =>
        el(
          'li',
          {},
          el(
            'button',
            { type: 'button', class: 'rodal', 'data-id': r.id, onClick: () => onAbrir(r) },
            el('strong', {}, r.especies.join(', ')),
            el('span', { class: 'fecha' }, formatearFecha(r.creadoEn)),
            el('span', { class: 'coords' }, formatearCoordenadas(r.lat, r.lng)),
          ),
        ),
      ),
    ),
  );
}
