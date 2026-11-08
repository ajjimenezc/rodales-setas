// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import { abrirAlmacen } from '../db/almacen.js';
import { iniciarApp } from '../app.js';
import { crearContrasena } from '../crypto/sesion.js';

const ITER = 1000;
const enviar = (f) => f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
const boton = (raiz, texto) => [...raiz.querySelectorAll('button')].find((b) => b.textContent === texto);

async function arrancar() {
  const almacen = await abrirAlmacen(`mapa-app-${Math.random()}`);
  const clave = await crearContrasena(almacen, 'secreto-1234', { iteraciones: ITER });
  await almacen.guardarRodal(clave, {
    id: 'a', lat: 42, lng: -1, precision: 8, creadoEn: '2026-01-01T10:00:00.000Z',
    actualizadoEn: '2026-01-01T10:00:00.000Z', especies: ['Boletus edulis'], notas: 'n',
  });
  const raiz = document.createElement('div');
  document.body.replaceChildren(raiz);
  const geo = { watchPosition: vi.fn(() => 1), clearWatch: vi.fn() };
  await iniciarApp(raiz, almacen, {
    iteraciones: ITER, geo, enLinea: () => true, confirmar: () => true,
    ahora: () => new Date('2026-11-09T12:00:00.000Z'),
  });
  raiz.querySelector('[name="contrasena"]').value = 'secreto-1234';
  enviar(raiz.querySelector('form'));
  await vi.waitFor(() => expect(raiz.querySelector('.lista')).not.toBeNull());
  return { almacen, clave, raiz, geo };
}

describe('mapa integrado en la app', () => {
  it('la pestaña Mapa muestra los rodales y volver a Lista para el GPS', async () => {
    const { raiz, geo } = await arrancar();
    boton(raiz, 'Mapa').click();
    await vi.waitFor(() => expect(raiz.querySelectorAll('.leaflet-marker-icon')).toHaveLength(1));
    expect(geo.watchPosition).toHaveBeenCalled();
    boton(raiz, 'Lista').click();
    await vi.waitFor(() => expect(raiz.querySelector('.lista')).not.toBeNull());
    expect(geo.clearWatch).toHaveBeenCalled();
  });

  it('mover un marcador se guarda cifrado, conserva datos y actualiza actualizadoEn', async () => {
    const { raiz, almacen, clave } = await arrancar();
    boton(raiz, 'Mapa').click();
    await vi.waitFor(() => expect(raiz.querySelectorAll('.leaflet-marker-icon')).toHaveLength(1));
    // Accede al marcador a través del mapa de la pantalla
    const vista = raiz.querySelector('.vista-mapa');
    const marcador = Object.values(vista.mapa()._layers).find((l) => l.rodal?.id === 'a');
    marcador.openPopup();
    raiz.querySelector('button.mover').click();
    marcador.setLatLng([42.5, -1.5]);
    marcador.fire('dragend');
    await vi.waitFor(async () => expect((await almacen.leerRodal(clave, 'a')).lat).toBe(42.5));
    const r = await almacen.leerRodal(clave, 'a');
    expect([r.lng, r.especies, r.notas, r.creadoEn]).toEqual([-1.5, ['Boletus edulis'], 'n', '2026-01-01T10:00:00.000Z']);
    expect(r.actualizadoEn).toBe('2026-11-09T12:00:00.000Z');
  });
});
