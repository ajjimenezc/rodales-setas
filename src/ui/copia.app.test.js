// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import { abrirAlmacen } from '../db/almacen.js';
import { iniciarApp } from '../app.js';
import { crearContrasena } from '../crypto/sesion.js';

const ITER = 1000;
const enviar = (f) => f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
const boton = (raiz, texto) => [...raiz.querySelectorAll('button')].find((b) => b.textContent === texto);
const rodal = (id, creadoEn = '2026-01-01T10:00:00.000Z') => ({
  id, lat: 42, lng: -1, precision: 8, creadoEn, actualizadoEn: creadoEn, especies: ['Boletus edulis'], notas: 'n',
});

async function arrancar({ contrasena = 'secreto-1234', rodales = [], ahora, nav } = {}) {
  const almacen = await abrirAlmacen(`copia-app-${Math.random()}`);
  const clave = await crearContrasena(almacen, contrasena, { iteraciones: ITER });
  for (const r of rodales) await almacen.guardarRodal(clave, r);
  const raiz = document.createElement('div');
  document.body.replaceChildren(raiz);
  const app = await iniciarApp(raiz, almacen, { iteraciones: ITER, geo: null, nav, ahora });
  raiz.querySelector('[name="contrasena"]').value = contrasena;
  enviar(raiz.querySelector('form'));
  await vi.waitFor(() => expect(raiz.querySelector('.lista')).not.toBeNull());
  return { almacen, clave, raiz, app };
}

describe('pantalla de copia en la app', () => {
  it('exporta por la hoja de compartir y muestra la fecha de la última copia', async () => {
    let compartido = null;
    const nav = { canShare: () => true, share: vi.fn(async (d) => { compartido = d.files[0]; }) };
    const { raiz } = await arrancar({ rodales: [rodal('a')], nav, ahora: () => new Date('2026-11-08T10:00:00.000Z') });
    boton(raiz, 'Copia').click();
    await vi.waitFor(() => expect(raiz.querySelector('.copia')).not.toBeNull());
    expect(raiz.textContent).toContain('Aún no has exportado');
    raiz.querySelector('[name="exportar"]').click();
    await vi.waitFor(() => expect(raiz.textContent).toContain('hoja de compartir'));
    expect(raiz.querySelector('.ultima').textContent).toContain('Última copia:');
    expect(compartido.name).toBe('rodales-2026-11-08.json');
    expect(await compartido.text()).not.toContain('Boletus');
  });

  it('importa una copia de otro dispositivo pidiendo su contraseña', async () => {
    // Dispositivo A exporta
    let archivo = null;
    const navA = { canShare: () => true, share: async (d) => { archivo = d.files[0]; } };
    const a = await arrancar({ contrasena: 'contraseña-A-123', rodales: [rodal('a'), rodal('b')], nav: navA });
    boton(a.raiz, 'Copia').click();
    await vi.waitFor(() => expect(a.raiz.querySelector('.copia')).not.toBeNull());
    a.raiz.querySelector('[name="exportar"]').click();
    await vi.waitFor(() => expect(archivo).not.toBeNull());

    // Dispositivo B (instalación limpia) importa
    const b = await arrancar({ contrasena: 'contraseña-B-456' });
    boton(b.raiz, 'Copia').click();
    await vi.waitFor(() => expect(b.raiz.querySelector('.copia')).not.toBeNull());
    const input = b.raiz.querySelector('[name="archivo"]');
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true });

    // Contraseña equivocada: error y sin cambios
    b.raiz.querySelector('[name="contrasena-copia"]').value = 'contraseña-B-456';
    b.raiz.querySelector('[name="importar"]').click();
    await vi.waitFor(() => expect(b.raiz.textContent).toContain('no corresponde a esta copia'));
    expect(await b.almacen.contarRodales()).toBe(0);

    // Contraseña correcta
    b.raiz.querySelector('[name="contrasena-copia"]').value = 'contraseña-A-123';
    b.raiz.querySelector('[name="importar"]').click();
    await vi.waitFor(() => expect(b.raiz.textContent).toContain('2 nuevos'));
    expect(await b.almacen.contarRodales()).toBe(2);
  });

  it('importar sin elegir archivo lo indica', async () => {
    const { raiz } = await arrancar();
    boton(raiz, 'Copia').click();
    await vi.waitFor(() => expect(raiz.querySelector('.copia')).not.toBeNull());
    raiz.querySelector('[name="importar"]').click();
    await vi.waitFor(() => expect(raiz.textContent).toContain('Elige primero un archivo'));
  });

  it('muestra el aviso de copia pasados 30 días con rodales sin exportar, y lleva a la pantalla de copia', async () => {
    const { raiz } = await arrancar({
      rodales: [rodal('a', '2026-08-01T10:00:00.000Z')],
      ahora: () => new Date('2026-11-08T10:00:00.000Z'),
    });
    expect(raiz.querySelector('.aviso-copia')).not.toBeNull();
    raiz.querySelector('[name="ir-copia"]').click();
    await vi.waitFor(() => expect(raiz.querySelector('.copia')).not.toBeNull());
  });

  it('no muestra el aviso con rodales recientes', async () => {
    const { raiz } = await arrancar({
      rodales: [rodal('a', '2026-11-01T10:00:00.000Z')],
      ahora: () => new Date('2026-11-08T10:00:00.000Z'),
    });
    expect(raiz.querySelector('.aviso-copia')).toBeNull();
  });

  it('tras exportar desaparece el aviso al volver al listado', async () => {
    const nav = { canShare: () => true, share: async () => {} };
    const { raiz } = await arrancar({
      rodales: [rodal('a', '2026-08-01T10:00:00.000Z')], nav,
      ahora: () => new Date('2026-11-08T10:00:00.000Z'),
    });
    boton(raiz, 'Exportar ahora').click();
    await vi.waitFor(() => expect(raiz.querySelector('.copia')).not.toBeNull());
    raiz.querySelector('[name="exportar"]').click();
    await vi.waitFor(() => expect(raiz.textContent).toContain('hoja de compartir'));
    raiz.querySelector('[name="volver"]').click();
    await vi.waitFor(() => expect(raiz.querySelector('.lista')).not.toBeNull());
    expect(raiz.querySelector('.aviso-copia')).toBeNull();
  });
});
