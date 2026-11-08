import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { openDB } from 'idb';
import { abrirAlmacen, VERSION_ESQUEMA } from './almacen.js';

let n = 0;
let almacen;
beforeEach(async () => {
  almacen = await abrirAlmacen(`test-${n++}`);
});

const rodal = (id, extra = {}) => ({
  id, lat: 42.1, lng: -1.2, precision: 8,
  creadoEn: '2026-11-08T10:00:00.000Z', actualizadoEn: '2026-11-08T10:00:00.000Z',
  especies: ['Boletus edulis'], notas: 'bajo el pino', ...extra,
});

describe('almacenamiento en claro (2.2)', () => {
  it('guarda, lee, lista y borra rodales', async () => {
    await almacen.guardarRodal(rodal('a'));
    await almacen.guardarRodal(rodal('b', { especies: ['Lactarius deliciosus'] }));
    expect((await almacen.listarRodales()).map((r) => r.id).sort()).toEqual(['a', 'b']);
    expect((await almacen.leerRodal('b')).especies).toEqual(['Lactarius deliciosus']);
    expect(await almacen.leerRodal('no-existe')).toBeNull();
    await almacen.borrarRodal('a');
    expect(await almacen.contarRodales()).toBe(1);
  });

  it('guardar con el mismo id sustituye el rodal', async () => {
    await almacen.guardarRodal(rodal('a', { notas: 'vieja' }));
    await almacen.guardarRodal(rodal('a', { notas: 'nueva' }));
    expect(await almacen.contarRodales()).toBe(1);
    expect((await almacen.leerRodal('a')).notas).toBe('nueva');
  });

  it('los rodales se guardan tal cual, sin cifrar', async () => {
    await almacen.guardarRodal(rodal('a', { notas: 'junto al arroyo' }));
    const crudo = await almacen.db.get('rodales', 'a');
    expect(crudo.notas).toBe('junto al arroyo');
    expect(crudo.especies).toEqual(['Boletus edulis']);
    expect(crudo.iv).toBeUndefined();
  });

  it('guardarVarios guarda todos en una transacción', async () => {
    await almacen.guardarVarios([rodal('a'), rodal('b'), rodal('c')]);
    expect(await almacen.contarRodales()).toBe(3);
  });

  it('guardarVarios es atómico: si uno falla no se guarda ninguno', async () => {
    await almacen.guardarRodal(rodal('previo'));
    // Un registro sin `id` viola la clave del almacén y aborta la transacción entera
    await expect(almacen.guardarVarios([rodal('a'), { sinId: true }, rodal('c')])).rejects.toThrow();
    expect((await almacen.listarRodales()).map((r) => r.id)).toEqual(['previo']);
  });

  it('los ajustes se fusionan sin pisar otros campos', async () => {
    expect(await almacen.leerAjustes()).toBeNull();
    await almacen.actualizarAjustes({ ultimaExportacion: '2026-11-08T10:00:00.000Z' });
    await almacen.actualizarAjustes({ persistenciaConcedida: true });
    expect(await almacen.leerAjustes()).toEqual({
      ultimaExportacion: '2026-11-08T10:00:00.000Z',
      persistenciaConcedida: true,
    });
  });

  it('los datos persisten al reabrir la base', async () => {
    const nombre = `reabrir-${n++}`;
    const a1 = await abrirAlmacen(nombre);
    await a1.guardarRodal(rodal('a'));
    a1.cerrar();
    const a2 = await abrirAlmacen(nombre);
    expect((await a2.leerRodal('a')).especies).toEqual(['Boletus edulis']);
  });
});

describe('actualización desde la versión 1, con rodales cifrados de pruebas (2.2)', () => {
  async function crearBaseV1(nombre) {
    const v1 = await openDB(nombre, 1, {
      upgrade(db) {
        db.createObjectStore('ajustes');
        db.createObjectStore('rodales', { keyPath: 'id' });
      },
    });
    await v1.put('ajustes', { sal: 's', iteraciones: 600000, verificador: { iv: 'i', datos: 'd' } }, 'principal');
    await v1.put('rodales', { id: 'viejo-1', iv: 'aaa', datos: 'cifrado' });
    await v1.put('rodales', { id: 'viejo-2', iv: 'bbb', datos: 'cifrado' });
    v1.close();
  }

  it('deja la base vacía y utilizable, sin ajustes de contraseña', async () => {
    const nombre = `v1-${n++}`;
    await crearBaseV1(nombre);

    const a = await abrirAlmacen(nombre);
    expect(a.db.version).toBe(VERSION_ESQUEMA);
    expect(await a.contarRodales()).toBe(0);
    expect(await a.leerAjustes()).toBeNull();

    await a.guardarRodal(rodal('nuevo'));
    expect((await a.listarRodales()).map((r) => r.id)).toEqual(['nuevo']);
  });

  it('una base ya en v2 no se vacía al reabrirla', async () => {
    const nombre = `v2-${n++}`;
    const a1 = await abrirAlmacen(nombre);
    await a1.guardarRodal(rodal('a'));
    a1.cerrar();
    const a2 = await abrirAlmacen(nombre);
    expect(await a2.contarRodales()).toBe(1);
  });
});
