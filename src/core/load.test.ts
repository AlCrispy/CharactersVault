import { describe, expect, it } from 'vitest';
import { loadCharacter } from './load';
import { createRegistry } from './registry';
import { testSystem } from './testSystem';
import type { CharacterRecord } from './types';

const reg = createRegistry();
reg.register(testSystem);

function record(patch: Partial<CharacterRecord>): CharacterRecord {
  return {
    id: 'r1',
    systemId: 'test',
    schemaVersion: 2,
    name: 'Ada',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    data: { name: 'Ada', hp: 7 },
    ...patch,
  };
}

describe('loadCharacter', () => {
  it('carica un record valido', () => {
    const r = loadCharacter(record({}), reg);
    expect(r).toEqual({ status: 'ok', system: testSystem, data: { name: 'Ada', hp: 7 } });
  });

  it('applica le migrazioni', () => {
    const r = loadCharacter(record({ schemaVersion: 1, data: { name: 'Ada' } }), reg);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.data).toEqual({ name: 'Ada', hp: 1 });
  });

  it('segnala sistema sconosciuto', () => {
    expect(loadCharacter(record({ systemId: 'boh' }), reg)).toEqual({ status: 'unknownSystem', systemId: 'boh' });
  });

  it('segnala dati danneggiati', () => {
    const r = loadCharacter(record({ data: { name: 3 } }), reg);
    expect(r.status).toBe('damaged');
  });

  it('segnala versione troppo recente come danneggiata', () => {
    const r = loadCharacter(record({ schemaVersion: 9 }), reg);
    expect(r.status).toBe('damaged');
    if (r.status === 'damaged') expect(r.error).toContain('troppo nuovo');
  });
});
