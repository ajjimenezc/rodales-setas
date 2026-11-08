// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { abrirAlmacen } from '../db/almacen.js';
import { iniciarApp } from '../app.js';

let n = 0;

function geoFalsa() {
  const api = {
    watchPosition: vi.fn((ok, ko) => { api.ok = ok; api.ko = ko; return 1; }),
    clearWatch: vi.fn(),
  };
  return api;
}
const pos = (lat, lng, accuracy) => ({ coords: { latitude: lat, longitude: lng, accuracy } });
const enviar = (f) => f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
const poner = (raiz, nombre, valor) => { raiz.querySelector(`[name="${nombre}"]`).value = valor; };
const boton = (raiz, texto) => [...raiz.querySelectorAll('button')].find((b) => b.textContent === texto);
const esperar = (fn) => vi.waitFor(fn);

async function arrancar({ rodalesPrevios = [], confirmar } = {}) {
  const almacen = await abrirAlmacen(`rod-${n++}`);
  for (const r of rodalesPrevios) await almacen.guardarRodal(r);
  const raiz = document.createElement('div');
  document.body.replaceChildren(raiz);
  const geo = geoFalsa();
  let t = new Date('2026-11-08T10:00:00.000Z');
  await iniciarApp(raiz, almacen, { geo, confirmar, ahora: () => t });
  return { almacen, raiz, geo, fijarHora: (d) => { t = d; } };
}

const previo = (id, creadoEn, especies, notas = '') => ({
  id, lat: 42.1, lng: -1.2, precision: 8, creadoEn, actualizadoEn: creadoEn, especies, notas,
});

describe('listado (4.4)', () => {
  it('estado vacío con la acción de crear un rodal', async () => {
    const { raiz } = await arrancar();
    expect(raiz.querySelector('.lista.vacia')).not.toBeNull();
    expect(raiz.textContent).toContain('Aún no hay rodales');
    expect(boton(raiz, 'Nuevo rodal')).toBeTruthy();
  });

  it('muestra fecha, especies y coordenadas, del más reciente al más antiguo', async () => {
    const { raiz } = await arrancar({
      rodalesPrevios: [
        previo('a', '2026-01-01T10:00:00.000Z', ['Boletus edulis']),
        previo('c', '2026-03-01T10:00:00.000Z', ['Lactarius deliciosus']),
        previo('b', '2026-02-01T10:00:00.000Z', ['Amanita caesarea']),
      ],
    });
    const ids = [...raiz.querySelectorAll('button.rodal')].map((b) => b.dataset.id);
    expect(ids).toEqual(['c', 'b', 'a']);
    expect(raiz.textContent).toContain('42.10000, -1.20000');
    expect(raiz.textContent).toContain('Lactarius deliciosus');
  });
});

