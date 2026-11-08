// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pantallaCrearContrasena } from './pantallaCrear.js';
import { vigilarInactividad } from './inactividad.js';
import { abrirAlmacen } from '../db/almacen.js';
import { iniciarApp } from '../app.js';
import { crearContrasena } from '../crypto/sesion.js';

const ITER = 1000;
let n = 0;

function enviar(form) {
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}
function rellenar(raiz, valores) {
  for (const [nombre, valor] of Object.entries(valores)) raiz.querySelector(`[name="${nombre}"]`).value = valor;
}
const esperarTexto = (raiz, texto) => vi.waitFor(() => expect(raiz.textContent).toContain(texto));

const rodal = {
  id: 'r1', lat: 42.1, lng: -1.2, precision: 8,
  creadoEn: '2026-11-08T10:00:00.000Z', actualizadoEn: '2026-11-08T10:00:00.000Z',
  especies: ['Amanita caesarea'], notas: 'cerca del roble',
};

describe('primer uso (3.1)', () => {
  it('contraseñas distintas no continúan', async () => {
    const onCrear = vi.fn();
    const f = pantallaCrearContrasena({ onCrear });
    rellenar(f, { contrasena: 'abcdefgh', confirmacion: 'abcdefgX' });
    enviar(f);
    expect(f.textContent).toContain('no coinciden');
    expect(onCrear).not.toHaveBeenCalled();
  });

  it('una contraseña corta no continúa', async () => {
    const onCrear = vi.fn();
    const f = pantallaCrearContrasena({ onCrear });
    rellenar(f, { contrasena: 'corta', confirmacion: 'corta' });
    enviar(f);
    expect(f.textContent).toContain('al menos 8');
    expect(onCrear).not.toHaveBeenCalled();
  });

  it('una contraseña válida continúa y se muestra la advertencia de pérdida de datos', async () => {
    const onCrear = vi.fn();
    const f = pantallaCrearContrasena({ onCrear });
    expect(f.textContent).toContain('no se podrán recuperar');
    rellenar(f, { contrasena: 'abcdefgh', confirmacion: 'abcdefgh' });
    enviar(f);
    await vi.waitFor(() => expect(onCrear).toHaveBeenCalledWith('abcdefgh'));
  });
});

describe('pantalla de contraseña al iniciar (3.2)', () => {
  let almacen, raiz;
  beforeEach(async () => {
    almacen = await abrirAlmacen(`ui-${n++}`);
    const clave = await crearContrasena(almacen, 'secreto-1234', { iteraciones: ITER });
    await almacen.guardarRodal(clave, rodal);
    raiz = document.createElement('div');
    document.body.replaceChildren(raiz);
  });

  it('bloqueada, el DOM no contiene datos de rodales', async () => {
    await iniciarApp(raiz, almacen, { iteraciones: ITER });
    expect(raiz.querySelector('input[type="password"]')).not.toBeNull();
    const html = document.body.innerHTML;
    for (const t of ['Amanita', 'roble', '42.1']) expect(html).not.toContain(t);
  });

  it('una contraseña incorrecta permite reintentar y la correcta desbloquea', async () => {
    const app = await iniciarApp(raiz, almacen, { iteraciones: ITER });
    rellenar(raiz, { contrasena: 'mala-mala' });
    enviar(raiz.querySelector('form'));
    await esperarTexto(raiz, 'Contraseña incorrecta');
    expect(app.obtenerClave()).toBeNull();
    expect(raiz.querySelector('input[type="password"]')).not.toBeNull();

    rellenar(raiz, { contrasena: 'secreto-1234' });
    enviar(raiz.querySelector('form'));
    await vi.waitFor(() => expect(app.obtenerClave()).not.toBeNull());
    expect(raiz.querySelector('main')).not.toBeNull();
  });
});

