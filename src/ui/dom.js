// Helper mínimo para construir DOM. Los textos van siempre como nodos de texto
// (nunca innerHTML), de modo que notas y especies del usuario no pueden inyectar HTML.
export function el(etiqueta, props = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) nodo.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') nodo.className = v;
    else if (v === true) nodo.setAttribute(k, '');
    else nodo.setAttribute(k, String(v));
  }
  for (const h of hijos.flat()) {
    if (h == null || h === false) continue;
    nodo.append(h instanceof Node ? h : document.createTextNode(String(h)));
  }
  return nodo;
}