describe('crear rodal (4.2, 4.3)', () => {
  it('guarda con la ubicación del GPS, varias especies, notas y fecha automática', async () => {
    const { raiz, geo, almacen } = await arrancar();
    boton(raiz, 'Nuevo rodal').click();
    geo.ok(pos(42.5, -1.5, 9));
    expect(raiz.textContent).toContain('42.50000, -1.50000');
    expect(raiz.textContent).toContain('±9 m');

    poner(raiz, 'especie', 'Boletus edulis');
    boton(raiz, 'Añadir especie').click();
    poner(raiz, 'especie', 'Cantharellus cibarius');
    boton(raiz, 'Añadir especie').click();
    poner(raiz, 'notas', 'bajo los pinos');
    enviar(raiz.querySelector('form'));

    await esperar(() => expect(raiz.querySelector('.lista:not(.vacia)')).not.toBeNull());
    const [r] = await almacen.listarRodales();
    expect(r.especies).toEqual(['Boletus edulis', 'Cantharellus cibarius']);
    expect(r.notas).toBe('bajo los pinos');
    expect(r.lat).toBe(42.5);
    expect(r.precision).toBe(9);
    expect(r.creadoEn).toBe('2026-11-08T10:00:00.000Z');
    expect(geo.clearWatch).toHaveBeenCalled(); // el GPS se para al guardar
  });

  it('la especie escrita sin pulsar «Añadir» se incluye al guardar', async () => {
    const { raiz, geo, almacen } = await arrancar();
    boton(raiz, 'Nuevo rodal').click();
    geo.ok(pos(42.5, -1.5, 9));
    poner(raiz, 'especie', 'Amanita caesarea');
    enviar(raiz.querySelector('form'));
    await esperar(async () => expect((await almacen.listarRodales()).length).toBe(1));
  });

  it('sin especie no guarda e indica el motivo', async () => {
    const { raiz, geo, almacen } = await arrancar();
    boton(raiz, 'Nuevo rodal').click();
    geo.ok(pos(42.5, -1.5, 9));
    enviar(raiz.querySelector('form'));
    expect(raiz.textContent).toContain('al menos una especie');
    expect(await almacen.contarRodales()).toBe(0);
  });

  it('permiso denegado: explica el motivo y permite coordenadas manuales', async () => {
    const { raiz, geo, almacen } = await arrancar();
    boton(raiz, 'Nuevo rodal').click();
    geo.ko({ code: 1 });
    expect(raiz.textContent).toContain('No hay permiso de ubicación');
    expect(raiz.querySelector('details.manual').open).toBe(true);

    poner(raiz, 'lat', '41,5');
    poner(raiz, 'lng', '-2.25');
    raiz.querySelector('[name="usar-coordenadas"]').click();
    expect(raiz.textContent).toContain('41.50000, -2.25000');
    poner(raiz, 'especie', 'Boletus edulis');
    enviar(raiz.querySelector('form'));
    await esperar(async () => expect((await almacen.listarRodales()).length).toBe(1));
    const [r] = await almacen.listarRodales();
    expect([r.lat, r.lng, r.precision]).toEqual([41.5, -2.25, null]);
  });

  it('coordenadas manuales inválidas se rechazan', async () => {
    const { raiz, geo } = await arrancar();
    boton(raiz, 'Nuevo rodal').click();
    geo.ko({ code: 1 });
    poner(raiz, 'lat', '200');
    poner(raiz, 'lng', '0');
    raiz.querySelector('[name="usar-coordenadas"]').click();
    expect(raiz.textContent).toContain('latitud');
  });

  it('reintentar vuelve a pedir la ubicación', async () => {
    const { raiz, geo } = await arrancar();
    boton(raiz, 'Nuevo rodal').click();
    geo.ko({ code: 2 });
    boton(raiz, 'Reintentar ubicación').click();
    expect(geo.watchPosition).toHaveBeenCalledTimes(2);
    expect(geo.clearWatch).toHaveBeenCalled();
  });

  it('avisa con precisión peor de 50 m pero permite guardar', async () => {
    const { raiz, geo, almacen } = await arrancar();
    boton(raiz, 'Nuevo rodal').click();
    geo.ok(pos(42.5, -1.5, 120));
    expect(raiz.textContent).toContain('Precisión baja');
    poner(raiz, 'especie', 'Boletus edulis');
    enviar(raiz.querySelector('form'));
    await esperar(async () => expect((await almacen.listarRodales()).length).toBe(1));
  });

  it('autocompleta con especies de rodales anteriores y acepta la sugerida', async () => {
    const { raiz, geo, almacen } = await arrancar({
      rodalesPrevios: [previo('a', '2026-01-01T10:00:00.000Z', ['Boletus edulis'])],
    });
    boton(raiz, 'Nuevo rodal').click();
    geo.ok(pos(42.5, -1.5, 9));
    const campo = raiz.querySelector('[name="especie"]');
    campo.value = 'Bol';
    campo.dispatchEvent(new Event('input'));
    const sug = raiz.querySelector('button.sugerencia');
    expect(sug.textContent).toBe('Boletus edulis');
    sug.click();
    enviar(raiz.querySelector('form'));
    await esperar(async () => expect((await almacen.listarRodales()).length).toBe(2));
    const nuevo = (await almacen.listarRodales()).find((r) => r.id !== 'a');
    expect(nuevo.especies).toEqual(['Boletus edulis']);
  });

  it('cancelar vuelve al listado sin guardar y para el GPS', async () => {
    const { raiz, almacen, geo } = await arrancar();
    boton(raiz, 'Nuevo rodal').click();
    boton(raiz, 'Cancelar').click();
    await esperar(() => expect(raiz.querySelector('.lista')).not.toBeNull());
    expect(await almacen.contarRodales()).toBe(0);
    expect(geo.clearWatch).toHaveBeenCalled();
  });

  it('cambiar de pestaña con el formulario abierto para el GPS', async () => {
    const { raiz, geo } = await arrancar();
    boton(raiz, 'Nuevo rodal').click();
    expect(geo.clearWatch).not.toHaveBeenCalled();
    boton(raiz, 'Mapa').click();
    await esperar(() => expect(raiz.querySelector('.vista-mapa')).not.toBeNull());
    expect(geo.clearWatch).toHaveBeenCalled();
  });
});

