import { z } from 'zod';
import { newId } from './id';
import { registry as defaultRegistry, type Registry } from './registry';
import type { CharacterRecord } from './types';

export const EXPORT_FORMAT = 'characters-vault';
export const EXPORT_VERSION = 1;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  characters: CharacterRecord[];
}

/** Errore che riguarda il file intero; il messaggio è pensato per l'utente. */
export class ImportError extends Error {}

export interface ImportIssue {
  name: string;
  error: string;
}

export interface ParsedImport {
  records: CharacterRecord[];
  issues: ImportIssue[];
}

const fileSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.number().int(),
  exportedAt: z.string(),
  characters: z.array(z.unknown()),
});

const recordSchema = z.object({
  id: z.string().min(1),
  systemId: z.string(),
  schemaVersion: z.number().int(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  data: z.unknown(),
  locked: z.boolean().optional(),
});

export function buildExportFile(records: CharacterRecord[], now = new Date()): ExportFile {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: now.toISOString(), characters: records };
}

export function serializeExport(file: ExportFile): string {
  return JSON.stringify(file, null, 2);
}

export function exportFileName(records: CharacterRecord[], now = new Date()): string {
  if (records.length === 1) {
    const base = records[0].name
      .replace(/[\\/:*?"<>|]+/g, '')
      .trim()
      .replace(/\s+/g, '-');
    return `${base || 'personaggio'}.json`;
  }
  return `characters-vault-backup-${now.toISOString().slice(0, 10)}.json`;
}

export function parseImportFile(text: string, reg: Registry = defaultRegistry): ParsedImport {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ImportError('Il file non è un JSON valido.');
  }
  const file = fileSchema.safeParse(json);
  if (!file.success) throw new ImportError('Il file non è un export di Characters Vault.');
  if (file.data.version > EXPORT_VERSION) {
    throw new ImportError(`Versione del file (${file.data.version}) non supportata: aggiorna l'app.`);
  }

  const records: CharacterRecord[] = [];
  const issues: ImportIssue[] = [];
  file.data.characters.forEach((raw, i) => {
    const parsed = recordSchema.safeParse(raw);
    if (!parsed.success) {
      issues.push({ name: `Personaggio #${i + 1}`, error: 'Struttura del record non valida.' });
      return;
    }
    const r = parsed.data;
    const system = reg.get(r.systemId);
    if (!system) {
      issues.push({ name: r.name, error: `Sistema di gioco sconosciuto: ${r.systemId}` });
      return;
    }
    try {
      const data = system.validate(system.migrate(r.data, r.schemaVersion));
      records.push({ ...r, data, schemaVersion: system.schemaVersion, name: system.getName(data) });
    } catch (e) {
      issues.push({ name: r.name, error: e instanceof Error ? e.message : String(e) });
    }
  });
  return { records, issues };
}

export function splitConflicts(records: CharacterRecord[], existing: ReadonlySet<string>) {
  return {
    fresh: records.filter((r) => !existing.has(r.id)),
    conflicting: records.filter((r) => existing.has(r.id)),
  };
}

export function asCopy(record: CharacterRecord, now = new Date()): CharacterRecord {
  const ts = now.toISOString();
  return { ...record, id: newId(), createdAt: ts, updatedAt: ts };
}
