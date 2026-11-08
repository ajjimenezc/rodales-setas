export function formatearFecha(iso) {
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatearCoordenadas(lat, lng) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
