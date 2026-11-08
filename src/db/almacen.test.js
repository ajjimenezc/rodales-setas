import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { abrirAlmacen } from './almacen.js';
import {
  crearContrasena,
  desbloquear,
  cambiarContrasena,
  existeContrasena,
  ContrasenaIncorrecta,
} from '../crypto/sesion.js';

const ITER = 1000;
let n = 0;
let almacen;

beforeEach(async () => {
  almacen = await abrirAlmacen(`test-${n++}`);
});

const rodal = (id, extra = {}) => ({
  id,
  lat: 42.1,
  lng: -1.2,
  precision: 8,
  creadoEn: '2026-11-08T10:00:00.000Z',
  actualizadoEn: '2026-11-08T10:00:00.000Z',
  especies: ['Boletus edulis'],
  notas: 'bajo el pino',
  ...extra,
});

describe('contraseña (2.2)', () => {
  it('la correcta desbloquea y la incorrecta se rechaza', async () => {
    await crearContrasena(almacen, 'secreto-1234', { iteraciones: ITER });
    expect(await existeContrasena(almacen)).toBe(true);
    await expect(desbloquear(almacen, 'secreto-1234')).resolves.toBeTruthy();
    await expect(desbloquear(almacen, 'incorrecta')).rejects.toBeInstanceOf(ContrasenaIncorrecta);
  });

  it('no guarda la contraseña ni la clave', async () => {
    await crearContrasena(almacen, 'secreto-1234', { iteraciones: ITER });
    const ajustes = await almacen.leerAjustes();
    expect(JSON.stringify(ajustes)).not.toContain('secreto-1234');
    expect(Object.keys(ajustes).sort()).toEqual(['iteraciones', 'sal', 'verificador']);
  });

  it('no permite crear una segunda contraseña', async () => {
    await crearContrasena(almacen, 'secreto-1234', { iteraciones: ITER });
    await expect(crearContrasena(almacen, 'otra-cosa-123', { iteraciones: ITER })).rejects.toThrow();
  });
});

describe('almacenamiento cifrado (2.3)', () => {
  it('guarda y recupera rodales', async () => {
    const clave = await crearContrasena(almacen, 'secreto-1234', { iteraciones: ITER });
    await almacen.guardarRodal(clave, rodal('a'));
    await almacen.guardarRodal(clave, rodal('b', { especies: ['Lactarius deliciosus'] }));
    const lista = await almacen.listarRodales(clave);
    expect(lista.map((r) => r.id).sort()).toEqual(['a', 'b']);
    expect((await almacen.leerRodal(clave, 'b')).especies).toEqual(['Lactarius deliciosus']);
  });

  it('lo almacenado no contiene texto en claro de especies ni notas', async () => {
    const clave = await crearContrasena(almacen, 'secreto-1234', { iteraciones: ITER });
    await almacen.guardarRodal(clave, rodal('a', { notas: 'junto al arroyo secreto' }));
    const crudo = JSON.stringify(await almacen.registrosBrutos());
    for (const texto of ['Boletus', 'arroyo', '42.1', '-1.2']) expect(crudo).not.toContain(texto);
  });

  it('borra rodales', async () => {
    const clave = await crearContrasena(almacen, 'secreto-1234', { iteraciones: ITER });
    await almacen.guardarRodal(clave, rodal('a'));
    await almacen.borrarRodal('a');
    expect(await almacen.contarRodales()).toBe(0);
  });
});

describe('cambio de contraseña (2.4)', () => {
  it('la nueva funciona, la antigua deja de funcionar y los datos se conservan', async () => {
    const clave = await crearContrasena(almacen, 'vieja-1234', { iteraciones: ITER });
    await almacen.guardarRodal(clave, rodal('a'));
    await almacen.guardarRodal(clave, rodal('b'));

    const nueva = await cambiarContrasena(almacen, 'vieja-1234', 'nueva-5678');
    await expect(desbloquear(almacen, 'vieja-1234')).rejects.toBeInstanceOf(ContrasenaIncorrecta);
    const claveNueva = await desbloquear(almacen, 'nueva-5678');
    expect((await almacen.listarRodales(claveNueva)).length).toBe(2);
    expect((await almacen.listarRodales(nueva)).length).toBe(2);
  });

  it('con la contraseña actual incorrecta no modifica nada', async () => {
    const clave = await crearContrasena(almacen, 'vieja-1234', { iteraciones: ITER });
    await almacen.guardarRodal(clave, rodal('a'));
    const antes = JSON.stringify([await almacen.leerAjustes(), await almacen.registrosBrutos()]);
    await expect(cambiarContrasena(almacen, 'mala', 'nueva-5678')).rejects.toBeInstanceOf(ContrasenaIncorrecta);
    const despues = JSON.stringify([await almacen.leerAjustes(), await almacen.registrosBrutos()]);
    expect(despues).toBe(antes);
  });

  it('un fallo a mitad (registro corrupto) no deja datos corruptos', async () => {
    const clave = await crearContrasena(almacen, 'vieja-1234', { iteraciones: ITER });
    await almacen.guardarRodal(clave, rodal('a'));
    await almacen.guardarRodal(clave, rodal('b'));
    // Corrompe un registro directamente en la base
    const reg = await almacen.db.get('rodales', 'b');
    await almacen.db.put('rodales', { ...reg, datos: btoa('basura-no-valida-0123456789') });

    const antes = JSON.stringify([await almacen.leerAjustes(), await almacen.registrosBrutos()]);
    await expect(cambiarContrasena(almacen, 'vieja-1234', 'nueva-5678')).rejects.toThrow();
    const despues = JSON.stringify([await almacen.leerAjustes(), await almacen.registrosBrutos()]);
    expect(despues).toBe(antes);
    // La contraseña antigua sigue funcionando y el rodal sano se lee
    const claveVieja = await desbloquear(almacen, 'vieja-1234');
    expect((await almacen.leerRodal(claveVieja, 'a')).id).toBe('a');
  });
});
