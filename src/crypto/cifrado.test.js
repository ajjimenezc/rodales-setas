import { describe, it, expect } from 'vitest';
import { derivarClave, generarSal, cifrar, descifrar } from './cifrado.js';

const ITER = 1000; // bajo para que las pruebas sean rápidas

describe('cifrado', () => {
  it('ida y vuelta devuelve el valor original', async () => {
    const sal = generarSal();
    const clave = await derivarClave('secreto-1234', sal, ITER);
    const original = { lat: 42.1, lng: -1.2, especies: ['Boletus edulis'], notas: 'ñ ü 🍄' };
    const reg = await cifrar(clave, original);
    expect(await descifrar(clave, reg)).toEqual(original);
  });

  it('una contraseña incorrecta no descifra', async () => {
    const sal = generarSal();
    const buena = await derivarClave('secreto-1234', sal, ITER);
    const mala = await derivarClave('otro-secreto', sal, ITER);
    const reg = await cifrar(buena, { x: 1 });
    await expect(descifrar(mala, reg)).rejects.toThrow();
  });

  it('una sal distinta produce otra clave', async () => {
    const a = await derivarClave('secreto-1234', generarSal(), ITER);
    const b = await derivarClave('secreto-1234', generarSal(), ITER);
    const reg = await cifrar(a, { x: 1 });
    await expect(descifrar(b, reg)).rejects.toThrow();
  });

  it('usa un IV distinto en cada cifrado', async () => {
    const clave = await derivarClave('secreto-1234', generarSal(), ITER);
    const r1 = await cifrar(clave, { x: 1 });
    const r2 = await cifrar(clave, { x: 1 });
    expect(r1.iv).not.toBe(r2.iv);
    expect(r1.datos).not.toBe(r2.datos);
  });

  it('detecta datos alterados', async () => {
    const clave = await derivarClave('secreto-1234', generarSal(), ITER);
    const reg = await cifrar(clave, { x: 1 });
    const bytes = atob(reg.datos).split('');
    bytes[0] = String.fromCharCode(bytes[0].charCodeAt(0) ^ 1);
    await expect(descifrar(clave, { ...reg, datos: btoa(bytes.join('')) })).rejects.toThrow();
  });

  it('el texto cifrado no contiene el texto en claro', async () => {
    const clave = await derivarClave('secreto-1234', generarSal(), ITER);
    const reg = await cifrar(clave, { especies: ['Cantharellus cibarius'] });
    expect(atob(reg.datos)).not.toContain('Cantharellus');
  });
});
