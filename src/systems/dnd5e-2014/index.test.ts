import { describe, expect, it } from 'vitest';
import { registry } from '../../core/registry';
import '../index';
import { dnd5e } from '.';
import { newClass } from './model';

describe('modulo dnd5e', () => {
  it('ha id, nome e versione', () => {
    expect(dnd5e.id).toBe('dnd5e-2014');
    expect(dnd5e.name).toBe('D&D 5e (2014)');
    expect(dnd5e.schemaVersion).toBe(1);
  });

  it('è registrato nel registro globale', () => {
    expect(registry.get('dnd5e-2014')).toBe(dnd5e);
  });

  it('valida un personaggio vuoto anche dopo JSON', () => {
    const blank = dnd5e.createBlank();
    expect(dnd5e.validate(JSON.parse(JSON.stringify(blank)))).toEqual(blank);
  });

  it('validate lancia errore su dati non validi', () => {
    expect(() => dnd5e.validate({})).toThrow();
  });

  it('migrate lascia invariati i dati v1', () => {
    const blank = dnd5e.createBlank();
    expect(dnd5e.migrate(blank, 1)).toBe(blank);
  });

  it('migrate rifiuta versioni più recenti o non valide', () => {
    expect(() => dnd5e.migrate({}, 2)).toThrow(/più recente/);
    expect(() => dnd5e.migrate({}, 0)).toThrow(/non valida/);
  });

  it('getName, withName e summary', () => {
    const c = dnd5e.withName(dnd5e.createBlank(), 'Lia');
    expect(dnd5e.getName(c)).toBe('Lia');
    c.race = 'Elfo';
    c.classes = [{ ...newClass(), name: 'Mago', level: 5 }];
    expect(dnd5e.summary(c)).toBe('Elfo · Mago 5 — liv. 5');
  });
});
