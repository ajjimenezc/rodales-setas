import { describe, it, expect } from 'vitest';
import {
  distanciaMetros,
  rumboGrados,
  puntoCardinal,
  formatearDistancia,
  ordenarPorCercania,
} from './distancia.js';

const madrid = { lat: 40.4168, lng: -3.7038 };
const barcelona = { lat: 41.3874, lng: 2.1686 };

describe('distancia y rumbo (5.3)', () => {
  it('Madrid-Barcelona ronda los 505 km', () => {
    const km = distanciaMetros(madrid, barcelona) / 1000;
    expect(km).toBeGreaterThan(500);
    expect(km).toBeLessThan(510);
  });

  it('un grado de latitud son ~111,2 km', () => {
    const m = distanciaMetros({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(m).toBeGreaterThan(111000);
    expect(m).toBeLessThan(111400);
  });

  it('distancia cero para el mismo punto', () => {
    expect(distanciaMetros(madrid, madrid)).toBe(0);
  });

  it('rumbos cardinales', () => {
    const o = { lat: 0, lng: 0 };
    expect(rumboGrados(o, { lat: 1, lng: 0 })).toBeCloseTo(0, 1);
    expect(rumboGrados(o, { lat: 0, lng: 1 })).toBeCloseTo(90, 1);
    expect(rumboGrados(o, { lat: -1, lng: 0 })).toBeCloseTo(180, 1);
    expect(rumboGrados(o, { lat: 0, lng: -1 })).toBeCloseTo(270, 1);
  });

  it('rumbo Madrid -> Barcelona es hacia el este-noreste (~76°, calculado a mano)', () => {
    const g = rumboGrados(madrid, barcelona);
    expect(g).toBeGreaterThan(75);
    expect(g).toBeLessThan(77);
    expect(puntoCardinal(g)).toBe('E');
  });

  it('punto cardinal', () => {
    expect(puntoCardinal(0)).toBe('N');
    expect(puntoCardinal(44)).toBe('NE');
    expect(puntoCardinal(90)).toBe('E');
    expect(puntoCardinal(225)).toBe('SO');
    expect(puntoCardinal(359)).toBe('N');
  });

  it('formatea la distancia', () => {
    expect(formatearDistancia(349.6)).toBe('350 m');
    expect(formatearDistancia(1234)).toBe('1,2 km');
    expect(formatearDistancia(15400)).toBe('15 km');
  });

  it('ordena por cercanía', () => {
    const origen = { lat: 42, lng: -1 };
    const r = (id, lat, lng) => ({ id, lat, lng });
    const orden = ordenarPorCercania([r('lejos', 42.1, -1), r('cerca', 42.001, -1), r('medio', 42.01, -1)], origen);
    expect(orden.map((x) => x.rodal.id)).toEqual(['cerca', 'medio', 'lejos']);
    expect(orden[0].distancia).toBeLessThan(orden[1].distancia);
  });
});
