// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { pantallaMapa } from './pantallaMapa.js';

const r = (id, lat, lng, especies, notas = '') => ({
  id, lat, lng, precision: 8, creadoEn: '2026-11-08T10:00:00.000Z', actualizadoEn: '2026-11-08T10:00:00.000Z', especies, notas,
});
const datos = () => [r('a', 42.0, -1.0, ['Boletus edulis'], 'bajo el pino'), r('b', 42.01, -1.0, ['Lactarius deliciosus'])];

function geoFalsa() {
  const api = {
    watchPosition: vi.fn((ok) => { api.ok = ok; return 3; }),
    clearWatch: vi.fn(),
  };
  return api;
}
const pos = (lat, lng) => ({ coords: { latitude: lat, longitude: lng, accuracy: 5 } });
let pantallas = [];
function montar(opciones) {
  const p = pantallaMapa({ ventana: window, ...opciones });
  document.body.replaceChildren(p);
  pantallas.push(p);
  return p;
}
afterEach(() => { pantallas.forEach((p) => p.destruir()); pantallas = []; });

describe('mapa online (5.1)', () => {
  it('muestra un marcador por rodal', () => {
    const p = montar({ rodales: datos(), geo: null, enLinea: () => true });
    expect(p.querySelectorAll('.leaflet-marker-icon')).toHaveLength(2);
    expect(p.querySelector('.sin-mapa').hidden).toBe(true);
  });

  it('el popup muestra fecha, especies y notas como texto', () => {
    const rodales = [r('a', 42, -1, ['<b>Boletus</b>'], '<img src=x onerror=alert(1)>')];
    const p = montar({ rodales, geo: null, enLinea: () => true });
    p.querySelector('.leaflet-marker-icon').click();
    const popup = p.querySelector('.leaflet-popup-content');
    expect(popup.textContent).toContain('<b>Boletus</b>');
    expect(popup.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(popup.textContent).toMatch(/2026|nov/i);
    expect(popup.querySelector('img')).toBeNull();
  });

  it('sin rodales no falla y muestra el mapa', () => {
    const p = montar({ rodales: [], geo: null, enLinea: () => true });
    expect(p.querySelectorAll('.leaflet-marker-icon')).toHaveLength(0);
    expect(p.mapa()).not.toBeNull();
  });
});

describe('posición actual (5.2)', () => {
  it('muestra la posición y permite centrarse', () => {
    const geo = geoFalsa();
    const p = montar({ rodales: datos(), geo, enLinea: () => true });
    const boton = p.querySelector('[name="centrar"]');
    expect(boton.hidden).toBe(true); // sin posición aún
    geo.ok(pos(42.5, -1.5));
    expect(p.querySelector('.yo')).not.toBeNull();
    expect(boton.hidden).toBe(false);
    boton.click();
    const c = p.mapa().getCenter();
    expect(c.lat).toBeCloseTo(42.5, 3);
    expect(c.lng).toBeCloseTo(-1.5, 3);
  });

  it('sin permiso de ubicación no muestra el botón de centrar', () => {
    const p = montar({ rodales: datos(), geo: null, enLinea: () => true });
    expect(p.querySelector('[name="centrar"]').hidden).toBe(true);
  });

  it('para el seguimiento al destruir la pantalla', () => {
    const geo = geoFalsa();
    const p = montar({ rodales: datos(), geo, enLinea: () => true });
    p.destruir();
    expect(geo.clearWatch).toHaveBeenCalledWith(3);
  });
});

describe('vista sin conexión (5.3)', () => {
  it('sin red y con posición: lista por cercanía con distancia y rumbo', () => {
    const geo = geoFalsa();
    const p = montar({ rodales: datos(), geo, enLinea: () => false });
    expect(p.textContent).toContain('El mapa no está disponible');
    expect(p.querySelector('.mapa').hidden).toBe(true);
    geo.ok(pos(42.0, -1.0)); // encima del rodal a, el b queda ~1,1 km al norte
    const items = [...p.querySelectorAll('.sin-mapa li')];
    expect(items.map((li) => li.dataset.id)).toEqual(['a', 'b']);
    expect(items[1].textContent).toMatch(/1,1 km al N/);
    expect(items[0].textContent).toMatch(/0 m/);
  });

  it('el orden cambia si me muevo junto al otro rodal', () => {
    const geo = geoFalsa();
    const p = montar({ rodales: datos(), geo, enLinea: () => false });
    geo.ok(pos(42.01, -1.0));
    expect([...p.querySelectorAll('.sin-mapa li')].map((li) => li.dataset.id)).toEqual(['b', 'a']);
  });

  it('sin red ni posición: coordenadas, sin distancia ni rumbo', () => {
    const p = montar({ rodales: datos(), geo: null, enLinea: () => false });
    const texto = p.querySelector('.sin-mapa').textContent;
    expect(texto).toContain('42.00000, -1.00000');
    expect(texto).not.toMatch(/ al N| km| m al/);
  });

  it('cambia a lista al perder la conexión y vuelve al mapa al recuperarla', () => {
    let online = true;
    const p = montar({ rodales: datos(), geo: null, enLinea: () => online });
    expect(p.querySelector('.mapa').hidden).toBe(false);
    online = false; window.dispatchEvent(new Event('offline'));
    expect(p.querySelector('.mapa').hidden).toBe(true);
    expect(p.querySelector('.sin-mapa').hidden).toBe(false);
    online = true; window.dispatchEvent(new Event('online'));
    expect(p.querySelector('.mapa').hidden).toBe(false);
  });

  it('si el mapa base no carga (tres errores de teselas), muestra la alternativa', () => {
    const p = montar({ rodales: datos(), geo: null, enLinea: () => true });
    const capa = Object.values(p.mapa()._layers).find((l) => l.options?.maxZoom === 19);
    for (let i = 0; i < 3; i++) capa.fire('tileerror');
    expect(p.querySelector('.sin-mapa').hidden).toBe(false);
    expect(p.querySelector('.mapa').hidden).toBe(true);
    expect(p.textContent).toContain('El mapa no está disponible');
  });

  it('sin rodales: estado vacío', () => {
    const p = montar({ rodales: [], geo: null, enLinea: () => false });
    expect(p.textContent).toContain('Aún no hay rodales');
  });
});

describe('ajuste de posición (5.4)', () => {
  async function arrastrar(p, lat, lng) {
    const marcador = Object.values(p.mapa()._layers).find((l) => l.rodal?.id === 'a');
    marcador.fire('popupopen');
    marcador.openPopup();
    p.querySelector('button.mover').click();
    expect(marcador.dragging.enabled()).toBe(true);
    marcador.setLatLng([lat, lng]);
    marcador.fire('dragend');
    await new Promise((res) => setTimeout(res, 10));
    return marcador;
  }

  it('confirmar guarda las nuevas coordenadas y conserva el resto', async () => {
    const onMover = vi.fn();
    const p = montar({ rodales: datos(), geo: null, enLinea: () => true, onMover, confirmar: () => true });
    await arrastrar(p, 42.5, -1.5);
    expect(onMover).toHaveBeenCalledOnce();
    const guardado = onMover.mock.calls[0][0];
    expect([guardado.lat, guardado.lng]).toEqual([42.5, -1.5]);
    expect(guardado.especies).toEqual(['Boletus edulis']);
    expect(guardado.notas).toBe('bajo el pino');
    expect(guardado.creadoEn).toBe('2026-11-08T10:00:00.000Z');
    expect(guardado.id).toBe('a');
  });

  it('cancelar devuelve el marcador a su sitio y no guarda', async () => {
    const onMover = vi.fn();
    const p = montar({ rodales: datos(), geo: null, enLinea: () => true, onMover, confirmar: () => false });
    const m = await arrastrar(p, 42.5, -1.5);
    expect(onMover).not.toHaveBeenCalled();
    expect(m.getLatLng().lat).toBe(42.0);
    expect(m.dragging.enabled()).toBe(false);
  });

  it('sin conexión no se ofrece mover el marcador', () => {
    const p = montar({ rodales: datos(), geo: null, enLinea: () => true });
    // Simula que la red cae antes de abrir el popup
    const capa = Object.values(p.mapa()._layers).find((l) => l.options?.maxZoom === 19);
    for (let i = 0; i < 3; i++) capa.fire('tileerror');
    const marcador = Object.values(p.mapa()._layers).find((l) => l.rodal?.id === 'a');
    marcador.openPopup();
    expect(document.querySelector('.popup-rodal')).not.toBeNull(); // el popup sí se muestra...
    expect(document.querySelector('button.mover')).toBeNull(); // ...pero sin la opción de mover
  });

  it('pulsar «Mover» varias veces sin arrastrar no duplica la confirmación', async () => {
    const onMover = vi.fn();
    const confirmar = vi.fn(() => true);
    const p = montar({ rodales: datos(), geo: null, enLinea: () => true, onMover, confirmar });
    const marcador = Object.values(p.mapa()._layers).find((l) => l.rodal?.id === 'a');
    for (let i = 0; i < 3; i++) {
      marcador.openPopup();
      p.querySelector('button.mover').click();
    }
    marcador.setLatLng([42.5, -1.5]);
    marcador.fire('dragend');
    await new Promise((res) => setTimeout(res, 10));
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(onMover).toHaveBeenCalledTimes(1);
  });
});