describe('editar y borrar (4.5)', () => {
  const r0 = previo('a', '2026-01-01T10:00:00.000Z', ['Boletus edulis'], 'nota vieja');

  it('edita especies y notas conservando la fecha de creación', async () => {
    const { raiz, almacen, fijarHora } = await arrancar({ rodalesPrevios: [r0] });
    fijarHora(new Date('2026-11-09T12:00:00.000Z'));
    raiz.querySelector('button.rodal').click();
    expect(raiz.querySelector('[name="notas"]').value).toBe('nota vieja');
    raiz.querySelector('button.quitar').click();
    poner(raiz, 'especie', 'Lactarius deliciosus');
    poner(raiz, 'notas', 'nota nueva');
    enviar(raiz.querySelector('form'));
    await esperar(async () => expect((await almacen.leerRodal('a')).notas).toBe('nota nueva'));
    const r = await almacen.leerRodal('a');
    expect(r.especies).toEqual(['Lactarius deliciosus']);
    expect(r.creadoEn).toBe(r0.creadoEn);
    expect(r.actualizadoEn).toBe('2026-11-09T12:00:00.000Z');
  });

  it('borrado confirmado elimina el rodal', async () => {
    const { raiz, almacen } = await arrancar({ rodalesPrevios: [r0], confirmar: () => true });
    raiz.querySelector('button.rodal').click();
    await boton(raiz, 'Borrar rodal').click();
    await esperar(async () => expect(await almacen.contarRodales()).toBe(0));
    await esperar(() => expect(raiz.querySelector('.lista.vacia')).not.toBeNull());
  });

  it('borrado cancelado conserva el rodal', async () => {
    const { raiz, almacen } = await arrancar({ rodalesPrevios: [r0], confirmar: () => false });
    raiz.querySelector('button.rodal').click();
    boton(raiz, 'Borrar rodal').click();
    await new Promise((r) => setTimeout(r, 20));
    expect(await almacen.contarRodales()).toBe(1);
    expect(raiz.querySelector('[name="notas"]')).not.toBeNull(); // sigue en el detalle
  });

  it('no permite dejar el rodal sin especies', async () => {
    const { raiz, almacen } = await arrancar({ rodalesPrevios: [r0] });
    raiz.querySelector('button.rodal').click();
    raiz.querySelector('button.quitar').click();
    enviar(raiz.querySelector('form'));
    expect(raiz.textContent).toContain('al menos una especie');
    expect((await almacen.leerRodal('a')).especies).toEqual(['Boletus edulis']);
  });

  it('las notas con HTML se muestran como texto, no se interpretan', async () => {
    const { raiz } = await arrancar({ rodalesPrevios: [previo('x', '2026-01-01T10:00:00.000Z', ['<img src=x onerror=alert(1)>'], '<b>hola</b>')] });
    expect(raiz.querySelector('img')).toBeNull();
    expect(raiz.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});
