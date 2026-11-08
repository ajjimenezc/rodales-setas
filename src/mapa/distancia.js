// Distancia (Haversine) y rumbo inicial entre dos coordenadas. No requiere red.
const RADIO_TIERRA_M = 6371000;
const rad = (g) => (g * Math.PI) / 180;
const grados = (r) => (r * 180) / Math.PI;

export function distanciaMetros(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Rumbo inicial en grados [0, 360): 0 = norte, 90 = este.
export function rumboGrados(desde, hasta) {
  const dLng = rad(hasta.lng - desde.lng);
  const y = Math.sin(dLng) * Math.cos(rad(hasta.lat));
  const x =
    Math.cos(rad(desde.lat)) * Math.sin(rad(hasta.lat)) -
    Math.sin(rad(desde.lat)) * Math.cos(rad(hasta.lat)) * Math.cos(dLng);
  return (grados(Math.atan2(y, x)) + 360) % 360;
}

const PUNTOS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
export function puntoCardinal(g) {
  return PUNTOS[Math.round(g / 45) % 8];
}

export function formatearDistancia(m) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',')} km`;
}

// Rodales ordenados por cercanía a `origen`, con distancia y rumbo.
export function ordenarPorCercania(rodales, origen) {
  return rodales
    .map((r) => ({ rodal: r, distancia: distanciaMetros(origen, r), rumbo: rumboGrados(origen, r) }))
    .sort((a, b) => a.distancia - b.distancia);
}
