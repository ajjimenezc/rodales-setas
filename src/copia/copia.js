// Copia de seguridad: archivo JSON { formato, version, sal, iteraciones, iv, datos }.
// `datos` es { exportadoEn, rodales } cifrado con AES-GCM. Se usa la clave de la app (en memoria),
// cuya sal e iteraciones van en el archivo; al importar se pide la contraseña con la que se exportó.
import { cifrar, descifrar, derivarClave } from '../crypto/cifrado.js';

export const FORMATO = 'rodales-copia';
export const VERSION = 1;
const MAX_ITERACIONES = 5_000_000; // evita archivos maliciosos que bloqueen el dispositivo
const DIAS_AVISO = 30;
const MS_DIA = 24 * 60 * 60 * 1000;

export class CopiaInvalida extends Error {
  constructor(motivo) {
    super(motivo);
    this.name = 'CopiaInvalida';
  }
}
export class ContrasenaCopiaIncorrecta extends Error {
  constructor() {
    super('La contraseña no corresponde a esta copia');
    this.name = 'ContrasenaCopiaIncorrecta';
  }
}

// --- exportar ---------------------------------------------------------------
export async function generarCopia(clave, ajustes, rodales, ahora = () => new Date()) {
  const { iv, datos } = await cifrar(clave, { exportadoEn: ahora().toISOString(), rodales });
  return JSON.stringify({ formato: FORMATO, version: VERSION, sal: ajustes.sal, iteraciones: ajustes.iteraciones, iv, datos });
}

export function nombreArchivo(ahora = () => new Date()) {
  return `rodales-${ahora().toISOString().slice(0, 10)}.json`;
}

// Usa la hoja de compartir si puede compartir archivos; si no, descarga.
// Devuelve 'compartido', 'descargado' o 'cancelado' (el usuario cerró la hoja de compartir).
export async function entregarArchivo(texto, nombre, { nav = globalThis.navigator, doc = globalThis.document, url = globalThis.URL } = {}) {
  const archivo = new File([texto], nombre, { type: 'application/json' });
  if (nav?.canShare?.({ files: [archivo] })) {
    try {
      await nav.share({ files: [archivo], title: 'Copia de seguridad de rodales' });
      return 'compartido';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelado';
      // Si compartir falla por otro motivo, se intenta la descarga
    }
  }
  const enlace = doc.createElement('a');
  const direccion = url.createObjectURL(archivo);
  enlace.href = direccion;
  enlace.download = nombre;
  doc.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => url.revokeObjectURL(direccion), 10000);
  return 'descargado';
}

// --- importar ---------------------------------------------------------------
const esTexto = (v) => typeof v === 'string' && v.length > 0;
const esFecha = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

// Valida el formato SIN descifrar. Lanza CopiaInvalida.
export function leerCopia(texto) {
  let c;
  try {
    c = JSON.parse(texto);
  } catch {
    throw new CopiaInvalida('El archivo no es una copia válida.');
  }
  if (!c || typeof c !== 'object' || c.formato !== FORMATO) throw new CopiaInvalida('El archivo no es una copia de rodales.');
  if (c.version !== VERSION) throw new CopiaInvalida('La versión de la copia no es compatible.');
  if (![c.sal, c.iv, c.datos].every(esTexto)) throw new CopiaInvalida('La copia está incompleta.');
  if (!Number.isInteger(c.iteraciones) || c.iteraciones < 1 || c.iteraciones > MAX_ITERACIONES) {
    throw new CopiaInvalida('La copia tiene parámetros no válidos.');
  }
  return c;
}

function validarRodal(r) {
  const ok =
    r && typeof r === 'object' &&
    esTexto(r.id) &&
    Number.isFinite(r.lat) && r.lat >= -90 && r.lat <= 90 &&
    Number.isFinite(r.lng) && r.lng >= -180 && r.lng <= 180 &&
    (r.precision === null || Number.isFinite(r.precision)) &&
    esFecha(r.creadoEn) && esFecha(r.actualizadoEn) &&
    Array.isArray(r.especies) && r.especies.length > 0 && r.especies.every(esTexto) &&
    typeof r.notas === 'string';
  if (!ok) throw new CopiaInvalida('La copia contiene rodales con datos no válidos.');
  return {
    id: r.id, lat: r.lat, lng: r.lng, precision: r.precision,
    creadoEn: r.creadoEn, actualizadoEn: r.actualizadoEn, especies: [...r.especies], notas: r.notas,
  };
}

// Descifra y valida. No toca ningún dato existente. Devuelve { rodales, exportadoEn }.
export async function abrirCopia(texto, contrasena) {
  const c = leerCopia(texto);
  const clave = await derivarClave(contrasena, c.sal, c.iteraciones);
  let contenido;
  try {
    contenido = await descifrar(clave, { iv: c.iv, datos: c.datos });
  } catch {
    throw new ContrasenaCopiaIncorrecta();
  }
  if (!contenido || !Array.isArray(contenido.rodales)) throw new CopiaInvalida('La copia no contiene rodales.');
  return { rodales: contenido.rodales.map(validarRodal), exportadoEn: contenido.exportadoEn ?? null };
}

// Fusión por id; si coincide, gana el más reciente (actualizadoEn). Empate: se conserva el existente.
export function fusionar(existentes, importados) {
  const porId = new Map(existentes.map((r) => [r.id, r]));
  const aEscribir = [];
  let anadidos = 0;
  let actualizados = 0;
  for (const nuevo of importados) {
    const actual = porId.get(nuevo.id);
    if (!actual) {
      aEscribir.push(nuevo);
      anadidos++;
    } else if (Date.parse(nuevo.actualizadoEn) > Date.parse(actual.actualizadoEn)) {
      aEscribir.push(nuevo);
      actualizados++;
    }
  }
  return { aEscribir, anadidos, actualizados };
}

export async function importarCopia(almacen, clave, texto, contrasena) {
  const { rodales } = await abrirCopia(texto, contrasena); // valida todo antes de tocar nada
  const existentes = await almacen.listarRodales(clave);
  const { aEscribir, anadidos, actualizados } = fusionar(existentes, rodales);
  if (aEscribir.length > 0) await almacen.guardarVarios(clave, aEscribir);
  return { anadidos, actualizados, total: rodales.length };
}

export async function exportarCopia(almacen, clave, { nav, doc, url, ahora = () => new Date() } = {}) {
  const ajustes = await almacen.leerAjustes();
  const rodales = await almacen.listarRodales(clave);
  const texto = await generarCopia(clave, ajustes, rodales, ahora);
  const resultado = await entregarArchivo(texto, nombreArchivo(ahora), { nav, doc, url });
  if (resultado !== 'cancelado') await almacen.actualizarAjustes({ ultimaExportacion: ahora().toISOString() });
  return resultado;
}

// --- recordatorio -----------------------------------------------------------
// Avisa si hay rodales nuevos o modificados desde la última exportación y han pasado más de 30 días.
// Sin exportación previa, la referencia es el rodal más antiguo.
export function necesitaAvisoCopia(ultimaExportacion, rodales, ahora = () => new Date()) {
  if (rodales.length === 0) return false;
  const ref = ultimaExportacion
    ? Date.parse(ultimaExportacion)
    : Math.min(...rodales.map((r) => Date.parse(r.creadoEn)));
  const hayPendientes = rodales.some((r) => Date.parse(r.actualizadoEn) > ref) || !ultimaExportacion;
  return hayPendientes && ahora().getTime() - ref > DIAS_AVISO * MS_DIA;
}
