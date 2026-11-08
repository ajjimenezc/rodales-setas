// Vista de mapa. Con red: mapa Leaflet con marcadores. Sin red (o si el mapa base no carga):
// lista por cercanía con distancia y rumbo. Solo las teselas salen del dispositivo.
import L from 'leaflet';
import { el } from '../ui/dom.js';
import { formatearFecha, formatearCoordenadas } from '../ui/formato.js';
import { ordenarPorCercania, formatearDistancia, puntoCardinal } from './distancia.js';

const URL_TESELAS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const ERRORES_PARA_FALLBACK = 3;

function contenidoPopup(rodal, { puedeMover, onMover }) {
  return el(
    'div',
    { class: 'popup-rodal' },
    el('strong', {}, rodal.especies.join(', ')),
    el('div', {}, formatearFecha(rodal.creadoEn)),
    rodal.notas ? el('p', {}, rodal.notas) : null,
    puedeMover ? el('button', { type: 'button', class: 'mover', onClick: onMover }, 'Mover marcador') : null,
  );
}

export function pantallaMapa({
  rodales,
  geo = globalThis.navigator?.geolocation,
  enLinea = () => globalThis.navigator?.onLine !== false,
  ventana = globalThis.window,
  onMover = async () => {},
  confirmar = (msg) => window.confirm(msg),
}) {
  let mapa = null;
  let capaMarcadores = null;
  let marcadorYo = null;
  let posicion = null;
  let idWatch = null;
  let tesDeCarga = 0;
  let tesFallidas = 0;
  let mapaDisponible = enLinea();
  let destruido = false;

  const aviso = el('p', { class: 'aviso', role: 'status' });
  const contenedorMapa = el('div', { class: 'mapa', style: 'height: 60vh;' });
  const fallback = el('section', { class: 'sin-mapa' });
  const botonCentrar = el('button', { type: 'button', name: 'centrar', onClick: centrar }, 'Centrar en mi posición');
  const raiz = el('section', { class: 'vista-mapa' }, aviso, contenedorMapa, fallback, botonCentrar);

  // --- fallback sin mapa ---------------------------------------------------
  function pintarFallback() {
    if (rodales.length === 0) {
      fallback.replaceChildren(el('p', {}, 'Aún no hay rodales guardados.'));
      return;
    }
    if (posicion) {
      const items = ordenarPorCercania(rodales, posicion).map(({ rodal, distancia, rumbo }) =>
        el(
          'li',
          { 'data-id': rodal.id },
          el('strong', {}, rodal.especies.join(', ')),
          el('span', { class: 'dist' }, ` ${formatearDistancia(distancia)} al ${puntoCardinal(rumbo)} (${Math.round(rumbo)}°)`),
        ),
      );
      fallback.replaceChildren(el('ul', {}, items));
    } else {
      fallback.replaceChildren(
        el(
          'ul',
          {},
          rodales.map((r) =>
            el('li', { 'data-id': r.id }, el('strong', {}, r.especies.join(', ')), el('span', { class: 'coords' }, ` ${formatearCoordenadas(r.lat, r.lng)}`)),
          ),
        ),
      );
    }
  }

  function actualizarModo() {
    const conMapa = mapaDisponible;
    contenedorMapa.hidden = !conMapa;
    fallback.hidden = conMapa;
    botonCentrar.hidden = !conMapa || !posicion;
    aviso.textContent = conMapa
      ? ''
      : 'El mapa no está disponible sin conexión. Se muestran tus rodales ordenados por cercanía.';
    if (conMapa) {
      crearMapaSiHaceFalta();
      mapa?.invalidateSize();
    } else {
      pintarFallback();
    }
  }

  // --- mapa ---------------------------------------------------------------
  function crearMapaSiHaceFalta() {
    if (mapa || destruido) return;
    mapa = L.map(contenedorMapa, { zoomControl: true });
    const teselas = L.tileLayer(URL_TESELAS, { maxZoom: 19, attribution: ATRIBUCION, referrerPolicy: 'origin' });
    teselas.on('tileload', () => { tesDeCarga++; });
    teselas.on('tileerror', () => {
      tesFallidas++;
      if (tesDeCarga === 0 && tesFallidas >= ERRORES_PARA_FALLBACK) {
        mapaDisponible = false;
        actualizarModo();
      }
    });
    teselas.addTo(mapa);
    capaMarcadores = L.layerGroup().addTo(mapa);
    pintarMarcadores();
    encuadrar();
  }

  function pintarMarcadores() {
    if (!capaMarcadores) return;
    capaMarcadores.clearLayers();
    for (const rodal of rodales) {
      const marcador = L.marker([rodal.lat, rodal.lng], {
        icon: L.divIcon({ className: 'marcador-rodal', iconSize: [22, 22] }),
        title: rodal.especies.join(', '),
        draggable: false,
      });
      marcador.rodal = rodal;
      marcador.bindPopup(() =>
        contenidoPopup(rodal, { puedeMover: mapaDisponible, onMover: () => iniciarMovimiento(marcador) }),
      );
      capaMarcadores.addLayer(marcador);
    }
  }

  function encuadrar() {
    if (!mapa) return;
    if (rodales.length > 0) {
      mapa.fitBounds(L.latLngBounds(rodales.map((r) => [r.lat, r.lng])), { padding: [30, 30], maxZoom: 16 });
    } else if (posicion) {
      mapa.setView([posicion.lat, posicion.lng], 15);
    } else {
      mapa.setView([40.4, -3.7], 5);
    }
  }

  // --- ajuste de posición (5.4) -------------------------------------------
  function iniciarMovimiento(marcador) {
    marcador.closePopup();
    const original = marcador.getLatLng();
    marcador.dragging.enable();
    marcador.off('dragend'); // evita acumular escuchadores si se pulsa «Mover» varias veces sin arrastrar
    marcador.once('dragend', async () => {
      marcador.dragging.disable();
      const { lat, lng } = marcador.getLatLng();
      if (confirmar(`¿Guardar la nueva posición (${formatearCoordenadas(lat, lng)})?`)) {
        const actualizado = { ...marcador.rodal, lat, lng };
        await onMover(actualizado);
        marcador.rodal = actualizado;
        const i = rodales.findIndex((r) => r.id === actualizado.id);
        if (i >= 0) rodales[i] = actualizado;
      } else {
        marcador.setLatLng(original);
      }
    });
  }

  // --- posición actual -----------------------------------------------------
  function alRecibirPosicion(pos) {
    posicion = { lat: pos.coords.latitude, lng: pos.coords.longitude, precision: pos.coords.accuracy };
    if (mapa) {
      if (!marcadorYo) {
        marcadorYo = L.circleMarker([posicion.lat, posicion.lng], { radius: 8, className: 'yo' }).addTo(mapa);
      } else {
        marcadorYo.setLatLng([posicion.lat, posicion.lng]);
      }
    }
    if (!mapaDisponible) pintarFallback();
    botonCentrar.hidden = !mapaDisponible;
  }

  function centrar() {
    if (mapa && posicion) mapa.setView([posicion.lat, posicion.lng], Math.max(mapa.getZoom(), 15));
  }

  // --- vida de la pantalla ------------------------------------------------
  const alCambiarRed = () => {
    const ahora = enLinea();
    if (ahora === mapaDisponible) return;
    mapaDisponible = ahora;
    if (ahora) { tesDeCarga = 0; tesFallidas = 0; }
    actualizarModo();
  };
  ventana?.addEventListener('online', alCambiarRed);
  ventana?.addEventListener('offline', alCambiarRed);

  if (geo) {
    idWatch = geo.watchPosition(alRecibirPosicion, () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
  }

  actualizarModo();

  raiz.destruir = () => {
    destruido = true;
    ventana?.removeEventListener('online', alCambiarRed);
    ventana?.removeEventListener('offline', alCambiarRed);
    if (idWatch != null) geo?.clearWatch(idWatch);
    mapa?.remove();
    mapa = null;
  };
  raiz.mapa = () => mapa; // para pruebas
  return raiz;
}
