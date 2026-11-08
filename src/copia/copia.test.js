// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import { abrirAlmacen } from '../db/almacen.js';
import {
  generarCopia, entregarArchivo, exportarCopia, leerCopia, fusionar, importarCopia,
  necesitaAvisoCopia, nombreArchivo, CopiaInvalida,
} from './copia.js';

let n = 0;
const rodal = (id, extra = {}) => ({
  id, lat: 42.1, lng: -1.2, precision: 8,
  creadoEn: '2026-01-01T10:00:00.000Z', actualizadoEn: '2026-01-01T10:00:00.000Z',
  especies: ['Boletus edulis'], notas: 'junto al arroyo', ...extra,
});
const nuevoAlmacen = () => abrirAlmacen(`copia-${n++}`);
const copiaDe = (rodales, ahora) => generarCopia(rodales, ahora);

describe('exportar (6.1)', () => {
  it('el archivo es un JSON legible que contiene los rodales en claro', () => {
    const texto = copiaDe([rodal('a'), rodal('b', { especies: ['Lactarius deliciosus'] })], () => new Date('2026-11-08T10:00:00.000Z'));
    expect(texto).toContain('Boletus edulis');
    expect(texto).toContain('junto al arroyo');
    expect(texto).toContain('42.1');
    const c = JSON.parse(texto);
    expect(c.formato).toBe('rodales-copia');
    expect(c.version).toBe(2);
    expect(c.exportadoEn).toBe('2026-11-08T10:00:00.000Z');
    expect(c.rodales).toHaveLength(2);
    expect(c.iv).toBeUndefined();
    expect(c.sal).toBeUndefined();
  });

  it('usa la hoja de compartir cuando canShare lo permite', async () => {
    const nav = { canShare: vi.fn(() => true), share: vi.fn(async () => {}) };
    expect(await entregarArchivo('{}', 'x.json', { nav })).toBe('compartido');
    expect(nav.canShare.mock.calls[0][0].files[0].name).toBe('x.json');
    expect(nav.share.mock.calls[0][0].files).toHaveLength(1);
  });

  it('si no se puede compartir archivos, descarga', async () => {
    const url = { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() };
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(await entregarArchivo('{}', 'x.json', { nav: { canShare: () => false }, url, doc: document })).toBe('descargado');
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

  it('si compartir falla por otro motivo, cae a la descarga', async () => {
    const url = { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() };
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const nav = { canShare: () => true, share: async () => { throw Object.assign(new Error('x'), { name: 'NotAllowedError' }); } };
    expect(await entregarArchivo('{}', 'x.json', { nav, url, doc: document })).toBe('descargado');
    clic.mockRestore();
  });

  it('cancelar la hoja de compartir no cuenta como exportación', async () => {
    const almacen = await nuevoAlmacen();
    await almacen.guardarRodal(rodal('a'));
    const nav = { canShare: () => true, share: async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); } };
    expect(await exportarCopia(almacen, { nav })).toBe('cancelado');
    expect((await almacen.leerAjustes())?.ultimaExportacion).toBeUndefined();
  });

  it('exportar con éxito guarda la fecha de última exportación', async () => {
    const almacen = await nuevoAlmacen();
    await almacen.guardarRodal(rodal('a'));
    let compartido = null;
    const nav = { canShare: () => true, share: async (d) => { compartido = d.files[0]; } };
    const ahora = () => new Date('2026-11-08T10:00:00.000Z');
    expect(await exportarCopia(almacen, { nav, ahora })).toBe('compartido');
    expect((await almacen.leerAjustes()).ultimaExportacion).toBe('2026-11-08T10:00:00.000Z');
    expect(compartido.name).toBe('rodales-2026-11-08.json');
    expect(JSON.parse(await compartido.text()).rodales[0].id).toBe('a');
  });

  it('nombre de archivo con fecha', () => {
    expect(nombreArchivo(() => new Date('2026-11-08T10:00:00Z'))).toBe('rodales-2026-11-08.json');
  });
});

