// Modelo y lógica pura de rodales (sin DOM ni almacenamiento).

export function normalizarEspecies(especies) {
  const vistas = new Set();
  const resultado = [];
  for (const e of especies) {
    const limpia = String(e).trim().replace(/\s+/g, ' ');
    const clave = limpia.toLowerCase();
    if (limpia && !vistas.has(clave)) {
      vistas.add(clave);
      resultado.push(limpia);
    }
  }
  return resultado;
}

// Devuelve el rodal listo para guardar, o { error }.
export function crearRodal({ lat, lng, precision = null, especies, notas = '' }, ahora = () => new Date()) {
  const lista = normalizarEspecies(especies ?? []);
  if (lista.length === 0) return { error: 'Añade al menos una especie.' };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: 'Falta la ubicación del rodal.' };
  const instante = ahora().toISOString();
  return {
    rodal: {
      id: crypto.randomUUID(),
      lat,
      lng,
      precision,
      creadoEn: instante,
      actualizadoEn: instante,
      especies: lista,
      notas: String(notas).trim(),
    },
  };
}

// Edita especies y notas conservando creadoEn. Devuelve { rodal } o { error }.
export function editarRodal(rodal, { especies, notas }, ahora = () => new Date()) {
  const lista = normalizarEspecies(especies ?? []);
  if (lista.length === 0) return { error: 'Añade al menos una especie.' };
  return {
    rodal: { ...rodal, especies: lista, notas: String(notas ?? '').trim(), actualizadoEn: ahora().toISOString() },
  };
}

export function ordenarRecientesPrimero(rodales) {
  return [...rodales].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

// Especies usadas en todos los rodales, sin duplicados (ignorando mayúsculas), ordenadas por uso y nombre.
export function especiesUsadas(rodales) {
  const cuenta = new Map();
  for (const r of rodales) {
    for (const e of r.especies) {
      const k = e.toLowerCase();
      const previo = cuenta.get(k);
      cuenta.set(k, { nombre: previo?.nombre ?? e, usos: (previo?.usos ?? 0) + 1 });
    }
  }
  return [...cuenta.values()]
    .sort((a, b) => b.usos - a.usos || a.nombre.localeCompare(b.nombre, 'es'))
    .map((x) => x.nombre);
}

const sinAcentos = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Sugiere especies conocidas cuya cualquier palabra empiece por el texto (sin acentos ni mayúsculas).
export function sugerirEspecies(texto, conocidas, max = 6) {
  const q = sinAcentos(texto.trim());
  if (!q) return [];
  return conocidas
    .filter((e) => sinAcentos(e).split(/\s+/).some((palabra) => palabra.startsWith(q)) || sinAcentos(e).startsWith(q))
    .slice(0, max);
}
