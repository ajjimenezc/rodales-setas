// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import { abrirAlmacen } from '../db/almacen.js';
import { iniciarApp } from '../app.js';
import { crearContrasena } from '../crypto/sesion.js';

const ITER = 1000;
const enviar = (f) => f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

async function arrancar({ nav, avisoInstalacion = false } = {}) {
  const almacen = await abrirAlmacen(`pwa-app-${Math.random()}`);
  await crearContrasena(almacen, 'secreto-1234', { iteraciones: ITER });
  const raiz = document.createElement('div');
  document.body.replaceChildren(raiz);
  const app = await iniciarApp(raiz, almacen, { iteraciones: ITER, geo: null, nav, avisoInstalacion });
  return { almacen, raiz, app };
}
async function desbloquear(raiz) {
  raiz.querySelector('[name="contrasena"]').value = 'secreto-1234';
  enviar(raiz.querySelector('form'));
  await vi.waitFor(() => expect(raiz.querySelector('.lista')).not.toBeNull());
}

describe('persistencia en la app (7.3)', () => {
  it('la solicita al desbloquear y no avisa si se concede', async () => {
    const persist = vi.fn(async () => true);
    const { raiz, almacen } = await arrancar({ nav: { storage: { persisted: async () => false, persist } } });
    await desbloquear(raiz);
    await vi.waitFor(async () => expect((await almacen.leerAjustes()).persistenciaConcedida).toBe(true));
    expect(persist).toHaveBeenCalled();
    expect(raiz.querySelector('.aviso-persistencia')).toBeNull();
  });

  it('si no se concede, muestra la indicación de exportar copias; al bloquear desaparece', async () => {
    const { raiz, app } = await arrancar({ nav: { storage: { persisted: async () => false, persist: async () => false } } });
    await desbloquear(raiz);
    await vi.waitFor(() => expect(raiz.querySelector('.aviso-persistencia')).not.toBeNull());
    expect(raiz.querySelector('.aviso-persistencia').textContent).toContain('copia');
    app.bloquear();
    await vi.waitFor(() => expect(raiz.querySelector('input[type="password"]')).not.toBeNull());
    expect(raiz.querySelector('.aviso-persistencia')).toBeNull();
  });
});

describe('aviso de instalación en iOS (7.4)', () => {
  it('en Safari sin instalar muestra las instrucciones y la advertencia, incluso bloqueada y tras navegar', async () => {
    const { raiz } = await arrancar({ nav: {}, avisoInstalacion: true });
    const aviso = raiz.querySelector('.aviso-instalacion');
    expect(aviso).not.toBeNull();
    expect(aviso.textContent).toContain('Añadir a pantalla de inicio');
    expect(aviso.textContent).toContain('no se compartirán');
    await desbloquear(raiz);
    expect(raiz.querySelector('.aviso-instalacion')).not.toBeNull(); // sigue visible
  });

  it('en la app instalada no se muestra', async () => {
    const { raiz } = await arrancar({ nav: {}, avisoInstalacion: false });
    expect(raiz.querySelector('.aviso-instalacion')).toBeNull();
  });
});
