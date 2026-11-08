// Revisión estática (parte de 5.5): el código de la app no hace peticiones propias a la red.
// Las únicas peticiones externas son las teselas de Leaflet; el resto del tráfico sería el
// de los recursos de la propia web. La comprobación en el navegador sigue siendo manual.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function archivos(dir) {
  return readdirSync(dir).flatMap((f) => {
    const ruta = join(dir, f);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

describe('privacidad (5.5, parte estática)', () => {
  const fuentes = archivos('src').filter((f) => f.endsWith('.js') && !f.includes('.test.'));

  it('no hay fetch, XMLHttpRequest, WebSocket ni sendBeacon en el código de la app', () => {
    for (const f of fuentes) {
      const texto = readFileSync(f, 'utf8');
      expect(texto, f).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|new WebSocket|sendBeacon|EventSource/);
    }
  });

  it('la única URL externa es la de teselas y es una plantilla sin datos del usuario', () => {
    const urls = fuentes.flatMap((f) => readFileSync(f, 'utf8').match(/https?:\/\/[^\s'"`]+/g) ?? []);
    const externas = urls.filter((u) => !u.includes('openstreetmap.org'));
    expect(externas).toEqual([]);
    expect(urls.filter((u) => u.includes('{z}'))).toEqual(['https://tile.openstreetmap.org/{z}/{x}/{y}.png']);
  });
});
