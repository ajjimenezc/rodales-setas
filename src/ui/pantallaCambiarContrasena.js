import { el } from './dom.js';
import { validarContrasenaNueva } from './validacion.js';

// onCambiar(actual, nueva) lanza si la actual es incorrecta. onCancelar vuelve atrás.
export function pantallaCambiarContrasena({ onCambiar, onCancelar }) {
  const error = el('p', { class: 'error', role: 'alert' });
  const actual = el('input', { type: 'password', name: 'actual', autocomplete: 'current-password', required: true });
  const nueva = el('input', { type: 'password', name: 'nueva', autocomplete: 'new-password', required: true });
  const confirmacion = el('input', { type: 'password', name: 'confirmacion', autocomplete: 'new-password', required: true });

  return el(
    'form',
    {
      class: 'pantalla',
      onSubmit: async (e) => {
        e.preventDefault();
        const msg = validarContrasenaNueva(nueva.value, confirmacion.value);
        error.textContent = msg ?? '';
        if (msg) return;
        try {
          await onCambiar(actual.value, nueva.value);
        } catch {
          error.textContent = 'La contraseña actual es incorrecta.';
        }
      },
    },
    el('h1', {}, 'Cambiar contraseña'),
    el('label', {}, 'Contraseña actual', actual),
    el('label', {}, 'Contraseña nueva', nueva),
    el('label', {}, 'Repite la nueva', confirmacion),
    error,
    el('button', { type: 'submit' }, 'Cambiar'),
    el('button', { type: 'button', onClick: onCancelar }, 'Cancelar'),
  );
}
