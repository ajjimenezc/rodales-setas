// Geolocalización: seguimiento con alta precisión conservando la mejor lectura,
// clasificación de errores y validación de coordenadas manuales.

export const UMBRAL_PRECISION_AVISO_M = 50;

const OPCIONES = { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 };

const MENSAJES = {
  permiso: 'No hay permiso de ubicación. Actívalo en Ajustes, o introduce las coordenadas a mano.',
  'no-disponible': 'No se pudo obtener la posición. Reintenta o introduce las coordenadas a mano.',
  timeout: 'La posición tarda demasiado. Reintenta o introduce las coordenadas a mano.',
};

export function clasificarError(err) {
  // GeolocationPositionError: 1 = permiso denegado, 2 = no disponible, 3 = tiempo agotado
  const tipo = err?.code === 1 ? 'permiso' : err?.code === 3 ? 'timeout' : 'no-disponible';
  return { tipo, mensaje: MENSAJES[tipo] };
}

export function precisionBaja(precision) {
  return precision > UMBRAL_PRECISION_AVISO_M;
}

// Devuelve { detener, mejor }. onPosicion recibe la mejor lectura vista hasta ahora.
export function iniciarSeguimiento({ geo = globalThis.navigator?.geolocation, onPosicion, onError }) {
  if (!geo) {
    onError({ tipo: 'no-disponible', mensaje: MENSAJES['no-disponible'] });
    return { detener() {}, mejor: () => null };
  }
  let mejor = null;
  const id = geo.watchPosition(
    (pos) => {
      const lectura = { lat: pos.coords.latitude, lng: pos.coords.longitude, precision: pos.coords.accuracy };
      if (!mejor || lectura.precision <= mejor.precision) mejor = lectura;
      onPosicion({ ...mejor });
    },
    (err) => onError(clasificarError(err)),
    OPCIONES,
  );
  return { detener: () => geo.clearWatch(id), mejor: () => mejor };
}

// Valida coordenadas escritas a mano. Acepta coma decimal. Devuelve { lat, lng } o { error }.
export function parsearCoordenadas(latTexto, lngTexto) {
  const num = (t) => (String(t).trim() === '' ? NaN : Number(String(t).trim().replace(',', '.')));
  const lat = num(latTexto);
  const lng = num(lngTexto);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { error: 'La latitud debe estar entre -90 y 90.' };
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { error: 'La longitud debe estar entre -180 y 180.' };
  return { lat, lng };
}
