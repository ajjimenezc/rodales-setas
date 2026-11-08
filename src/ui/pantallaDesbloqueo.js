import { el } from './dom.js';

// onDesbloquear(contrasena) debe lanzar si es incorrecta; la pantalla muestra el error y permite reintentar.
export function pantallaDesbloqueo({ onDesbloquear }) {
  const error = el('p', { class: 'error', role: 'alert' });
  const pw = el('input', { type: 'password', name: 'contrasena', autocomplete: 'current-password', required: true });

  return el(
    'form',
    {
      class: 'pantalla',
      onSubmit: async (e) => {
        e.preventDefault();
        error.textContent = '';
        try {
          await onDesbloquear(pw.value);
        } catch {
          pw.value = '';
          error.textContent = 'Contraseña incorrecta.';
          pw.focus();
        }
      },
    },
    el('h1', {}, 'Rodales'),
    el('label', {}, 'Contraseña', pw),
    error,
    el('button', { type: 'submit' }, 'Desbloquear'),
  );
}
