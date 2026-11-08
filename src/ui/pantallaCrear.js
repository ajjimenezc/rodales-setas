import { el } from './dom.js';
import { validarContrasenaNueva } from './validacion.js';

// Primer uso: crear y confirmar contraseña. onCrear(contrasena) solo se llama si es válida.
export function pantallaCrearContrasena({ onCrear }) {
  const error = el('p', { class: 'error', role: 'alert' });
  const pw = el('input', { type: 'password', name: 'contrasena', autocomplete: 'new-password', required: true });
  const pw2 = el('input', { type: 'password', name: 'confirmacion', autocomplete: 'new-password', required: true });

  const form = el(
    'form',
    {
      class: 'pantalla',
      onSubmit: async (e) => {
        e.preventDefault();
        const msg = validarContrasenaNueva(pw.value, pw2.value);
        error.textContent = msg ?? '';
        if (msg) return;
        await onCrear(pw.value);
      },
    },
    el('h1', {}, 'Crear contraseña'),
    el(
      'p',
      { class: 'aviso' },
      'Esta contraseña cifra tus rodales en este dispositivo. ',
      el('strong', {}, 'Si la olvidas, los datos no se podrán recuperar.'),
    ),
    el('label', {}, 'Contraseña', pw),
    el('label', {}, 'Repite la contraseña', pw2),
    error,
    el('button', { type: 'submit' }, 'Crear y entrar'),
  );
  return form;
}
