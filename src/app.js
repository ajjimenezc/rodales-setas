// Controlador de pantallas. La app abre directamente en el listado: no hay contraseña ni bloqueo
// (la protección de los datos es la del propio iPhone).
import { el } from './ui/dom.js';
import { pantallaLista } from './ui/pantallaLista.js';
import { pantallaRodal } from './ui/pantallaRodal.js';
import { pantallaCopia } from './ui/pantallaCopia.js';
import { pantallaMapa } from './mapa/pantallaMapa.js';
import { solicitarPersistencia } from './pwa/persistencia.js';
import { exportarCopia, importarCopia, necesitaAvisoCopia } from './copia/copia.js';
import { especiesUsadas } from './db/rodales.js';

export async function iniciarApp(raiz, almacen, { ahora, geo, confirmar, enLinea, nav, doc, url, avisoInstalacion = false } = {}) {
  const reloj = ahora ?? (() => new Date());
  let pantallaActual = null;

  // Cambia la pantalla de un contenedor, parando lo que la anterior tuviera en marcha (p. ej. el GPS).
  function colocar(contenedor, nodo) {
    pantallaActual?.destruir?.();
    pantallaActual = nodo;
    contenedor.replaceChildren(nodo);
  }

  // La raíz tiene una zona fija de avisos y la zona de la pantalla.
  const zonaAvisos = el('div', { class: 'avisos' });
  const zona = el('div', { class: 'zona' });
  raiz.replaceChildren(zonaAvisos, zona);

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

  // Pide almacenamiento persistente al arrancar. Si no se concede, avisa de exportar copias.
  async function pedirPersistencia() {
    const concedida = await solicitarPersistencia(almacen, nav);
    zonaAvisos.querySelector('.aviso-persistencia')?.remove();
    if (concedida === true) return;
    zonaAvisos.append(
      el(
        'div',
        { class: 'aviso aviso-persistencia', role: 'status' },
        'El navegador no garantiza conservar estos datos. Exporta una copia de seguridad con regularidad (botón «Copia»).',
      ),
    );
  }

  function mostrarPrincipal() {
    const contenido = el('section', { id: 'contenido' });
    colocar(
      zona,
      el(
        'main',
        { class: 'principal' },
        el(
          'header',
          {},
          el('h1', {}, 'Rodales'),
          el(
            'nav',
            {},
            el('button', { type: 'button', name: 'ver-lista', onClick: () => irALista(contenido) }, 'Lista'),
            el('button', { type: 'button', name: 'ver-mapa', onClick: () => irAMapa(contenido) }, 'Mapa'),
            el('button', { type: 'button', name: 'ver-copia', onClick: () => irACopia(contenido) }, 'Copia'),
          ),
        ),
        contenido,
      ),
    );
    return irALista(contenido);
  }

  async function irALista(contenido) {
    const rodales = await almacen.listarRodales();
    const ajustes = await almacen.leerAjustes();
    const avisar = necesitaAvisoCopia(ajustes?.ultimaExportacion ?? null, rodales, reloj);
    colocar(
      contenido,
      pantallaLista({
        rodales,
        avisoCopia: avisar ? { onIr: () => irACopia(contenido) } : null,
        onNuevo: () => irANuevo(contenido, rodales),
        onAbrir: (r) => irADetalle(contenido, r, rodales),
      }),
    );
  }

  async function irAMapa(contenido) {
    const rodales = await almacen.listarRodales();
    colocar(
      contenido,
      pantallaMapa({
        rodales,
        geo,
        enLinea,
        confirmar,
        onMover: (movido) => almacen.guardarRodal({ ...movido, actualizadoEn: reloj().toISOString() }),
      }),
    );
  }

  async function irACopia(contenido) {
    const ajustes = await almacen.leerAjustes();
    colocar(
      contenido,
      pantallaCopia({
        ultimaExportacion: ajustes?.ultimaExportacion ?? null,
        leerUltimaExportacion: async () => (await almacen.leerAjustes())?.ultimaExportacion ?? null,
        onExportar: () => exportarCopia(almacen, { nav, doc, url, ahora: reloj }),
        onImportar: (texto) => importarCopia(almacen, texto),
        onVolver: () => irALista(contenido),
      }),
    );
  }

  function irANuevo(contenido, rodales) {
    colocar(
      contenido,
      pantallaRodal({
        conocidas: especiesUsadas(rodales),
        geo,
        ahora: reloj,
        onGuardar: async (rodal) => {
          await almacen.guardarRodal(rodal);
          await irALista(contenido);
        },
        onCancelar: () => irALista(contenido),
      }),
    );
  }

  function irADetalle(contenido, rodal, rodales) {
    colocar(
      contenido,
      pantallaRodal({
        rodal,
        conocidas: especiesUsadas(rodales),
        ahora: reloj,
        confirmar,
        onGuardar: async (editado) => {
          await almacen.guardarRodal(editado);
          await irALista(contenido);
        },
        onBorrar: async (r) => {
          await almacen.borrarRodal(r.id);
          await irALista(contenido);
        },
        onCancelar: () => irALista(contenido),
      }),
    );
  }

  await mostrarPrincipal();
  pedirPersistencia();
}
