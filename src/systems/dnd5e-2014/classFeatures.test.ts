import { describe, expect, it } from 'vitest';
import { classResources, classStats, rechargeClassResources } from './classFeatures';
import type { ClassId } from './classes';
import { createBlank, newClass, type Dnd5eCharacter } from './model';

function withClasses(entries: [ClassId, number][], mut: (c: Dnd5eCharacter) => void = () => {}) {
  const c = createBlank();
  c.classes = entries.map(([classId, level]) => ({ ...newClass(), classId, level }));
  mut(c);
  return c;
}

const maxOf = (c: Dnd5eCharacter) => Object.fromEntries(classResources(c).map((r) => [r.id, r.max]));

describe('risorse di classe', () => {
  it('nessuna senza classe', () => {
    expect(classResources(createBlank())).toEqual([]);
    expect(classStats(createBlank())).toEqual([]);
  });

  it.each<[ClassId, number, Record<string, number>]>([
    ['barbarian', 1, { rage: 2 }],
    ['barbarian', 12, { rage: 5 }],
    ['barbarian', 20, {}],
    ['cleric', 1, {}],
    ['cleric', 6, { channelDivinity: 2 }],
    ['druid', 2, { wildShape: 2 }],
    ['fighter', 1, { secondWind: 1 }],
    ['fighter', 17, { secondWind: 1, actionSurge: 2, indomitable: 3 }],
    ['monk', 1, {}],
    ['monk', 7, { ki: 7 }],
    ['paladin', 4, { layOnHands: 20, divineSense: 1, channelDivinity: 1 }],
    ['ranger', 10, {}],
    ['sorcerer', 5, { sorceryPoints: 5 }],
    ['warlock', 15, { mysticArcanum6: 1, mysticArcanum7: 1, mysticArcanum8: 1 }],
    ['wizard', 3, { arcaneRecovery: 1 }],
    ['artificer', 7, { flashOfGenius: 1 }],
  ])('%s %i', (classId, level, expected) => {
    expect(maxOf(withClasses([[classId, level]]))).toEqual(expected);
  });

  it('usi basati sulle caratteristiche (minimo 1)', () => {
    expect(maxOf(withClasses([['bard', 1]], (c) => { c.abilities.cha = 16; }))).toEqual({ bardicInspiration: 3 });
    expect(maxOf(withClasses([['bard', 1]], (c) => { c.abilities.cha = 6; }))).toEqual({ bardicInspiration: 1 });
    expect(maxOf(withClasses([['paladin', 1]], (c) => { c.abilities.cha = 14; })).divineSense).toBe(3);
  });

  it("l'ispirazione bardica si ricarica a riposo breve dal 5° livello", () => {
    expect(classResources(withClasses([['bard', 4]]))[0].recharge).toBe('long');
    expect(classResources(withClasses([['bard', 5]]))[0].recharge).toBe('short');
  });

  it('incanalare divinità da due classi non si somma', () => {
    const c = withClasses([['cleric', 6], ['paladin', 3]]);
    expect(classResources(c).filter((r) => r.id === 'channelDivinity')).toHaveLength(1);
    expect(maxOf(c).channelDivinity).toBe(2);
  });

  it('valori derivati', () => {
    const c = withClasses([['monk', 5], ['rogue', 5]], (c) => { c.abilities.wis = 16; });
    expect(classStats(c)).toEqual([
      { label: 'Arti marziali', value: 'd6' },
      { label: 'CD ki', value: '15' },
      { label: 'Attacco furtivo', value: '3d6' },
    ]);
  });
});

describe('ricarica risorse', () => {
  const c = withClasses([['fighter', 9]], (c) => {
    c.classResourcesUsed = { secondWind: 1, actionSurge: 1, indomitable: 1, stale: 2 };
  });

  it('riposo breve: solo quelle a riposo breve', () => {
    expect(rechargeClassResources(c, 'short')).toEqual({ indomitable: 1, stale: 2 });
  });

  it('riposo lungo: tutte', () => {
    expect(rechargeClassResources(c, 'long')).toEqual({});
  });
});
