// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { abrirAlmacen } from '../db/almacen.js';
import { crearContrasena } from '../crypto/sesion.js';
import {
  generarCopia, entregarArchivo, exportarCopia, leerCopia, abrirCopia, fusionar, importarCopia,
  necesitaAvisoCopia, nombreArchivo, CopiaInvalida, ContrasenaCopiaIncorrecta,
} from './copia.js';
import { cifrar, derivarClave, generarSal } from '../crypto/cifrado.js';

const ITER = 1000;
let n = 0;
const rodal = (id, extra = {}) => ({
  id, lat: 42.1, lng: -1.2, precision: 8,
  creadoEn: '2026-01-01T10:00:00.000Z', actualizadoEn: '2026-01-01T10:00:00.000Z',
  especies: ['Boletus edulis'], notas: 'junto al arroyo secreto', ...extra,
});

async function nuevoAlmacen(contrasena = 'secreto-1234') {
  const almacen = await abrirAlmacen(`copia-${n++}`);
  const clave = await crearContrasena(almacen, contrasena, { iteraciones: ITER });
  return { almacen, clave };
}

describe('exportar (6.1)', () => {
  it('el archivo no deja ver los datos de los rodales', async () => {
    const { almacen, clave } = await nuevoAlmacen();
    await almacen.guardarRodal(clave, rodal('a'));
    const texto = await generarCopia(clave, await almacen.leerAjustes(), await almacen.listarRodales(clave));
    for (const t of ['Boletus', 'arroyo', '42.1', '-1.2']) expect(texto).not.toContain(t);
    const c = JSON.parse(texto);
    expect(Object.keys(c).sort()).toEqual(['datos', 'formato', 'iteraciones', 'iv', 'sal', 'version']);
    expect(texto).not.toContain('secreto-1234');
  });

  it('usa la hoja de compartir cuando canShare lo permite', async () => {
    const nav = { canShare: vi.fn(() => true), share: vi.fn(async () => {}) };
    const r = await entregarArchivo('{}', 'x.json', { nav });
    expect(r).toBe('compartido');
    expect(nav.canShare.mock.calls[0][0].files[0].name).toBe('x.json');
    expect(nav.share.mock.calls[0][0].files).toHaveLength(1);
  });

  it('si no se puede compartir archivos, descarga', async () => {
    const url = { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() };
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { this.dataset.clic = '1'; });
    const nav = { canShare: () => false };
    const r = await entregarArchivo('{}', 'x.json', { nav, url, doc: document });
    expect(r).toBe('descargado');
    expect(url.createObjectURL).toHaveBeenCalled();
    expect(clic).toHaveBeenCalled();
    clic.mockRestore();
  });

  it('sin navigator.canShare (navegador antiguo) también descarga', async () => {
    const url = { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() };
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(await entregarArchivo('{}', 'x.json', { nav: {}, url, doc: document })).toBe('descargado');
    clic.mockRestore();
  });

  it('cancelar la hoja de compartir no cuenta como exportación', async () => {
    const { almacen, clave } = await nuevoAlmacen();
    await almacen.guardarRodal(clave, rodal('a'));
    const nav = { canShare: () => true, share: vi.fn(async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); }) };
    expect(await exportarCopia(almacen, clave, { nav })).toBe('cancelado');
    expect((await almacen.leerAjustes()).ultimaExportacion).toBeUndefined();
  });

  it('exportar con éxito guarda la fecha de última exportación', async () => {
    const { almacen, clave } = await nuevoAlmacen();
    const nav = { canShare: () => true, share: vi.fn(async () => {}) };
    const ahora = () => new Date('2026-11-08T10:00:00.000Z');
    expect(await exportarCopia(almacen, clave, { nav, ahora })).toBe('compartido');
    expect((await almacen.leerAjustes()).ultimaExportacion).toBe('2026-11-08T10:00:00.000Z');
  });

  it('nombre de archivo con fecha', () => {
    expect(nombreArchivo(() => new Date('2026-11-08T10:00:00Z'))).toBe('rodales-2026-11-08.json');
  });
});

