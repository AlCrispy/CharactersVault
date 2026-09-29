import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { registry } from './registry';
import {
  createCharacter,
  deleteCharacter,
  duplicateCharacter,
  existingIds,
  getCharacter,
  listCharacters,
  putCharacters,
  saveCharacterData,
  setCharacterLocked,
} from './repository';
import { testSystem } from './testSystem';
import type { CharacterRecord } from './types';

registry.register(testSystem);

const t = (s: string) => new Date(`2026-01-0${s}T00:00:00.000Z`);

beforeEach(async () => {
  await db.characters.clear();
});

describe('repository', () => {
  it('crea un personaggio', async () => {
    const r = await createCharacter(testSystem, '  Ada  ', t('2'));
    expect(r).toMatchObject({
      systemId: 'test',
      schemaVersion: 2,
      name: 'Ada',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      data: { name: 'Ada', hp: 1 },
    });
    expect(await getCharacter(r.id)).toEqual(r);
  });

  it('elenca per ultima modifica, più recente prima', async () => {
    const a = await createCharacter(testSystem, 'A', t('1'));
    const b = await createCharacter(testSystem, 'B', t('2'));
    expect((await listCharacters()).map((r) => r.id)).toEqual([b.id, a.id]);
  });

  it('salva i dati aggiornando nome e data', async () => {
    const r = await createCharacter(testSystem, 'Ada', t('1'));
    await saveCharacterData(r.id, testSystem, { name: 'Bea', hp: 5 }, t('3'));
    expect(await getCharacter(r.id)).toMatchObject({
      name: 'Bea',
      updatedAt: '2026-01-03T00:00:00.000Z',
      data: { name: 'Bea', hp: 5 },
    });
  });

  it('salvare un id inesistente lancia errore', async () => {
    await expect(saveCharacterData('nope', testSystem, { name: 'X', hp: 1 })).rejects.toThrow();
  });

  it('duplica un personaggio', async () => {
    const r = await createCharacter(testSystem, 'Ada', t('1'));
    const copy = await duplicateCharacter(r.id, t('4'));
    expect(copy.id).not.toBe(r.id);
    expect(copy).toMatchObject({ name: 'Ada (copia)', data: { name: 'Ada (copia)', hp: 1 }, createdAt: '2026-01-04T00:00:00.000Z' });
    expect(await listCharacters()).toHaveLength(2);
  });

  it('duplica anche record non caricabili copiando i dati grezzi', async () => {
    const alien: CharacterRecord = {
      id: 'x',
      systemId: 'boh',
      schemaVersion: 1,
      name: 'Alieno',
      createdAt: t('1').toISOString(),
      updatedAt: t('1').toISOString(),
      data: { qualcosa: 1 },
    };
    await putCharacters([alien]);
    const copy = await duplicateCharacter('x');
    expect(copy).toMatchObject({ name: 'Alieno (copia)', systemId: 'boh', data: { qualcosa: 1 } });
  });

  it('elimina e restituisce gli id esistenti', async () => {
    const a = await createCharacter(testSystem, 'A');
    const b = await createCharacter(testSystem, 'B');
    await deleteCharacter(a.id);
    expect(await existingIds()).toEqual(new Set([b.id]));
  });

  it('blocca e sblocca senza toccare la data di modifica', async () => {
    const r = await createCharacter(testSystem, 'Ada', t('1'));
    await setCharacterLocked(r.id, true);
    expect(await getCharacter(r.id)).toMatchObject({ locked: true, updatedAt: r.updatedAt });
    await setCharacterLocked(r.id, false);
    expect((await getCharacter(r.id))?.locked).toBe(false);
  });

  it('la copia di una scheda bloccata nasce sbloccata', async () => {
    const r = await createCharacter(testSystem, 'Ada', t('1'));
    await setCharacterLocked(r.id, true);
    const copy = await duplicateCharacter(r.id, t('2'));
    expect(copy.locked).toBe(false);
  });
});
