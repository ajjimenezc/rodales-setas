import { el } from './dom.js';
import { formatearCoordenadas } from './formato.js';
import { crearRodal, editarRodal, normalizarEspecies, sugerirEspecies } from '../db/rodales.js';
import { iniciarSeguimiento, precisionBaja, parsearCoordenadas, UMBRAL_PRECISION_AVISO_M } from '../geo/geolocalizacion.js';

// Formulario de rodal. Sin `rodal` crea uno nuevo con la ubicación actual;
// con `rodal` edita especies y notas (la ubicación no cambia aquí).
// El nodo devuelto tiene `destruir()` para parar el seguimiento GPS si se abandona la pantalla.
export function pantallaRodal({
  rodal = null,
  conocidas = [],
  geo,
  ahora,
  onGuardar,
  onCancelar,
  onBorrar = null,
  confirmar = (msg) => window.confirm(msg),
}) {
  const editando = rodal != null;
  let especies = editando ? [...rodal.especies] : [];
  let posicion = editando ? { lat: rodal.lat, lng: rodal.lng, precision: rodal.precision } : null;
  let seguimiento = null;

  // --- ubicación -----------------------------------------------------------
  const estadoUbicacion = el('p', { class: 'ubicacion', 'aria-live': 'polite' });
  const avisoPrecision = el('p', { class: 'aviso', role: 'status' });
  const errorUbicacion = el('p', { class: 'error', role: 'alert' });
  const latIn = el('input', { type: 'text', inputmode: 'decimal', name: 'lat', placeholder: '42.12345' });
  const lngIn = el('input', { type: 'text', inputmode: 'decimal', name: 'lng', placeholder: '-1.23456' });
  const errorManual = el('p', { class: 'error', role: 'alert' });
  const manual = el(
    'details',
    { class: 'manual' },
    el('summary', {}, 'Introducir coordenadas a mano'),
    el('label', {}, 'Latitud', latIn),
    el('label', {}, 'Longitud', lngIn),
    errorManual,
    el(
      'button',
      {
        type: 'button',
        name: 'usar-coordenadas',
        onClick: () => {
          const r = parsearCoordenadas(latIn.value, lngIn.value);
          errorManual.textContent = r.error ?? '';
          if (r.error) return;
          detener();
          errorUbicacion.textContent = '';
          posicion = { lat: r.lat, lng: r.lng, precision: null };
          pintarUbicacion();
        },
      },
      'Usar estas coordenadas',
    ),
  );

  function pintarUbicacion() {
    if (!posicion) {
      estadoUbicacion.textContent = 'Buscando ubicación…';
      avisoPrecision.textContent = '';
      return;
    }
    const prec = posicion.precision == null ? 'manual' : `±${Math.round(posicion.precision)} m`;
    estadoUbicacion.textContent = `${formatearCoordenadas(posicion.lat, posicion.lng)} (${prec})`;
    avisoPrecision.textContent =
      posicion.precision != null && precisionBaja(posicion.precision)
        ? `Precisión baja (peor de ${UMBRAL_PRECISION_AVISO_M} m). Puedes esperar a una mejor lectura o guardar con esta.`
        : '';
  }

  function detener() {
    seguimiento?.detener();
    seguimiento = null;
  }

  function empezar() {
    detener();
    errorUbicacion.textContent = '';
    posicion = null;
    pintarUbicacion();
    seguimiento = iniciarSeguimiento({
      geo,
      onPosicion: (p) => {
        posicion = p;
        pintarUbicacion();
      },
      onError: (e) => {
        errorUbicacion.textContent = e.mensaje;
        manual.open = true;
      },
    });
  }

  // --- especies ------------------------------------------------------------
  const especieIn = el('input', {
    type: 'text',
    name: 'especie',
    autocomplete: 'off',
    autocapitalize: 'sentences',
    placeholder: 'Ej. Boletus edulis',
  });
  const chips = el('ul', { class: 'chips' });
  const sugerencias = el('ul', { class: 'sugerencias' });
  const errorForm = el('p', { class: 'error', role: 'alert' });

  function pintarEspecies() {
    chips.replaceChildren(
      ...especies.map((e) =>
        el(
          'li',
          {},
          e,
          el('button', { type: 'button', 'aria-label': `Quitar ${e}`, class: 'quitar', onClick: () => { especies = especies.filter((x) => x !== e); pintarEspecies(); } }, '×'),
        ),
      ),
    );
  }

  function pintarSugerencias() {
    const yaAnadidas = new Set(especies.map((e) => e.toLowerCase()));
    const lista = sugerirEspecies(especieIn.value, conocidas).filter((s) => !yaAnadidas.has(s.toLowerCase()));
    sugerencias.replaceChildren(
      ...lista.map((s) => el('li', {}, el('button', { type: 'button', class: 'sugerencia', onClick: () => anadir(s) }, s))),
    );
  }

  function anadir(texto) {
    especies = normalizarEspecies([...especies, texto]);
    especieIn.value = '';
    pintarEspecies();
    pintarSugerencias();
  }

  especieIn.addEventListener('input', pintarSugerencias);
  especieIn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (especieIn.value.trim()) anadir(especieIn.value);
    }
  });

  // --- guardar ------------------------------------------------------------
  const notasIn = el('textarea', { name: 'notas', rows: '4', placeholder: 'Notas (opcional)' });
  notasIn.value = editando ? rodal.notas : '';

  const form = el(
    'form',
    {
      class: 'pantalla',
      onSubmit: async (e) => {
        e.preventDefault();
        errorForm.textContent = '';
        if (especieIn.value.trim()) anadir(especieIn.value); // texto pendiente sin pulsar «Añadir»
        const r = editando
          ? editarRodal(rodal, { especies, notas: notasIn.value }, ahora)
          : crearRodal({ ...(posicion ?? {}), especies, notas: notasIn.value }, ahora);
        if (r.error) {
          errorForm.textContent = r.error;
          return;
        }
        detener();
        await onGuardar(r.rodal);
      },
    },
    el('h1', {}, editando ? 'Editar rodal' : 'Nuevo rodal'),
    el('section', { class: 'bloque-ubicacion' }, estadoUbicacion, avisoPrecision, errorUbicacion),
    editando ? null : el('button', { type: 'button', name: 'reintentar', onClick: empezar }, 'Reintentar ubicación'),
    editando ? null : manual,
    el('label', {}, 'Especies', especieIn),
    sugerencias,
    el('button', { type: 'button', name: 'anadir', onClick: () => { if (especieIn.value.trim()) anadir(especieIn.value); } }, 'Añadir especie'),
    chips,
    el('label', {}, 'Notas', notasIn),
    errorForm,
    el('button', { type: 'submit' }, 'Guardar'),
    el('button', { type: 'button', name: 'cancelar', onClick: () => { detener(); onCancelar(); } }, 'Cancelar'),
    editando && onBorrar
      ? el(
          'button',
          {
            type: 'button',
            name: 'borrar',
            class: 'peligro',
            onClick: async () => {
              if (confirmar('¿Borrar este rodal? No se puede deshacer.')) await onBorrar(rodal);
            },
          },
          'Borrar rodal',
        )
      : null,
  );

  pintarEspecies();
  pintarUbicacion();
  if (!editando) empezar();
  form.destruir = detener;
  return form;
}