describe('importar (6.2)', () => {
  async function copiaDe(contrasena, rodales) {
    const { almacen, clave } = await nuevoAlmacen(contrasena);
    for (const r of rodales) await almacen.guardarRodal(clave, r);
    return generarCopia(clave, await almacen.leerAjustes(), rodales);
  }

  it('importación correcta incorpora los rodales (en una base vacía)', async () => {
    const texto = await copiaDe('contraseña-vieja', [rodal('a'), rodal('b', { especies: ['Lactarius deliciosus'] })]);
    const { almacen, clave } = await nuevoAlmacen('contraseña-nueva');
    const res = await importarCopia(almacen, clave, texto, 'contraseña-vieja');
    expect(res).toEqual({ anadidos: 2, actualizados: 0, total: 2 });
    const lista = await almacen.listarRodales(clave);
    expect(lista.map((r) => r.id).sort()).toEqual(['a', 'b']);
    expect(lista.find((r) => r.id === 'b').especies).toEqual(['Lactarius deliciosus']);
  });

  it('contraseña incorrecta: rechaza y no modifica nada', async () => {
    const texto = await copiaDe('contraseña-vieja', [rodal('a')]);
    const { almacen, clave } = await nuevoAlmacen('contraseña-nueva');
    await almacen.guardarRodal(clave, rodal('z'));
    await expect(importarCopia(almacen, clave, texto, 'equivocada')).rejects.toBeInstanceOf(ContrasenaCopiaIncorrecta);
    expect((await almacen.listarRodales(clave)).map((r) => r.id)).toEqual(['z']);
  });

  it.each([
    ['no es JSON', 'esto no es json'],
    ['otro formato', JSON.stringify({ formato: 'otra-cosa', version: 1 })],
    ['versión futura', JSON.stringify({ formato: 'rodales-copia', version: 99, sal: 'a', iv: 'a', datos: 'a', iteraciones: 1000 })],
    ['incompleto', JSON.stringify({ formato: 'rodales-copia', version: 1, sal: 'a' })],
    ['iteraciones absurdas', JSON.stringify({ formato: 'rodales-copia', version: 1, sal: 'a', iv: 'a', datos: 'a', iteraciones: 1e12 })],
    ['iteraciones no enteras', JSON.stringify({ formato: 'rodales-copia', version: 1, sal: 'a', iv: 'a', datos: 'a', iteraciones: 'mil' })],
    ['null', 'null'],
  ])('archivo no válido (%s): informa y no modifica', async (_nombre, texto) => {
    const { almacen, clave } = await nuevoAlmacen();
    await almacen.guardarRodal(clave, rodal('z'));
    await expect(importarCopia(almacen, clave, texto, 'secreto-1234')).rejects.toBeInstanceOf(CopiaInvalida);
    expect((await almacen.listarRodales(clave)).map((r) => r.id)).toEqual(['z']);
  });

  it('un archivo con datos cifrados corruptos se rechaza como contraseña/archivo incorrecto', async () => {
    const texto = JSON.parse(await copiaDe('secreto-1234', [rodal('a')]));
    texto.datos = btoa('basura-que-no-es-un-cifrado-valido-1234');
    const { almacen, clave } = await nuevoAlmacen();
    await expect(importarCopia(almacen, clave, JSON.stringify(texto), 'secreto-1234')).rejects.toBeInstanceOf(ContrasenaCopiaIncorrecta);
  });

  it('un rodal inválido dentro de la copia rechaza TODA la importación', async () => {
    const sal = generarSal();
    const k = await derivarClave('secreto-1234', sal, ITER);
    const malo = rodal('malo', { lat: 999 });
    const { iv, datos } = await cifrar(k, { exportadoEn: '2026-01-01T00:00:00Z', rodales: [rodal('bueno'), malo] });
    const texto = JSON.stringify({ formato: 'rodales-copia', version: 1, sal, iteraciones: ITER, iv, datos });
    const { almacen, clave } = await nuevoAlmacen();
    await expect(importarCopia(almacen, clave, texto, 'secreto-1234')).rejects.toBeInstanceOf(CopiaInvalida);
    expect(await almacen.contarRodales()).toBe(0);
  });

  it('importar dos veces el mismo archivo no duplica', async () => {
    const texto = await copiaDe('secreto-1234', [rodal('a'), rodal('b')]);
    const { almacen, clave } = await nuevoAlmacen();
    await importarCopia(almacen, clave, texto, 'secreto-1234');
    const segunda = await importarCopia(almacen, clave, texto, 'secreto-1234');
    expect(segunda).toEqual({ anadidos: 0, actualizados: 0, total: 2 });
    expect(await almacen.contarRodales()).toBe(2);
  });

  it('con el mismo id gana el más reciente; con empate se conserva el existente', async () => {
    const viejo = rodal('a', { notas: 'vieja', actualizadoEn: '2026-01-01T10:00:00.000Z' });
    const nuevo = rodal('a', { notas: 'nueva', actualizadoEn: '2026-06-01T10:00:00.000Z' });
    const igual = rodal('a', { notas: 'empate', actualizadoEn: '2026-01-01T10:00:00.000Z' });
    expect(fusionar([viejo], [nuevo]).aEscribir[0].notas).toBe('nueva');
    expect(fusionar([nuevo], [viejo]).aEscribir).toEqual([]);
    expect(fusionar([viejo], [igual]).aEscribir).toEqual([]);
  });

  it('la importación conserva datos de rodales existentes que no están en la copia', async () => {
    const texto = await copiaDe('secreto-1234', [rodal('a')]);
    const { almacen, clave } = await nuevoAlmacen();
    await almacen.guardarRodal(clave, rodal('local'));
    await importarCopia(almacen, clave, texto, 'secreto-1234');
    expect((await almacen.listarRodales(clave)).map((r) => r.id).sort()).toEqual(['a', 'local']);
  });

  it('abrirCopia valida sin descifrar (leerCopia)', () => {
    expect(() => leerCopia('{}')).toThrow(CopiaInvalida);
  });

  it('ida y vuelta conserva todos los campos', async () => {
    const original = rodal('a', { precision: null, especies: ['Amanita caesarea', 'Boletus edulis'], notas: 'ñ 🍄' });
    const texto = await copiaDe('secreto-1234', [original]);
    const { rodales } = await abrirCopia(texto, 'secreto-1234');
    expect(rodales).toEqual([original]);
  });
});

