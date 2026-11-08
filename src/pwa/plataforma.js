// Detección de iPhone/iPad y de si la web se ejecuta como app instalada (standalone).

export function esIOS({ userAgent = '', platform = '', maxTouchPoints = 0 } = {}) {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  // iPadOS 13+ se identifica como Mac, pero con pantalla táctil
  return platform === 'MacIntel' && maxTouchPoints > 1;
}

export function esStandalone({ nav = globalThis.navigator, matchMedia = globalThis.matchMedia?.bind(globalThis) } = {}) {
  if (nav?.standalone === true) return true;
  try {
    return Boolean(matchMedia?.('(display-mode: standalone)')?.matches);
  } catch {
    return false;
  }
}

// Debe mostrarse el aviso de instalación: iOS y no instalada.
export function necesitaAvisoInstalacion(nav = globalThis.navigator, matchMedia) {
  return esIOS(nav ?? {}) && !esStandalone({ nav, matchMedia });
}
