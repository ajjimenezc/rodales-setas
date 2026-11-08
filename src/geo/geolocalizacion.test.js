import { describe, it, expect, vi } from 'vitest';
import {
  iniciarSeguimiento,
  clasificarError,
  precisionBaja,
  parsearCoordenadas,
} from './geolocalizacion.js';

function geoFalsa() {
  const api = {
    exito: null,
    fallo: null,
    watchPosition: vi.fn((ok, ko) => {
      api.exito = ok;
      api.fallo = ko;
      return 7;
    }),
    clearWatch: vi.fn(),
  };
  return api;
}
const pos = (lat, lng, accuracy) => ({ coords: { latitude: lat, longitude: lng, accuracy } });

describe('geolocalización (4.1)', () => {
  it('conserva la mejor lectura y no la empeora con una peor', () => {
    const geo = geoFalsa();
    const lecturas = [];
    iniciarSeguimiento({ geo, onPosicion: (p) => lecturas.push(p), onError: vi.fn() });
    geo.exito(pos(42, -1, 30));
    geo.exito(pos(42.1, -1.1, 10));
    geo.exito(pos(43, -2, 80)); // peor: se ignora
    expect(lecturas.at(-1)).toEqual({ lat: 42.1, lng: -1.1, precision: 10 });
  });

  it('detener limpia el watch', () => {
    const geo = geoFalsa();
    const seg = iniciarSeguimiento({ geo, onPosicion: vi.fn(), onError: vi.fn() });
    seg.detener();
    expect(geo.clearWatch).toHaveBeenCalledWith(7);
  });

  it('pide alta precisión', () => {
    const geo = geoFalsa();
    iniciarSeguimiento({ geo, onPosicion: vi.fn(), onError: vi.fn() });
    expect(geo.watchPosition.mock.calls[0][2].enableHighAccuracy).toBe(true);
  });

  it('permiso denegado se clasifica como tal y explica el motivo', () => {
    const geo = geoFalsa();
    const onError = vi.fn();
    iniciarSeguimiento({ geo, onPosicion: vi.fn(), onError });
    geo.fallo({ code: 1 });
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0].tipo).toBe('permiso');
    expect(onError.mock.calls[0][0].mensaje).toContain('permiso');
  });

  it('clasifica timeout y posición no disponible', () => {
    expect(clasificarError({ code: 3 }).tipo).toBe('timeout');
    expect(clasificarError({ code: 2 }).tipo).toBe('no-disponible');
  });

  it('sin API de geolocalización informa del error', () => {
    const onError = vi.fn();
    iniciarSeguimiento({ geo: null, onPosicion: vi.fn(), onError });
    expect(onError.mock.calls[0][0].tipo).toBe('no-disponible');
  });

  it('avisa con precisión peor de 50 m, y no en el límite', () => {
    expect(precisionBaja(50.1)).toBe(true);
    expect(precisionBaja(50)).toBe(false);
    expect(precisionBaja(8)).toBe(false);
  });

  it('valida coordenadas manuales', () => {
    expect(parsearCoordenadas('42,5', '-1.25')).toEqual({ lat: 42.5, lng: -1.25 });
    expect(parsearCoordenadas('91', '0').error).toContain('latitud');
    expect(parsearCoordenadas('0', '181').error).toContain('longitud');
    expect(parsearCoordenadas('', '0').error).toContain('latitud');
    expect(parsearCoordenadas('abc', '0').error).toContain('latitud');
  });
});