describe('importar (6.2)', () => {
  it('importación correcta incorpora los rodales (en una base vacía), sin pedir contraseña', async () => {
    const texto = copiaDe([rodal('a'), rodal('b', { especies: ['Lactarius deliciosus'] })]);
    const almacen = await nuevoAlmacen();
    expect(await importarCopia(almacen, texto)).toEqual({ anadidos: 2, actualizados: 0, total: 2 });
    const lista = await almacen.listarRodales();
    expect(lista.map((r) => r.id).sort()).toEqual(['a', 'b']);
    expect(lista.find((r) => r.id === 'b').especies).toEqual(['Lactarius deliciosus']);
  });

  it.each([
    ['no es JSON', 'esto no es json'],
    ['otro formato', JSON.stringify({ formato: 'otra-cosa', version: 2, rodales: [] })],
    ['versión futura', JSON.stringify({ formato: 'rodales-copia', version: 99, rodales: [] })],
    ['sin lista de rodales', JSON.stringify({ formato: 'rodales-copia', version: 2 })],
    ['rodales no es lista', JSON.stringify({ formato: 'rodales-copia', version: 2, rodales: 'x' })],
    ['null', 'null'],
  ])('archivo no válido (%s): informa y no modifica', async (_nombre, texto) => {
    const almacen = await nuevoAlmacen();
    await almacen.guardarRodal(rodal('z'));
    await expect(importarCopia(almacen, texto)).rejects.toBeInstanceOf(CopiaInvalida);
    expect((await almacen.listarRodales()).map((r) => r.id)).toEqual(['z']);
  });

  it('una copia cifrada de la versión anterior se rechaza como no compatible', async () => {
    const antigua = JSON.stringify({ formato: 'rodales-copia', version: 1, sal: 's', iteraciones: 600000, iv: 'i', datos: 'cifrado' });
    const almacen = await nuevoAlmacen();
    await almacen.guardarRodal(rodal('z'));
    const err = await importarCopia(almacen, antigua).catch((e) => e);
    expect(err).toBeInstanceOf(CopiaInvalida);
    expect(err.message).toContain('cifrada');
    expect(err.message).toContain('no es compatible');
    expect((await almacen.listarRodales()).map((r) => r.id)).toEqual(['z']);
  });

  it.each([
    ['latitud fuera de rango', { lat: 999 }],
    ['longitud fuera de rango', { lng: -181 }],
    ['sin especies', { especies: [] }],
    ['especie vacía', { especies: [''] }],
    ['id vacío', { id: '' }],
    ['fecha inválida', { creadoEn: 'ayer' }],
    ['notas no es texto', { notas: 5 }],
    ['coordenadas no numéricas', { lat: '42' }],
  ])('un rodal con %s rechaza TODA la importación', async (_n, defecto) => {
    const texto = copiaDe([rodal('bueno'), rodal('malo', defecto)]);
    const almacen = await nuevoAlmacen();
    await expect(importarCopia(almacen, texto)).rejects.toBeInstanceOf(CopiaInvalida);
    expect(await almacen.contarRodales()).toBe(0); // ni siquiera el bueno
  });

  it('una precisión nula es válida (coordenadas manuales)', () => {
    expect(() => leerCopia(copiaDe([rodal('a', { precision: null })]))).not.toThrow();
  });

  it('importar dos veces el mismo archivo no duplica', async () => {
    const texto = copiaDe([rodal('a'), rodal('b')]);
    const almacen = await nuevoAlmacen();
    await importarCopia(almacen, texto);
    expect(await importarCopia(almacen, texto)).toEqual({ anadidos: 0, actualizados: 0, total: 2 });
    expect(await almacen.contarRodales()).toBe(2);
  });

  it('con el mismo id gana el más reciente; con empate se conserva el existente', () => {
    const viejo = rodal('a', { notas: 'vieja', actualizadoEn: '2026-01-01T10:00:00.000Z' });
    const nuevo = rodal('a', { notas: 'nueva', actualizadoEn: '2026-06-01T10:00:00.000Z' });
    const igual = rodal('a', { notas: 'empate', actualizadoEn: '2026-01-01T10:00:00.000Z' });
    expect(fusionar([viejo], [nuevo]).aEscribir[0].notas).toBe('nueva');
    expect(fusionar([nuevo], [viejo]).aEscribir).toEqual([]);
    expect(fusionar([viejo], [igual]).aEscribir).toEqual([]);
  });

  it('importar una versión más reciente actualiza el rodal existente', async () => {
    const almacen = await nuevoAlmacen();
    await almacen.guardarRodal(rodal('a', { notas: 'vieja' }));
    const texto = copiaDe([rodal('a', { notas: 'nueva', actualizadoEn: '2026-06-01T10:00:00.000Z' })]);
    expect(await importarCopia(almacen, texto)).toEqual({ anadidos: 0, actualizados: 1, total: 1 });
    expect((await almacen.leerRodal('a')).notas).toBe('nueva');
  });

  it('conserva los rodales existentes que no están en la copia', async () => {
    const almacen = await nuevoAlmacen();
    await almacen.guardarRodal(rodal('local'));
    await importarCopia(almacen, copiaDe([rodal('a')]));
    expect((await almacen.listarRodales()).map((r) => r.id).sort()).toEqual(['a', 'local']);
  });

  it('ida y vuelta conserva todos los campos', async () => {
    const original = rodal('a', { precision: null, especies: ['Amanita caesarea', 'Boletus edulis'], notas: 'ñ 🍄' });
    const almacen = await nuevoAlmacen();
    await importarCopia(almacen, copiaDe([original]));
    expect(await almacen.leerRodal('a')).toEqual(original);
  });

  it('descarta campos desconocidos de los rodales importados', async () => {
    const almacen = await nuevoAlmacen();
    await importarCopia(almacen, copiaDe([{ ...rodal('a'), peligroso: '<script>' }]));
    expect((await almacen.leerRodal('a')).peligroso).toBeUndefined();
  });
});

