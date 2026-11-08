// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import { abrirAlmacen } from '../db/almacen.js';
import { iniciarApp } from '../app.js';

async function arrancar({ nav, avisoInstalacion = false } = {}) {
  const almacen = await abrirAlmacen(`pwa-app-${Math.random()}`);
  const raiz = document.createElement('div');
  document.body.replaceChildren(raiz);
  await iniciarApp(raiz, almacen, { geo: null, nav, avisoInstalacion });
  return { almacen, raiz };
}

describe('persistencia al arrancar (7.3)', () => {
  it('la solicita al abrir la app y no avisa si se concede', async () => {
    const persist = vi.fn(async () => true);
    const { raiz, almacen } = await arrancar({ nav: { storage: { persisted: async () => false, persist } } });
    await vi.waitFor(async () => expect((await almacen.leerAjustes()).persistenciaConcedida).toBe(true));
    expect(persist).toHaveBeenCalledOnce();
    expect(raiz.querySelector('.aviso-persistencia')).toBeNull();
  });

  it('no pide nada al usuario para solicitarla', async () => {
    const { raiz } = await arrancar({ nav: { storage: { persisted: async () => false, persist: async () => true } } });
    expect(raiz.querySelector('input[type="password"]')).toBeNull();
    expect(raiz.querySelector('.lista')).not.toBeNull();
  });

  it('si no se concede, muestra la indicación de exportar copias', async () => {
    const { raiz, almacen } = await arrancar({ nav: { storage: { persisted: async () => false, persist: async () => false } } });
    await vi.waitFor(() => expect(raiz.querySelector('.aviso-persistencia')).not.toBeNull());
    expect(raiz.querySelector('.aviso-persistencia').textContent).toContain('copia');
    expect((await almacen.leerAjustes()).persistenciaConcedida).toBe(false);
  });

  it('si el navegador no soporta la API, también muestra la indicación', async () => {
    const { raiz } = await arrancar({ nav: {} });
    await vi.waitFor(() => expect(raiz.querySelector('.aviso-persistencia')).not.toBeNull());
  });

  it('la indicación sobrevive al cambiar de pestaña', async () => {
    const { raiz } = await arrancar({ nav: { storage: { persist: async () => false } } });
    await vi.waitFor(() => expect(raiz.querySelector('.aviso-persistencia')).not.toBeNull());
    [...raiz.querySelectorAll('button')].find((b) => b.textContent === 'Copia').click();
    await vi.waitFor(() => expect(raiz.querySelector('.copia')).not.toBeNull());
    expect(raiz.querySelector('.aviso-persistencia')).not.toBeNull();
  });
});

describe('aviso de instalación en iOS (7.4)', () => {
  it('en Safari sin instalar muestra las instrucciones y la advertencia, y sigue visible al navegar', async () => {
    const { raiz } = await arrancar({ nav: {}, avisoInstalacion: true });
    const aviso = raiz.querySelector('.aviso-instalacion');
    expect(aviso).not.toBeNull();
    expect(aviso.textContent).toContain('Añadir a pantalla de inicio');
    expect(aviso.textContent).toContain('no se compartirán');
    [...raiz.querySelectorAll('button')].find((b) => b.textContent === 'Mapa').click();
    await vi.waitFor(() => expect(raiz.querySelector('.vista-mapa')).not.toBeNull());
    expect(raiz.querySelector('.aviso-instalacion')).not.toBeNull();
  });

  it('en la app instalada no se muestra', async () => {
    const { raiz } = await arrancar({ nav: {}, avisoInstalacion: false });
    expect(raiz.querySelector('.aviso-instalacion')).toBeNull();
  });
});
