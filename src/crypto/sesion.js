// Gestión de contraseña: crear, desbloquear y cambiar. La contraseña y la clave
// nunca se guardan; solo sal, iteraciones y un verificador cifrado.
import {
  ITERACIONES_POR_DEFECTO,
  derivarClave,
  generarSal,
  cifrar,
  descifrar,
} from './cifrado.js';

const TEXTO_VERIFICADOR = 'rodales-v1';

export class ContrasenaIncorrecta extends Error {
  constructor() {
    super('Contraseña incorrecta');
    this.name = 'ContrasenaIncorrecta';
  }
}

async function comprobar(clave, verificador) {
  try {
    return (await descifrar(clave, verificador)) === TEXTO_VERIFICADOR;
  } catch {
    return false;
  }
}

export async function existeContrasena(almacen) {
  return (await almacen.leerAjustes())?.verificador != null;
}

// Primer uso: devuelve la clave (solo en memoria).
export async function crearContrasena(almacen, contrasena, { iteraciones = ITERACIONES_POR_DEFECTO } = {}) {
  if (await existeContrasena(almacen)) throw new Error('Ya existe una contraseña');
  const sal = generarSal();
  const clave = await derivarClave(contrasena, sal, iteraciones);
  const verificador = await cifrar(clave, TEXTO_VERIFICADOR);
  await almacen.actualizarAjustes({ sal, iteraciones, verificador });
  return clave;
}

export async function desbloquear(almacen, contrasena) {
  const ajustes = await almacen.leerAjustes();
  if (!ajustes?.verificador) throw new Error('No hay contraseña configurada');
  const clave = await derivarClave(contrasena, ajustes.sal, ajustes.iteraciones);
  if (!(await comprobar(clave, ajustes.verificador))) throw new ContrasenaIncorrecta();
  return clave;
}

// Re-cifra todos los rodales con la contraseña nueva. Todo el trabajo criptográfico
// se hace en memoria y la escritura es una única transacción: un fallo no deja datos corruptos.
export async function cambiarContrasena(almacen, actual, nueva, { iteraciones } = {}) {
  const ajustes = await almacen.leerAjustes();
  const claveActual = await desbloquear(almacen, actual);
  const registros = await almacen.registrosBrutos();
  const rodales = await Promise.all(registros.map((r) => descifrar(claveActual, r)));

  const iter = iteraciones ?? ajustes.iteraciones;
  const sal = generarSal();
  const claveNueva = await derivarClave(nueva, sal, iter);
  const verificador = await cifrar(claveNueva, TEXTO_VERIFICADOR);
  const nuevosRegistros = await Promise.all(
    rodales.map(async (r) => ({ id: r.id, ...(await cifrar(claveNueva, r)) })),
  );

  await almacen.reemplazarTodo({ ...ajustes, sal, iteraciones: iter, verificador }, nuevosRegistros);
  return claveNueva;
}