describe('recordatorio de copia (6.3)', () => {
  const ahora = (d) => () => new Date(d);
  const r = (creado, actualizado = creado) => ({ creadoEn: creado, actualizadoEn: actualizado });

  it('sin rodales no avisa', () => {
    expect(necesitaAvisoCopia(null, [], ahora('2027-01-01'))).toBe(false);
  });

  it('avisa con rodales nuevos y más de 30 días desde la última exportación', () => {
    expect(necesitaAvisoCopia('2026-10-01T00:00:00.000Z', [r('2026-10-05T00:00:00.000Z')], ahora('2026-11-08T00:00:00.000Z'))).toBe(true);
  });

  it('no avisa si pasaron menos de 30 días', () => {
    expect(necesitaAvisoCopia('2026-10-20T00:00:00.000Z', [r('2026-10-25T00:00:00.000Z')], ahora('2026-11-08T00:00:00.000Z'))).toBe(false);
  });

  it('no avisa si no hay rodales posteriores a la exportación aunque hayan pasado 30 días', () => {
    expect(necesitaAvisoCopia('2026-09-01T00:00:00.000Z', [r('2026-08-01T00:00:00.000Z')], ahora('2026-11-08T00:00:00.000Z'))).toBe(false);
  });

  it('exactamente 30 días no avisa; 30 días y un milisegundo sí', () => {
    const ult = '2026-10-01T00:00:00.000Z';
    const limite = Date.parse(ult) + 30 * 24 * 3600 * 1000;
    const rodales = [r('2026-10-02T00:00:00.000Z')];
    expect(necesitaAvisoCopia(ult, rodales, () => new Date(limite))).toBe(false);
    expect(necesitaAvisoCopia(ult, rodales, () => new Date(limite + 1))).toBe(true);
  });

  it('un rodal modificado después de exportar también cuenta', () => {
    expect(necesitaAvisoCopia('2026-09-01T00:00:00.000Z', [r('2026-08-01T00:00:00.000Z', '2026-09-15T00:00:00.000Z')], ahora('2026-11-08T00:00:00.000Z'))).toBe(true);
  });

  it('sin exportación previa avisa cuando el rodal más antiguo supera los 30 días', () => {
    expect(necesitaAvisoCopia(null, [r('2026-10-20T00:00:00.000Z')], ahora('2026-11-08T00:00:00.000Z'))).toBe(false);
    expect(necesitaAvisoCopia(null, [r('2026-09-20T00:00:00.000Z')], ahora('2026-11-08T00:00:00.000Z'))).toBe(true);
  });
});