describe('recordatorio de copia (6.3)', () => {
  const ahora = (d) => () => new Date(d);
  const r = (creado, actualizado = creado) => ({ creadoEn: creado, actualizadoEn: actualizado });

  it('sin rodales no avisa', () => {
    expect(necesitaAvisoCopia(null, [], ahora('2027-01-01'))).toBe(false);
  });

  it('avisa con rodales nuevos y más de 30 días desde la última exportación', () => {
    const ult = '2026-10-01T00:00:00.000Z';
    expect(necesitaAvisoCopia(ult, [r('2026-10-05T00:00:00.000Z')], ahora('2026-11-08T00:00:00.000Z'))).toBe(true);
  });

  it('no avisa si pasaron menos de 30 días', () => {
    const ult = '2026-10-20T00:00:00.000Z';
    expect(necesitaAvisoCopia(ult, [r('2026-10-25T00:00:00.000Z')], ahora('2026-11-08T00:00:00.000Z'))).toBe(false);
  });

  it('no avisa si no hay rodales posteriores a la exportación aunque hayan pasado 30 días', () => {
    const ult = '2026-09-01T00:00:00.000Z';
    expect(necesitaAvisoCopia(ult, [r('2026-08-01T00:00:00.000Z')], ahora('2026-11-08T00:00:00.000Z'))).toBe(false);
  });

  it('exactamente 30 días no avisa; 30 días y un milisegundo sí', () => {
    const ult = '2026-10-01T00:00:00.000Z';
    const limite = Date.parse(ult) + 30 * 24 * 3600 * 1000;
    const rodales = [r('2026-10-02T00:00:00.000Z')];
    expect(necesitaAvisoCopia(ult, rodales, () => new Date(limite))).toBe(false);
    expect(necesitaAvisoCopia(ult, rodales, () => new Date(limite + 1))).toBe(true);
  });

  it('un rodal modificado después de exportar también cuenta', () => {
    const ult = '2026-09-01T00:00:00.000Z';
    expect(necesitaAvisoCopia(ult, [r('2026-08-01T00:00:00.000Z', '2026-09-15T00:00:00.000Z')], ahora('2026-11-08T00:00:00.000Z'))).toBe(true);
  });

  it('sin exportación previa avisa cuando el rodal más antiguo supera los 30 días', () => {
    expect(necesitaAvisoCopia(null, [r('2026-10-20T00:00:00.000Z')], ahora('2026-11-08T00:00:00.000Z'))).toBe(false);
    expect(necesitaAvisoCopia(null, [r('2026-09-20T00:00:00.000Z')], ahora('2026-11-08T00:00:00.000Z'))).toBe(true);
  });
});
