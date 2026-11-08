// Controlador: decide qué pantalla mostrar. Bloqueada, solo existe la pantalla de contraseña en el DOM.
import { el } from './ui/dom.js';
import { pantallaCrearContrasena } from './ui/pantallaCrear.js';
import { pantallaDesbloqueo } from './ui/pantallaDesbloqueo.js';
import { pantallaCambiarContrasena } from './ui/pantallaCambiarContrasena.js';
import { pantallaLista } from './ui/pantallaLista.js';
import { pantallaRodal } from './ui/pantallaRodal.js';
import { pantallaMapa } from './mapa/pantallaMapa.js';
import { pantallaCopia } from './ui/pantallaCopia.js';
import { solicitarPersistencia } from './pwa/persistencia.js';
import { exportarCopia, importarCopia, necesitaAvisoCopia } from './copia/copia.js';
import { vigilarInactividad } from './ui/inactividad.js';
import { existeContrasena, crearContrasena, desbloquear, cambiarContrasena } from './crypto/sesion.js';
import { especiesUsadas } from './db/rodales.js';

export async function iniciarApp(raiz, almacen, { iteraciones, ahora, geo, confirmar, enLinea, nav, doc, url, avisoInstalacion = false } = {}) {
  const reloj = ahora ?? (() => new Date());
  let clave = null;
  let dejarDeVigilar = null;
  let pantallaActual = null;

  // Cambia la pantalla de un contenedor, parando lo que la anterior tuviera en marcha (p. ej. el GPS).
  function colocar(contenedor, nodo) {
    pantallaActual?.destruir?.();
    pantallaActual = nodo;
    contenedor.replaceChildren(nodo);
  }
  // La raíz tiene una zona fija de avisos (no se borra al cambiar de pantalla) y la zona de la pantalla.
  const zonaAvisos = el('div', { class: 'avisos' });
  const zona = el('div', { class: 'zona' });
  raiz.replaceChildren(zonaAvisos, zona);
  const mostrar = (nodo) => colocar(zona, nodo);

  if (avisoInstalacion) {
    zonaAvisos.append(
      el(
        'div',
        { class: 'aviso aviso-instalacion', role: 'status' },
        el('strong', {}, 'Estás usando la web en Safari. '),
        'Los datos que guardes aquí no se compartirán con la app instalada y Safari puede borrarlos. ',
        'Para instalarla, pulsa Compartir y luego «Añadir a pantalla de inicio», y ábrela desde su icono antes de guardar rodales.',
      ),
    );
  }

  function bloquear() {
    clave = null; // se descarta la clave de memoria
    dejarDeVigilar?.();
    dejarDeVigilar = null;
    mostrarBloqueo();
  }

  function entrar(nuevaClave) {
    clave = nuevaClave;
    dejarDeVigilar?.();
    dejarDeVigilar = vigilarInactividad({ onBloquear: bloquear, ahora });
    mostrarPrincipal();
    pedirPersistencia();
  }

  // Pide almacenamiento persistente tras desbloquear. Si no se concede, avisa de exportar copias.
  async function pedirPersistencia() {
    const concedida = await solicitarPersistencia(almacen, nav);
    zonaAvisos.querySelector('.aviso-persistencia')?.remove();
    if (concedida === true || !clave) return;
    zonaAvisos.append(
      el(
        'div',
        { class: 'aviso aviso-persistencia', role: 'status' },
        'El navegador no garantiza conservar estos datos. Exporta una copia de seguridad con regularidad (botón «Copia»).',
      ),
    );
  }

  async function mostrarBloqueo() {
    zonaAvisos.querySelector('.aviso-persistencia')?.remove();
    if (await existeContrasena(almacen)) {
      mostrar(pantallaDesbloqueo({ onDesbloquear: async (pw) => entrar(await desbloquear(almacen, pw)) }));
    } else {
      mostrar(
        pantallaCrearContrasena({
          onCrear: async (pw) => entrar(await crearContrasena(almacen, pw, { iteraciones })),
        }),
      );
    }
  }

  function mostrarPrincipal() {
    const contenido = el('section', { id: 'contenido' });
    mostrar(
      el(
        'main',
        { class: 'principal' },
        el(
          'header',
          {},
          el('h1', {}, 'Rodales'),
          el('nav', {},
            el('button', { type: 'button', name: 'ver-lista', onClick: () => irALista(contenido) }, 'Lista'),
            el('button', { type: 'button', name: 'ver-mapa', onClick: () => irAMapa(contenido) }, 'Mapa'),
          ),
          el('button', { type: 'button', name: 'ver-copia', onClick: () => irACopia(contenido) }, 'Copia'),
          el('button', { type: 'button', onClick: mostrarCambioContrasena }, 'Contraseña'),
          el('button', { type: 'button', onClick: bloquear }, 'Bloquear'),
        ),
        contenido,
      ),
    );
    irALista(contenido);
  }

  async function irALista(contenido) {
    const rodales = await almacen.listarRodales(clave);
    const ajustes = await almacen.leerAjustes();
    if (!clave) return; // se bloqueó mientras se cargaba
    const avisar = necesitaAvisoCopia(ajustes?.ultimaExportacion ?? null, rodales, reloj);
    colocar(contenido, pantallaLista({
      rodales,
      avisoCopia: avisar ? { onIr: () => irACopia(contenido) } : null,
      onNuevo: () => irANuevo(contenido, rodales),
      onAbrir: (r) => irADetalle(contenido, r, rodales),
    }));
  }

  async function irAMapa(contenido) {
    const rodales = await almacen.listarRodales(clave);
    if (!clave) return;
    colocar(contenido, pantallaMapa({
      rodales,
      geo,
      enLinea,
      confirmar,
      onMover: async (movido) => {
        await almacen.guardarRodal(clave, { ...movido, actualizadoEn: reloj().toISOString() });
      },
    }));
  }

  async function irACopia(contenido) {
    const ajustes = await almacen.leerAjustes();
    if (!clave) return;
    colocar(contenido, pantallaCopia({
      ultimaExportacion: ajustes?.ultimaExportacion ?? null,
      onExportar: () => exportarCopia(almacen, clave, { nav, doc, url, ahora: reloj }),
      leerUltimaExportacion: async () => (await almacen.leerAjustes())?.ultimaExportacion ?? null,
      onImportar: (texto, contrasena) => importarCopia(almacen, clave, texto, contrasena),
      onVolver: () => irALista(contenido),
    }));
  }

  function irANuevo(contenido, rodales) {
    colocar(contenido, pantallaRodal({
      conocidas: especiesUsadas(rodales),
      geo,
      ahora: reloj,
      onGuardar: async (rodal) => {
        await almacen.guardarRodal(clave, rodal);
        await irALista(contenido);
      },
      onCancelar: () => irALista(contenido),
    }));
  }

  function irADetalle(contenido, rodal, rodales) {
    colocar(contenido, pantallaRodal({
      rodal,
      conocidas: especiesUsadas(rodales),
      ahora: reloj,
      confirmar,
      onGuardar: async (editado) => {
        await almacen.guardarRodal(clave, editado);
        await irALista(contenido);
      },
      onBorrar: async (r) => {
        await almacen.borrarRodal(r.id);
        await irALista(contenido);
      },
      onCancelar: () => irALista(contenido),
    }));
  }

  function mostrarCambioContrasena() {
    mostrar(
      pantallaCambiarContrasena({
        onCambiar: async (actual, nueva) => {
          clave = await cambiarContrasena(almacen, actual, nueva, { iteraciones });
          mostrarPrincipal();
        },
        onCancelar: mostrarPrincipal,
      }),
    );
  }

  await mostrarBloqueo();
  return { bloquear, obtenerClave: () => clave };
}
