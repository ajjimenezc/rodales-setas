// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import { abrirAlmacen } from '../db/almacen.js';
import { iniciarApp } from '../app.js';

const boton = (raiz, texto) => [...raiz.querySelectorAll('button')].find((b) => b.textContent === texto);
const rodal = (id, creadoEn = '2026-01-01T10:00:00.000Z', extra = {}) => ({
  id, lat: 42, lng: -1, precision: 8, creadoEn, actualizadoEn: creadoEn, especies: ['Boletus edulis'], notas: 'n', ...extra,
});

async function arrancar({ rodales = [], ahora, nav } = {}) {
  const almacen = await abrirAlmacen(`copia-app-${Math.random()}`);
  for (const r of rodales) await almacen.guardarRodal(r);
  const raiz = document.createElement('div');
  document.body.replaceChildren(raiz);
  await iniciarApp(raiz, almacen, { geo: null, nav, ahora });
  return { almacen, raiz };
}

async function abrirCopia(raiz) {
  boton(raiz, 'Copia').click();
  await vi.waitFor(() => expect(raiz.querySelector('.copia')).not.toBeNull());
}

// Un File en jsdom puede no tener .text(); se construye con una implementación mínima.
const archivoDe = (texto, nombre = 'copia.json') => ({ name: nombre, text: async () => texto });
function elegirArchivo(raiz, archivo) {
  Object.defineProperty(raiz.querySelector('[name="archivo"]'), 'files', { value: [archivo], configurable: true });
}

describe('pantalla de copia en la app', () => {
  it('avisa de que el archivo no está cifrado', async () => {
    const { raiz } = await arrancar();
    await abrirCopia(raiz);
    const aviso = raiz.querySelector('.aviso-sin-cifrar');
    expect(aviso).not.toBeNull();
    expect(aviso.textContent).toContain('no está cifrado');
    expect(aviso.textContent).toContain('No lo publiques');
  });

  it('exporta por la hoja de compartir y muestra la fecha de la última copia', async () => {
    let compartido = null;
    const nav = { canShare: () => true, share: vi.fn(async (d) => { compartido = d.files[0]; }) };
    const { raiz } = await arrancar({ rodales: [rodal('a')], nav, ahora: () => new Date('2026-11-08T10:00:00.000Z') });
    await abrirCopia(raiz);
    expect(raiz.textContent).toContain('Aún no has exportado');
    raiz.querySelector('[name="exportar"]').click();
    await vi.waitFor(() => expect(raiz.textContent).toContain('hoja de compartir'));
    expect(raiz.querySelector('.ultima').textContent).toContain('Última copia:');
    expect(compartido.name).toBe('rodales-2026-11-08.json');
    expect(await compartido.text()).toContain('Boletus edulis'); // legible
  });

  it('importa una copia exportada por otro dispositivo, sin pedir contraseña', async () => {
    let archivo = null;
    const navA = { canShare: () => true, share: async (d) => { archivo = d.files[0]; } };
    const a = await arrancar({ rodales: [rodal('a'), rodal('b')], nav: navA });
    await abrirCopia(a.raiz);
    a.raiz.querySelector('[name="exportar"]').click();
    await vi.waitFor(() => expect(archivo).not.toBeNull());
    const texto = await archivo.text();

    const b = await arrancar();
    await abrirCopia(b.raiz);
    expect(b.raiz.querySelector('input[type="password"]')).toBeNull();
    elegirArchivo(b.raiz, archivoDe(texto));
    b.raiz.querySelector('[name="importar"]').click();
    await vi.waitFor(() => expect(b.raiz.textContent).toContain('2 nuevos'));
    expect(await b.almacen.contarRodales()).toBe(2);
  });

  it('un archivo no válido muestra el error y no cambia nada', async () => {
    const { raiz, almacen } = await arrancar({ rodales: [rodal('z')] });
    await abrirCopia(raiz);
    elegirArchivo(raiz, archivoDe('esto no es una copia'));
    raiz.querySelector('[name="importar"]').click();
    await vi.waitFor(() => expect(raiz.querySelector('.error').textContent).toContain('no es una copia válida'));
    expect(await almacen.contarRodales()).toBe(1);
  });

  it('una copia cifrada de la versión anterior se rechaza con un mensaje claro', async () => {
    const { raiz, almacen } = await arrancar({ rodales: [rodal('z')] });
    await abrirCopia(raiz);
    elegirArchivo(raiz, archivoDe(JSON.stringify({ formato: 'rodales-copia', version: 1, sal: 's', iteraciones: 1000, iv: 'i', datos: 'd' })));
    raiz.querySelector('[name="importar"]').click();
    await vi.waitFor(() => expect(raiz.querySelector('.error').textContent).toContain('no es compatible'));
    expect(await almacen.contarRodales()).toBe(1);
  });

  it('importar sin elegir archivo lo indica', async () => {
    const { raiz } = await arrancar();
    await abrirCopia(raiz);
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

  it('tras importar, el listado muestra los rodales importados', async () => {
    const { raiz } = await arrancar();
    await abrirCopia(raiz);
    const copia = JSON.stringify({ formato: 'rodales-copia', version: 2, exportadoEn: '2026-11-08T10:00:00.000Z', rodales: [rodal('i1', '2026-02-01T10:00:00.000Z', { especies: ['Amanita caesarea'] })] });
    elegirArchivo(raiz, archivoDe(copia));
    raiz.querySelector('[name="importar"]').click();
    await vi.waitFor(() => expect(raiz.textContent).toContain('1 nuevos'));
    raiz.querySelector('[name="volver"]').click();
    await vi.waitFor(() => expect(raiz.querySelector('button.rodal')).not.toBeNull());
    expect(raiz.textContent).toContain('Amanita caesarea');
  });
});
