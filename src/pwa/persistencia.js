// Almacenamiento persistente: pide al navegador que no purgue los datos y registra el resultado.
// Devuelve true / false (no concedido) o null (el navegador no soporta la API).
export async function solicitarPersistencia(almacen, nav = globalThis.navigator) {
  const storage = nav?.storage;
  if (!storage?.persist) {
    await almacen.actualizarAjustes({ persistenciaConcedida: null });
    return null;
  }
  let concedida = false;
  try {
    concedida = (await storage.persisted?.()) || (await storage.persist());
  } catch {
    concedida = false;
  }
  concedida = Boolean(concedida);
  await almacen.actualizarAjustes({ persistenciaConcedida: concedida });
  return concedida;
}
