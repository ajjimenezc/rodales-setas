// Cifrado con WebCrypto: PBKDF2 (SHA-256) para derivar la clave y AES-GCM 256 para los datos.

export const ITERACIONES_POR_DEFECTO = 600000;
const LONGITUD_SAL = 16;
const LONGITUD_IV = 12;

const codificador = new TextEncoder();
const decodificador = new TextDecoder();

export function aBase64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function deBase64(texto) {
  const s = atob(texto);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

export function generarSal() {
  return aBase64(crypto.getRandomValues(new Uint8Array(LONGITUD_SAL)));
}

// Devuelve una CryptoKey no extraíble. La contraseña y la clave nunca se guardan.
export async function derivarClave(contrasena, sal, iteraciones = ITERACIONES_POR_DEFECTO) {
  const material = await crypto.subtle.importKey(
    'raw',
    codificador.encode(contrasena),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: deBase64(sal), iterations: iteraciones, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// Cifra cualquier valor serializable a JSON. IV aleatorio nuevo en cada llamada.
export async function cifrar(clave, valor) {
  const iv = crypto.getRandomValues(new Uint8Array(LONGITUD_IV));
  const cifrado = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    clave,
    codificador.encode(JSON.stringify(valor)),
  );
  return { iv: aBase64(iv), datos: aBase64(new Uint8Array(cifrado)) };
}

// Lanza si la clave es incorrecta o los datos fueron alterados.
export async function descifrar(clave, registro) {
  const claro = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: deBase64(registro.iv) },
    clave,
    deBase64(registro.datos),
  );
  return JSON.parse(decodificador.decode(claro));
}
