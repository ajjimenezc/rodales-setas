export const LIMITE_SEGUNDO_PLANO_MS = 5 * 60 * 1000;

// Bloquea si la app estuvo en segundo plano más del límite. Devuelve una función para dejar de vigilar.
export function vigilarInactividad({ onBloquear, ahora = Date.now, limiteMs = LIMITE_SEGUNDO_PLANO_MS, doc = document }) {
  let ocultoDesde = null;
  const alCambiar = () => {
    if (doc.visibilityState === 'hidden') {
      ocultoDesde = ahora();
    } else if (ocultoDesde != null) {
      const fuera = ahora() - ocultoDesde;
      ocultoDesde = null;
      if (fuera > limiteMs) onBloquear();
    }
  };
  doc.addEventListener('visibilitychange', alCambiar);
  return () => doc.removeEventListener('visibilitychange', alCambiar);
}
