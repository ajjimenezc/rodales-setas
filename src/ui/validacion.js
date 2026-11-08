export const LONGITUD_MINIMA_CONTRASENA = 8;

// Devuelve un mensaje de error, o null si es válida.
export function validarContrasenaNueva(contrasena, confirmacion) {
  if (contrasena.length < LONGITUD_MINIMA_CONTRASENA) {
    return `La contraseña debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`;
  }
  if (contrasena !== confirmacion) return 'Las contraseñas no coinciden.';
  return null;
}
