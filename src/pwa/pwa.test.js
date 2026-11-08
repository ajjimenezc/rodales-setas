// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import { abrirAlmacen } from '../db/almacen.js';
import { solicitarPersistencia } from './persistencia.js';
import { esIOS, esStandalone, necesitaAvisoInstalacion } from './plataforma.js';
import { mostrarAvisoActualizacion } from './avisoActualizacion.js';

let n = 0;
const almacen = () => abrirAlmacen(`pwa-${n++}`);

describe('almacenamiento persistente (7.3)', () => {
  it('lo solicita y registra que se ha concedido', async () => {
    const a = await almacen();
    const nav = { storage: { persisted: vi.fn(async () => false), persist: vi.fn(async () => true) } };
    expect(await solicitarPersistencia(a, nav)).toBe(true);
    expect(nav.storage.persist).toHaveBeenCalledOnce();
    expect((await a.leerAjustes()).persistenciaConcedida).toBe(true);
  });

  it('si ya estaba concedido no vuelve a pedirlo', async () => {
    const a = await almacen();
    const nav = { storage: { persisted: vi.fn(async () => true), persist: vi.fn(async () => true) } };
    expect(await solicitarPersistencia(a, nav)).toBe(true);
    expect(nav.storage.persist).not.toHaveBeenCalled();
  });

  it('registra que NO se ha concedido', async () => {
    const a = await almacen();
    const nav = { storage: { persisted: async () => false, persist: async () => false } };
    expect(await solicitarPersistencia(a, nav)).toBe(false);
    expect((await a.leerAjustes()).persistenciaConcedida).toBe(false);
  });

  it('si el navegador no soporta la API devuelve null y lo registra', async () => {
    const a = await almacen();
    expect(await solicitarPersistencia(a, {})).toBeNull();
    expect((await a.leerAjustes()).persistenciaConcedida).toBeNull();
  });

  it('si persist() lanza, lo trata como no concedido', async () => {
    const a = await almacen();
    const nav = { storage: { persist: async () => { throw new Error('x'); } } };
    expect(await solicitarPersistencia(a, nav)).toBe(false);
  });

  it('no pisa otros ajustes (p. ej. la fecha de última exportación)', async () => {
    const a = await almacen();
    await a.actualizarAjustes({ ultimaExportacion: '2026-11-08T10:00:00.000Z' });
    await solicitarPersistencia(a, { storage: { persist: async () => true } });
    const aj = await a.leerAjustes();
    expect(aj.ultimaExportacion).toBe('2026-11-08T10:00:00.000Z');
    expect(aj.persistenciaConcedida).toBe(true);
  });
});

describe('plataforma iOS (7.4)', () => {
  const iphone = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15', platform: 'iPhone', maxTouchPoints: 5 };
  const mac = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 0 };
  const ipadOS = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 5 };
  const android = { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)', platform: 'Linux armv8l', maxTouchPoints: 5 };

  it('detecta iPhone y iPad (también iPadOS que se hace pasar por Mac), no Mac ni Android', () => {
    expect(esIOS(iphone)).toBe(true);
    expect(esIOS(ipadOS)).toBe(true);
    expect(esIOS(mac)).toBe(false);
    expect(esIOS(android)).toBe(false);
  });

  it('detecta modo standalone por navigator.standalone o display-mode', () => {
    expect(esStandalone({ nav: { standalone: true }, matchMedia: () => ({ matches: false }) })).toBe(true);
    expect(esStandalone({ nav: {}, matchMedia: () => ({ matches: true }) })).toBe(true);
    expect(esStandalone({ nav: { standalone: false }, matchMedia: () => ({ matches: false }) })).toBe(false);
    expect(esStandalone({ nav: {}, matchMedia: undefined })).toBe(false);
  });

  it('aviso en Safari sin instalar, no en la app instalada ni fuera de iOS', () => {
    const sinInstalar = () => ({ matches: false });
    expect(necesitaAvisoInstalacion({ ...iphone, standalone: false }, sinInstalar)).toBe(true);
    expect(necesitaAvisoInstalacion({ ...iphone, standalone: true }, sinInstalar)).toBe(false);
    expect(necesitaAvisoInstalacion(mac, sinInstalar)).toBe(false);
    expect(necesitaAvisoInstalacion(android, sinInstalar)).toBe(false);
  });
});

describe('aviso de nueva versión (7.2)', () => {
  it('se muestra una sola vez, actualiza al pulsar y se cierra con «Luego»', () => {
    document.body.replaceChildren();
    const onActualizar = vi.fn();
    const aviso = mostrarAvisoActualizacion(document, onActualizar);
    expect(mostrarAvisoActualizacion(document, onActualizar)).toBeUndefined(); // no duplica
    expect(document.querySelectorAll('.aviso-actualizacion')).toHaveLength(1);
    aviso.querySelector('[name="actualizar"]').click();
    expect(onActualizar).toHaveBeenCalledOnce();
    aviso.querySelector('[name="despues"]').click();
    expect(document.querySelector('.aviso-actualizacion')).toBeNull();
  });
});
