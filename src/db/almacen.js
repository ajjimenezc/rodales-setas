// Capa IndexedDB. Los rodales se guardan en claro, un registro por rodal con su `id` como clave.
// La protección de los datos es la del propio dispositivo (no hay contraseña ni cifrado).
import { openDB } from 'idb';

// v2: sin cifrado. Al actualizar desde la v1 (rodales cifrados con contraseña, solo de pruebas)
// se vacían los almacenes antiguos y la app arranca limpia.
export const VERSION_ESQUEMA = 2;
const CLAVE_AJUSTES = 'principal';

export async function abrirAlmacen(nombre = 'rodales-db') {
  const db = await openDB(nombre, VERSION_ESQUEMA, {
    upgrade(db, versionAnterior) {
      if (versionAnterior < 2) {
        for (const existente of [...db.objectStoreNames]) db.deleteObjectStore(existente);
        db.createObjectStore('ajustes');
        db.createObjectStore('rodales', { keyPath: 'id' });
      }
    },
  });

  return {
    db,

    async leerAjustes() {
      return (await db.get('ajustes', CLAVE_AJUSTES)) ?? null;
    },

    // Fusiona `parcial` con los ajustes actuales en una transacción.
    async actualizarAjustes(parcial) {
      const tx = db.transaction('ajustes', 'readwrite');
      const actuales = (await tx.store.get(CLAVE_AJUSTES)) ?? {};
      await tx.store.put({ ...actuales, ...parcial }, CLAVE_AJUSTES);
      await tx.done;
    },

    async guardarRodal(rodal) {
      await db.put('rodales', rodal);
    },

    // Guarda varios rodales en una única transacción: o se guardan todos o ninguno.
    async guardarVarios(rodales) {
      const tx = db.transaction('rodales', 'readwrite');
      try {
        for (const r of rodales) await tx.store.put(r);
      } catch (e) {
        // Si un put lanza, IndexedDB confirmaría igualmente los anteriores: se aborta para no dejar datos a medias.
        tx.abort();
        await tx.done.catch(() => {});
        throw e;
      }
      await tx.done;
    },

    async leerRodal(id) {
      return (await db.get('rodales', id)) ?? null;
    },

    async listarRodales() {
      return db.getAll('rodales');
    },

    async borrarRodal(id) {
      await db.delete('rodales', id);
    },

    async contarRodales() {
      return db.count('rodales');
    },

    cerrar() {
      db.close();
    },
  };
}
