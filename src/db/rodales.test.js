import { describe, it, expect } from 'vitest';
import {
  crearRodal,
  editarRodal,
  normalizarEspecies,
  ordenarRecientesPrimero,
  especiesUsadas,
  sugerirEspecies,
} from './rodales.js';

const t0 = () => new Date('2026-11-08T10:00:00.000Z');
const t1 = () => new Date('2026-11-09T12:00:00.000Z');
const base = { lat: 42.1, lng: -1.2, precision: 8 };

describe('crear rodal (4.2)', () => {
  it('guarda con una especie, fecha automática y notas', () => {
    const { rodal } = crearRodal({ ...base, especies: ['Boletus edulis'], notas: ' bajo el pino ' }, t0);
    expect(rodal.especies).toEqual(['Boletus edulis']);
    expect(rodal.notas).toBe('bajo el pino');
    expect(rodal.creadoEn).toBe('2026-11-08T10:00:00.000Z');
    expect(rodal.actualizadoEn).toBe(rodal.creadoEn);
    expect(rodal.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('guarda con tres especies', () => {
    const { rodal } = crearRodal({ ...base, especies: ['A a', 'B b', 'C c'] }, t0);
    expect(rodal.especies).toHaveLength(3);
  });

  it('sin especie no guarda', () => {
    expect(crearRodal({ ...base, especies: [] }).error).toContain('al menos una especie');
    expect(crearRodal({ ...base, especies: ['  ', ''] }).error).toContain('al menos una especie');
  });

  it('sin ubicación no guarda', () => {
    expect(crearRodal({ lat: null, lng: null, especies: ['A a'] }).error).toContain('ubicación');
  });

  it('elimina especies duplicadas ignorando mayúsculas', () => {
    expect(normalizarEspecies(['Boletus edulis', ' boletus  EDULIS ', 'Lactarius'])).toEqual([
      'Boletus edulis',
      'Lactarius',
    ]);
  });
});

describe('editar rodal (4.5)', () => {
  it('conserva creadoEn y actualiza actualizadoEn', () => {
    const { rodal } = crearRodal({ ...base, especies: ['A a'] }, t0);
    const { rodal: editado } = editarRodal(rodal, { especies: ['B b'], notas: 'nueva' }, t1);
    expect(editado.creadoEn).toBe(rodal.creadoEn);
    expect(editado.actualizadoEn).toBe('2026-11-09T12:00:00.000Z');
    expect(editado.id).toBe(rodal.id);
    expect(editado.especies).toEqual(['B b']);
  });

  it('no permite dejar el rodal sin especies', () => {
    const { rodal } = crearRodal({ ...base, especies: ['A a'] }, t0);
    expect(editarRodal(rodal, { especies: [], notas: '' }).error).toContain('al menos una especie');
  });
});

describe('listado (4.4)', () => {
  it('ordena del más reciente al más antiguo', () => {
    const r = (id, creadoEn) => ({ id, creadoEn, especies: ['x'] });
    const orden = ordenarRecientesPrimero([r('a', '2026-01-01T00:00:00Z'), r('c', '2026-03-01T00:00:00Z'), r('b', '2026-02-01T00:00:00Z')]);
    expect(orden.map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('autocompletado (4.3)', () => {
  const rodales = [
    { especies: ['Boletus edulis', 'Lactarius deliciosus'] },
    { especies: ['boletus edulis', 'Cantharellus cibarius'] },
    { especies: ['Boletus aereus'] },
  ];

  it('especiesUsadas no duplica y ordena por uso', () => {
    expect(especiesUsadas(rodales)[0]).toBe('Boletus edulis');
    expect(especiesUsadas(rodales)).toHaveLength(4);
  });

  it('sugiere por prefijo', () => {
    expect(sugerirEspecies('Bol', especiesUsadas(rodales))).toEqual(['Boletus edulis', 'Boletus aereus']);
  });

  it('sugiere por prefijo de cualquier palabra, sin acentos ni mayúsculas', () => {
    expect(sugerirEspecies('EDU', especiesUsadas(rodales))).toEqual(['Boletus edulis']);
    expect(sugerirEspecies('lacta', ['Lactárius deliciosus'])).toEqual(['Lactárius deliciosus']);
  });

  it('sin texto o sin coincidencias no sugiere nada', () => {
    expect(sugerirEspecies('', especiesUsadas(rodales))).toEqual([]);
    expect(sugerirEspecies('zzz', especiesUsadas(rodales))).toEqual([]);
  });

  it('una especie nueva se ofrece después de guardar un rodal que la contiene', () => {
    const antes = especiesUsadas(rodales);
    expect(sugerirEspecies('Amanita', antes)).toEqual([]);
    const despues = especiesUsadas([...rodales, { especies: ['Amanita caesarea'] }]);
    expect(sugerirEspecies('Amanita', despues)).toEqual(['Amanita caesarea']);
  });
});
