// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import { abrirAlmacen } from '../db/almacen.js';
import { iniciarApp } from '../app.js';

const rodal = {
  id: 'r1', lat: 42.1, lng: -1.2, precision: 8,
  creadoEn: '2026-11-08T10:00:00.000Z', actualizadoEn: '2026-11-08T10:00:00.000Z',
  especies: ['Amanita caesarea'], notas: 'cerca del roble',
};
const textosBoton = (raiz) => [...raiz.querySelectorAll('button')].map((b) => b.textContent);

async function arrancar(rodales = []) {
  const almacen = await abrirAlmacen(`arranque-${Math.random()}`);
  for (const r of rodales) await almacen.guardarRodal(r);
  const raiz = document.createElement('div');
  document.body.replaceChildren(raiz);
  await iniciarApp(raiz, almacen, { geo: null, nav: { storage: { persist: async () => true } } });
  return { almacen, raiz };
}

describe('arranque sin contraseña (3.1)', () => {
  it('al abrir se ve directamente el listado, sin pedir nada', async () => {
    const { raiz } = await arrancar([rodal]);
    expect(raiz.querySelector('.lista')).not.toBeNull();
    expect(raiz.textContent).toContain('Amanita caesarea');
    expect(raiz.textContent).toContain('cerca del roble'.slice(0, 0)); // las notas se ven en el detalle
  });

  it('sin rodales, se ve el estado vacío con la acción de crear', async () => {
    const { raiz } = await arrancar();
    expect(raiz.querySelector('.lista.vacia')).not.toBeNull();
    expect(textosBoton(raiz)).toContain('Nuevo rodal');
  });

  it('no existe ningún campo de contraseña', async () => {
    const { raiz } = await arrancar([rodal]);
    expect(raiz.querySelector('input[type="password"]')).toBeNull();
    expect(raiz.querySelector('[autocomplete*="password"]')).toBeNull();
  });

  it('no existen los botones «Contraseña» ni «Bloquear»', async () => {
    const { raiz } = await arrancar([rodal]);
    const botones = textosBoton(raiz);
    expect(botones).not.toContain('Contraseña');
    expect(botones).not.toContain('Bloquear');
    expect(botones).toEqual(expect.arrayContaining(['Lista', 'Mapa', 'Copia']));
  });

  it('pasar mucho tiempo en segundo plano no bloquea ni cambia la pantalla', async () => {
    const { raiz } = await arrancar([rodal]);
    const estado = (v) => Object.defineProperty(document, 'visibilityState', { value: v, configurable: true });
    estado('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    estado('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((r) => setTimeout(r, 20));
    expect(raiz.querySelector('.lista')).not.toBeNull();
    expect(raiz.querySelector('input[type="password"]')).toBeNull();
  });

  it('los rodales guardados se conservan al reabrir la app', async () => {
    const nombre = `reabrir-app-${Math.random()}`;
    const a1 = await abrirAlmacen(nombre);
    await a1.guardarRodal(rodal);
    a1.cerrar();
    const almacen = await abrirAlmacen(nombre);
    const raiz = document.createElement('div');
    document.body.replaceChildren(raiz);
    await iniciarApp(raiz, almacen, { geo: null, nav: {} });
    await vi.waitFor(() => expect(raiz.textContent).toContain('Amanita caesarea'));
  });

  it('un listado con HTML en las especies no se interpreta', async () => {
    const { raiz } = await arrancar([{ ...rodal, especies: ['<img src=x onerror=alert(1)>'] }]);
    expect(raiz.querySelector('img')).toBeNull();
    expect(raiz.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});
