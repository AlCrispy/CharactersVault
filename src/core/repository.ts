import { db } from './db';
import { newId } from './id';
import { loadCharacter } from './load';
import type { CharacterRecord, GameSystem } from './types';

export function listCharacters(): Promise<CharacterRecord[]> {
  return db.characters.orderBy('updatedAt').reverse().toArray();
}

export function getCharacter(id: string): Promise<CharacterRecord | undefined> {
  return db.characters.get(id);
}

export async function createCharacter<T>(system: GameSystem<T>, name: string, now = new Date()): Promise<CharacterRecord> {
  const data = system.withName(system.createBlank(), name.trim());
  const ts = now.toISOString();
  const record: CharacterRecord = {
    id: newId(),
    systemId: system.id,
    schemaVersion: system.schemaVersion,
    name: system.getName(data),
    createdAt: ts,
    updatedAt: ts,
    data,
  };
  await db.characters.add(record);
  return record;
}

export async function saveCharacterData<T>(id: string, system: GameSystem<T>, data: T, now = new Date()): Promise<void> {
  const updated = await db.characters.update(id, {
    data,
    name: system.getName(data),
    schemaVersion: system.schemaVersion,
    updatedAt: now.toISOString(),
  });
  if (updated === 0) throw new Error(`Personaggio non trovato: ${id}`);
}

/** Blocca o sblocca la scheda. Non è una modifica del personaggio: `updatedAt` resta invariato. */
export async function setCharacterLocked(id: string, locked: boolean): Promise<void> {
  const updated = await db.characters.update(id, { locked });
  if (updated === 0) throw new Error(`Personaggio non trovato: ${id}`);
}

export async function deleteCharacter(id: string): Promise<void> {
  await db.characters.delete(id);
}

export async function duplicateCharacter(id: string, now = new Date()): Promise<CharacterRecord> {
  const source = await db.characters.get(id);
  if (!source) throw new Error(`Personaggio non trovato: ${id}`);
  const name = `${source.name} (copia)`;
  const loaded = loadCharacter(source);
  const ts = now.toISOString();
  const copy: CharacterRecord =
    loaded.status === 'ok'
      ? { ...source, data: loaded.system.withName(loaded.data, name), schemaVersion: loaded.system.schemaVersion }
      : { ...source, data: JSON.parse(JSON.stringify(source.data)) };
  // La copia nasce sbloccata: è una nuova scheda da modificare.
  Object.assign(copy, { id: newId(), name, createdAt: ts, updatedAt: ts, locked: false });
  await db.characters.add(copy);
  return copy;
}

export async function putCharacters(records: CharacterRecord[]): Promise<void> {
  await db.characters.bulkPut(records);
}

export async function existingIds(): Promise<Set<string>> {
  return new Set(await db.characters.toCollection().primaryKeys());
}