describe('bloqueo (3.3)', () => {
  it('vigilarInactividad bloquea tras más del límite en segundo plano', () => {
    let t = 0;
    const onBloquear = vi.fn();
    const doc = new EventTarget();
    doc.visibilityState = 'visible';
    vigilarInactividad({ onBloquear, ahora: () => t, limiteMs: 300000, doc });

    doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange'));
    t = 299000;
    doc.visibilityState = 'visible'; doc.dispatchEvent(new Event('visibilitychange'));
    expect(onBloquear).not.toHaveBeenCalled(); // menos de 5 min

    t = 1000000;
    doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange'));
    t = 1000000 + 300001;
    doc.visibilityState = 'visible'; doc.dispatchEvent(new Event('visibilitychange'));
    expect(onBloquear).toHaveBeenCalledOnce();
  });

  it('el bloqueo manual descarta la clave y vuelve a la pantalla de contraseña', async () => {
    const almacen = await abrirAlmacen(`ui-${n++}`);
    await crearContrasena(almacen, 'secreto-1234', { iteraciones: ITER });
    const raiz = document.createElement('div');
    document.body.replaceChildren(raiz);
    const app = await iniciarApp(raiz, almacen, { iteraciones: ITER });
    rellenar(raiz, { contrasena: 'secreto-1234' });
    enviar(raiz.querySelector('form'));
    await vi.waitFor(() => expect(raiz.querySelector('main')).not.toBeNull());

    [...raiz.querySelectorAll('button')].find((b) => b.textContent === 'Bloquear').click();
    await vi.waitFor(() => expect(raiz.querySelector('input[type="password"]')).not.toBeNull());
    expect(app.obtenerClave()).toBeNull();
  });

  it('en la app, pasar >5 min en segundo plano pide la contraseña de nuevo', async () => {
    const almacen = await abrirAlmacen(`ui-${n++}`);
    await crearContrasena(almacen, 'secreto-1234', { iteraciones: ITER });
    const raiz = document.createElement('div');
    document.body.replaceChildren(raiz);
    let t = 0;
    const app = await iniciarApp(raiz, almacen, { iteraciones: ITER, ahora: () => t });
    rellenar(raiz, { contrasena: 'secreto-1234' });
    enviar(raiz.querySelector('form'));
    await vi.waitFor(() => expect(app.obtenerClave()).not.toBeNull());

    const estado = (v) => Object.defineProperty(document, 'visibilityState', { value: v, configurable: true });
    estado('hidden'); document.dispatchEvent(new Event('visibilitychange'));
    t = 300001;
    estado('visible'); document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(raiz.querySelector('input[type="password"]')).not.toBeNull());
    expect(app.obtenerClave()).toBeNull();
  });
});

describe('cambio de contraseña (3.4)', () => {
  async function entrarEnApp() {
    const almacen = await abrirAlmacen(`ui-${n++}`);
    await crearContrasena(almacen, 'vieja-1234', { iteraciones: ITER });
    const raiz = document.createElement('div');
    document.body.replaceChildren(raiz);
    const app = await iniciarApp(raiz, almacen, { iteraciones: ITER });
    rellenar(raiz, { contrasena: 'vieja-1234' });
    enviar(raiz.querySelector('form'));
    await vi.waitFor(() => expect(raiz.querySelector('main')).not.toBeNull());
    [...raiz.querySelectorAll('button')].find((b) => b.textContent === 'Contraseña').click();
    return { almacen, raiz, app };
  }

  it('flujo correcto: vuelve a la pantalla principal y la nueva contraseña funciona', async () => {
    const { raiz, app } = await entrarEnApp();
    rellenar(raiz, { actual: 'vieja-1234', nueva: 'nueva-5678', confirmacion: 'nueva-5678' });
    enviar(raiz.querySelector('form'));
    await vi.waitFor(() => expect(raiz.querySelector('main')).not.toBeNull());
    app.bloquear();
    await vi.waitFor(() => expect(raiz.querySelector('input[type="password"]')).not.toBeNull());
    rellenar(raiz, { contrasena: 'nueva-5678' });
    enviar(raiz.querySelector('form'));
    await vi.waitFor(() => expect(app.obtenerClave()).not.toBeNull());
  });

  it('con la contraseña actual incorrecta muestra el error y no cambia', async () => {
    const { raiz } = await entrarEnApp();
    rellenar(raiz, { actual: 'equivocada', nueva: 'nueva-5678', confirmacion: 'nueva-5678' });
    enviar(raiz.querySelector('form'));
    await esperarTexto(raiz, 'actual es incorrecta');
    expect(raiz.querySelector('main')).toBeNull();
  });
});
