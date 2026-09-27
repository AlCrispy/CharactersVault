import { describe, expect, it } from 'vitest';
import {
  asCopy,
  buildExportFile,
  exportFileName,
  ImportError,
  parseImportFile,
  serializeExport,
  splitConflicts,
} from './importExport';
import { createRegistry } from './registry';
import { testSystem } from './testSystem';
import type { CharacterRecord } from './types';

const reg = createRegistry();
reg.register(testSystem);
const now = new Date('2026-09-27T10:00:00.000Z');

function rec(patch: Partial<CharacterRecord> = {}): CharacterRecord {
  return {
    id: 'r1',
    systemId: 'test',
    schemaVersion: 2,
    name: 'Ada',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    data: { name: 'Ada', hp: 3 },
    ...patch,
  };
}

function fileWith(characters: unknown[]): string {
  return JSON.stringify({ format: 'characters-vault', version: 1, exportedAt: now.toISOString(), characters });
}

describe('export', () => {
  it('costruisce il file', () => {
    expect(buildExportFile([rec()], now)).toEqual({
      format: 'characters-vault',
      version: 1,
      exportedAt: '2026-09-27T10:00:00.000Z',
      characters: [rec()],
    });
  });

  it('nome file per un personaggio', () => {
    expect(exportFileName([rec({ name: 'Ada: la "grande"' })], now)).toBe('Ada-la-grande.json');
    expect(exportFileName([rec({ name: '  ' })], now)).toBe('personaggio.json');
  });

  it('nome file per il backup', () => {
    expect(exportFileName([rec(), rec({ id: 'r2' })], now)).toBe('characters-vault-backup-2026-09-27.json');
  });
});

describe('import', () => {
  it('andata e ritorno', () => {
    const text = serializeExport(buildExportFile([rec()], now));
    expect(parseImportFile(text, reg)).toEqual({ records: [rec()], issues: [] });
  });

  it('JSON non valido', () => {
    expect(() => parseImportFile('{non json', reg)).toThrow(ImportError);
  });

  it('formato sconosciuto', () => {
    expect(() => parseImportFile('{"foo":1}', reg)).toThrow(/non è un export/);
  });

  it('versione del file più recente', () => {
    const text = JSON.stringify({ format: 'characters-vault', version: 2, exportedAt: '', characters: [] });
    expect(() => parseImportFile(text, reg)).toThrow(/non supportata/);
  });

  it('migra i record vecchi', () => {
    const { records } = parseImportFile(fileWith([rec({ schemaVersion: 1, data: { name: 'Ada' } })]), reg);
    expect(records[0]).toMatchObject({ schemaVersion: 2, data: { name: 'Ada', hp: 1 } });
  });

  it('scarta i record non validi mantenendo quelli validi', () => {
    const { records, issues } = parseImportFile(
      fileWith([
        rec(),
        rec({ id: 'r2', name: 'Rotto', data: { name: 5 } }),
        rec({ id: 'r3', name: 'Alieno', systemId: 'boh' }),
        { foo: 1 },
      ]),
      reg,
    );
    expect(records.map((r) => r.id)).toEqual(['r1']);
    expect(issues.map((i) => i.name)).toEqual(['Rotto', 'Alieno', 'Personaggio #4']);
    expect(issues[1].error).toContain('boh');
  });
});

describe('conflitti', () => {
  it('separa nuovi ed esistenti', () => {
    const a = rec({ id: 'a' });
    const b = rec({ id: 'b' });
    expect(splitConflicts([a, b], new Set(['b']))).toEqual({ fresh: [a], conflicting: [b] });
  });

  it('asCopy crea un nuovo id e nuove date', () => {
    const copy = asCopy(rec(), now);
    expect(copy.id).not.toBe('r1');
    expect(copy).toMatchObject({ name: 'Ada', createdAt: now.toISOString(), updatedAt: now.toISOString() });
  });
});
