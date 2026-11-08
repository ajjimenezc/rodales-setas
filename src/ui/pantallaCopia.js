import { el } from './dom.js';
import { formatearFecha } from './formato.js';
import { CopiaInvalida } from '../copia/copia.js';

const MENSAJES_EXPORT = {
  compartido: 'Copia enviada a la hoja de compartir. Comprueba que se ha guardado.',
  descargado: 'Copia descargada. Guárdala en un sitio seguro.',
  cancelado: 'Exportación cancelada. No se ha guardado ninguna copia.',
};

// onExportar() -> 'compartido' | 'descargado' | 'cancelado'
// onImportar(texto) -> { anadidos, actualizados, total } (lanza CopiaInvalida si el archivo no vale)
export function pantallaCopia({ ultimaExportacion, leerUltimaExportacion, onExportar, onImportar, onVolver }) {
  const textoUltima = (iso) => (iso ? `Última copia: ${formatearFecha(iso)}` : 'Aún no has exportado ninguna copia.');
  const ultima = el('p', { class: 'ultima' }, textoUltima(ultimaExportacion));
  const estado = el('p', { role: 'status', 'aria-live': 'polite' });
  const error = el('p', { class: 'error', role: 'alert' });
  const archivoIn = el('input', { type: 'file', name: 'archivo', accept: '.json,application/json' });

  const alerta = (e) => {
    error.textContent = e instanceof CopiaInvalida ? e.message : 'No se pudo completar la operación.';
  };

  return el(
    'section',
    { class: 'pantalla copia' },
    el('h1', {}, 'Copia de seguridad'),
    el(
      'p',
      { class: 'aviso' },
      'Tus rodales solo existen en este dispositivo. Si lo pierdes o se borran los datos del navegador, sin copia no se pueden recuperar.',
    ),
    el(
      'p',
      { class: 'aviso aviso-sin-cifrar', role: 'note' },
      el('strong', {}, 'El archivo de copia no está cifrado. '),
      'Quien lo reciba verá la ubicación de tus rodales. No lo publiques ni lo guardes en sitios públicos.',
    ),
    ultima,
    el(
      'button',
      {
        type: 'button',
        name: 'exportar',
        class: 'principal-accion',
        onClick: async () => {
          error.textContent = '';
          estado.textContent = '';
          try {
            estado.textContent = MENSAJES_EXPORT[await onExportar()];
            ultima.textContent = textoUltima(await leerUltimaExportacion?.());
          } catch (e) {
            alerta(e);
          }
        },
      },
      'Exportar copia',
    ),
    el('h2', {}, 'Importar copia'),
    el('label', {}, 'Archivo de copia', archivoIn),
    el(
      'button',
      {
        type: 'button',
        name: 'importar',
        onClick: async () => {
          error.textContent = '';
          estado.textContent = '';
          const archivo = archivoIn.files?.[0];
          if (!archivo) {
            error.textContent = 'Elige primero un archivo de copia.';
            return;
          }
          try {
            const r = await onImportar(await archivo.text());
            estado.textContent = `Importación completada: ${r.anadidos} nuevos, ${r.actualizados} actualizados (${r.total} en la copia).`;
          } catch (e) {
            alerta(e);
          }
        },
      },
      'Importar',
    ),
    estado,
    error,
    el('button', { type: 'button', name: 'volver', onClick: onVolver }, 'Volver'),
  );
}
