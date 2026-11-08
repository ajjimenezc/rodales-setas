// Copia de seguridad: archivo JSON legible { formato, version, exportadoEn, rodales }.
// NO está cifrado: quien reciba el archivo verá los rodales.

export const FORMATO = 'rodales-copia';
export const VERSION = 2; // la 1 era una copia cifrada con contraseña, ya no compatible
const DIAS_AVISO = 30;
const MS_DIA = 24 * 60 * 60 * 1000;

export class CopiaInvalida extends Error {
  constructor(motivo) {
    super(motivo);
    this.name = 'CopiaInvalida';
  }
}

// --- exportar ---------------------------------------------------------------
export function generarCopia(rodales, ahora = () => new Date()) {
  return JSON.stringify({ formato: FORMATO, version: VERSION, exportadoEn: ahora().toISOString(), rodales }, null, 2);
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

export async function exportarCopia(almacen, { nav, doc, url, ahora = () => new Date() } = {}) {
  const rodales = await almacen.listarRodales();
  const resultado = await entregarArchivo(generarCopia(rodales, ahora), nombreArchivo(ahora), { nav, doc, url });
  if (resultado !== 'cancelado') await almacen.actualizarAjustes({ ultimaExportacion: ahora().toISOString() });
  return resultado;
}

// --- importar ---------------------------------------------------------------
const esTexto = (v) => typeof v === 'string' && v.length > 0;
const esFecha = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

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

// Valida el archivo completo SIN tocar ningún dato. Lanza CopiaInvalida. Devuelve { rodales, exportadoEn }.
export function leerCopia(texto) {
  let c;
  try {
    c = JSON.parse(texto);
  } catch {
    throw new CopiaInvalida('El archivo no es una copia válida.');
  }
  if (!c || typeof c !== 'object' || c.formato !== FORMATO) throw new CopiaInvalida('El archivo no es una copia de rodales.');
  if (c.version === 1) {
    throw new CopiaInvalida('Esta copia está cifrada y la generó una versión anterior de la app. El formato no es compatible.');
  }
  if (c.version !== VERSION) throw new CopiaInvalida('La versión de la copia no es compatible.');
  if (!Array.isArray(c.rodales)) throw new CopiaInvalida('La copia no contiene rodales.');
  return { rodales: c.rodales.map(validarRodal), exportadoEn: c.exportadoEn ?? null };
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

export async function importarCopia(almacen, texto) {
  const { rodales } = leerCopia(texto); // valida todo antes de tocar nada
  const existentes = await almacen.listarRodales();
  const { aEscribir, anadidos, actualizados } = fusionar(existentes, rodales);
  if (aEscribir.length > 0) await almacen.guardarVarios(aEscribir);
  return { anadidos, actualizados, total: rodales.length };
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
