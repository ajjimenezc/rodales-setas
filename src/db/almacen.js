// Capa IndexedDB. Los rodales se guardan SIEMPRE cifrados: { id, iv, datos }.
// Los ajustes (sal, iteraciones, verificador...) no contienen datos sensibles.
import { openDB } from 'idb';
import { cifrar, descifrar } from '../crypto/cifrado.js';

const VERSION_ESQUEMA = 1;
const CLAVE_AJUSTES = 'principal';

export async function abrirAlmacen(nombre = 'rodales-db') {
  const db = await openDB(nombre, VERSION_ESQUEMA, {
    upgrade(db) {
      db.createObjectStore('ajustes');
      db.createObjectStore('rodales', { keyPath: 'id' });
    },
  });

  return {
    db,

    async leerAjustes() {
      return (await db.get('ajustes', CLAVE_AJUSTES)) ?? null;
    },

    async guardarAjustes(ajustes) {
      await db.put('ajustes', ajustes, CLAVE_AJUSTES);
    },

    async actualizarAjustes(parcial) {
      const tx = db.transaction('ajustes', 'readwrite');
      const actuales = (await tx.store.get(CLAVE_AJUSTES)) ?? {};
      await tx.store.put({ ...actuales, ...parcial }, CLAVE_AJUSTES);
      await tx.done;
    },

    async guardarRodal(clave, rodal) {
      const { iv, datos } = await cifrar(clave, rodal);
      await db.put('rodales', { id: rodal.id, iv, datos });
    },

    // Guarda varios rodales en una única transacción (todo o nada). Cifra antes de abrirla.
    async guardarVarios(clave, rodales) {
      const registros = await Promise.all(
        rodales.map(async (r) => ({ id: r.id, ...(await cifrar(clave, r)) })),
      );
      const tx = db.transaction('rodales', 'readwrite');
      for (const reg of registros) await tx.store.put(reg);
      await tx.done;
    },

    async leerRodal(clave, id) {
      const reg = await db.get('rodales', id);
      return reg ? descifrar(clave, reg) : null;
    },

    async listarRodales(clave) {
      const registros = await db.getAll('rodales');
      return Promise.all(registros.map((r) => descifrar(clave, r)));
    },

    async borrarRodal(id) {
      await db.delete('rodales', id);
    },

    async contarRodales() {
      return db.count('rodales');
    },

    // Acceso a los registros cifrados en bruto (para pruebas y re-cifrado).
    async registrosBrutos() {
      return db.getAll('rodales');
    },

    // Sustituye ajustes y todos los registros en UNA transacción: o se aplica todo o nada.
    async reemplazarTodo(ajustes, registros) {
      const tx = db.transaction(['ajustes', 'rodales'], 'readwrite');
      await tx.objectStore('ajustes').put(ajustes, CLAVE_AJUSTES);
      const almacenRodales = tx.objectStore('rodales');
      await almacenRodales.clear();
      for (const r of registros) await almacenRodales.put(r);
      await tx.done;
    },

    cerrar() {
      db.close();
    },
  };
}
