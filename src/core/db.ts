import Dexie, { type EntityTable } from 'dexie';
import type { CharacterRecord } from './types';

export class VaultDB extends Dexie {
  characters!: EntityTable<CharacterRecord, 'id'>;

  constructor(name = 'characters-vault') {
    super(name);
    this.version(1).stores({ characters: 'id, updatedAt' });
  }
}

export const db = new VaultDB();
