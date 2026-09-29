import { describe, expect, it } from 'vitest';
import type { ClassId } from './classes';
import { createBlank, newAttack, newClass, newItem, type Dnd5eCharacter } from './model';
import {
  abilityModifier,
  armorClass,
  attackDamage,
  attackToHit,
  carryingCapacityKg,
  casterLevel,
  classSpellAbility,
  hitDiceTotals,
  initiative,
  pactSlots,
  passivePerception,
  proficiencyBonus,
  savingThrow,
  skillBonus,
  spellAttackBonus,
  spellSaveDC,
  spellSlots,
  summary,
  totalLevel,
  totalWeightKg,
} from './rules';

function char(mut: (c: Dnd5eCharacter) => void = () => {}): Dnd5eCharacter {
  const c = createBlank();
  mut(c);
  return c;
}

function atLevel(level: number) {
  return (c: Dnd5eCharacter) => {
    c.classes = [{ ...newClass(), level }];
  };
}

describe('abilityModifier', () => {
  it.each([
    [1, -5], [8, -1], [9, -1], [10, 0], [11, 0], [12, 1], [15, 2], [30, 10],
  ])('punteggio %i → %i', (score, mod) => {
    expect(abilityModifier(score)).toBe(mod);
  });
});

describe('livello e bonus competenza', () => {
  it.each([
    [1, 2], [4, 2], [5, 3], [8, 3], [9, 4], [12, 4], [13, 5], [16, 5], [17, 6], [20, 6],
  ])('livello %i → +%i', (level, pb) => {
    expect(proficiencyBonus(level)).toBe(pb);
  });

  it('somma i livelli del multiclasse', () => {
    const c = char((c) => {
      c.classes = [{ ...newClass(), level: 3 }, { ...newClass(), level: 2 }];
    });
    expect(totalLevel(c)).toBe(5);
  });

  it('senza classi vale livello 1', () => {
    expect(totalLevel(char((c) => { c.classes = []; }))).toBe(1);
  });
});

describe('tiri salvezza e abilità', () => {
  it('tiro salvezza con e senza competenza', () => {
    const c = char((c) => {
      atLevel(5)(c);
      c.abilities.dex = 14;
    });
    expect(savingThrow(c, 'dex')).toBe(2);
    c.saveProficiencies.dex = true;
    expect(savingThrow(c, 'dex')).toBe(5);
  });

  it('competenza, maestria e bonus extra', () => {
    const c = char((c) => {
      atLevel(5)(c);
      c.abilities.dex = 16;
      c.skills.stealth = { level: 'proficient', bonus: 0 };
      c.skills.acrobatics = { level: 'expertise', bonus: 1 };
    });
    expect(skillBonus(c, 'stealth')).toBe(3 + 3);
    expect(skillBonus(c, 'acrobatics')).toBe(3 + 6 + 1);
    expect(skillBonus(c, 'sleightOfHand')).toBe(3);
  });

  it('factotum aggiunge metà competenza (per difetto) solo senza competenza', () => {
    const c = char((c) => {
      c.classes = [{ ...newClass(), classId: 'bard', level: 5 }];
      c.skills.stealth = { level: 'proficient', bonus: 0 };
    });
    expect(skillBonus(c, 'athletics')).toBe(1);
    expect(skillBonus(c, 'stealth')).toBe(3);
  });

  it('factotum solo dal 2° livello da bardo', () => {
    expect(skillBonus(withClasses(['bard', 1]), 'athletics')).toBe(0);
    expect(skillBonus(withClasses(['bard', 2]), 'athletics')).toBe(1);
  });

  it('percezione passiva', () => {
    const c = char((c) => {
      c.abilities.wis = 14;
      c.skills.perception = { level: 'proficient', bonus: 0 };
    });
    expect(passivePerception(c)).toBe(14);
  });

  it('iniziativa con factotum e bonus', () => {
    const c = char((c) => {
      c.classes = [{ ...newClass(), classId: 'bard', level: 5 }];
      c.abilities.dex = 14;
      c.initiativeBonus = 5;
    });
    expect(initiative(c)).toBe(2 + 1 + 5);
  });
});

describe('classe armatura', () => {
  const withArmor = (type: Dnd5eCharacter['armor']['type'], base: number, dex: number) =>
    char((c) => {
      c.armor = { type, base, shield: false, bonus: 0 };
      c.abilities.dex = dex;
      c.abilities.con = 14;
      c.abilities.wis = 16;
    });

  it('nessuna armatura', () => expect(armorClass(withArmor('none', 0, 14))).toBe(12));
  it('leggera', () => expect(armorClass(withArmor('light', 12, 16))).toBe(15));
  it('media limita la DES a +2', () => expect(armorClass(withArmor('medium', 14, 18))).toBe(16));
  it('media con DES bassa', () => expect(armorClass(withArmor('medium', 14, 8))).toBe(13));
  it('pesante ignora la DES', () => expect(armorClass(withArmor('heavy', 18, 8))).toBe(18));
  it('barbaro', () => expect(armorClass(withArmor('unarmoredBarbarian', 0, 14))).toBe(14));
  it('monaco', () => expect(armorClass(withArmor('unarmoredMonk', 0, 14))).toBe(15));
  it('scudo e bonus', () => {
    const c = withArmor('heavy', 16, 10);
    c.armor.shield = true;
    c.armor.bonus = 1;
    expect(armorClass(c)).toBe(19);
  });
});

describe('attacchi', () => {
  const c = char((c) => { c.abilities.str = 16; });

  it('tiro per colpire', () => {
    expect(attackToHit(c, { ...newAttack(), attackBonus: 1 })).toBe(3 + 2 + 1);
    expect(attackToHit(c, { ...newAttack(), proficient: false })).toBe(3);
  });

  it('danno', () => {
    expect(attackDamage(c, { ...newAttack(), damageDice: '1d8' })).toBe('1d8 + 3');
    expect(attackDamage(c, { ...newAttack(), damageDice: '1d8', addModToDamage: false })).toBe('1d8');
    expect(attackDamage(c, { ...newAttack(), damageDice: ' 2d6 ', damageBonus: -4 })).toBe('2d6 - 1');
    expect(attackDamage(c, { ...newAttack(), damageDice: '' })).toBe('3');
  });
});

describe('incantesimi', () => {
  it('CD e attacco', () => {
    const c = char((c) => {
      atLevel(5)(c);
      c.abilities.int = 16;
      c.spellcasting.ability = 'int';
    });
    expect(spellSaveDC(c)).toBe(14);
    expect(spellAttackBonus(c)).toBe(6);
  });

  it('senza caratteristica da incantatore', () => {
    expect(spellSaveDC(createBlank())).toBeNull();
    expect(spellAttackBonus(createBlank())).toBeNull();
  });
});

describe('dadi vita', () => {
  it('totali per tipo con multiclasse', () => {
    const c = char((c) => {
      c.classes = [
        { ...newClass(), level: 3, classId: 'fighter' },
        { ...newClass(), level: 2, classId: 'wizard' },
        { ...newClass(), level: 1, classId: 'fighter' },
      ];
    });
    expect(hitDiceTotals(c)).toEqual({ d6: 2, d8: 0, d10: 4, d12: 0 });
  });
});

describe('peso', () => {
  it('somma oggetti e monete', () => {
    const c = char((c) => {
      c.inventory.items = [
        { ...newItem(), quantity: 2, weightKg: 1.5 },
        { ...newItem(), quantity: 1, weightKg: 0.5 },
      ];
      c.inventory.coins.gp = 60;
      c.inventory.coins.sp = 40;
    });
    expect(totalWeightKg(c)).toBe(4.5);
  });

  it('capacità di carico', () => {
    expect(carryingCapacityKg(char((c) => { c.abilities.str = 15; }))).toBe(112.5);
  });
});

describe('summary', () => {
  it('razza, classi e livello', () => {
    const c = char((c) => {
      c.race = 'Elfo';
      c.classes = [
        { ...newClass(), classId: 'wizard', level: 3 },
        { ...newClass(), classId: 'fighter', level: 2 },
      ];
    });
    expect(summary(c)).toBe('Elfo · Mago 3 / Guerriero 2 — liv. 5');
  });

  it('senza dati', () => {
    expect(summary(createBlank())).toBe('Livello 1');
  });
});

function withClasses(...entries: [ClassId, number, string?][]) {
  return char((c) => {
    c.classes = entries.map(([classId, level, subclass = '']) => ({ ...newClass(), classId, level, subclass }));
  });
}

describe('slot incantesimo', () => {
  it.each<[string, [ClassId, number, string?][], number]>([
    ['mago 5', [['wizard', 5]], 5],
    ['paladino 1 non ha slot', [['paladin', 1]], 0],
    ['paladino 5 arrotonda per eccesso', [['paladin', 5]], 3],
    ['artefice 1 ha slot', [['artificer', 1]], 1],
    ['guerriero senza sottoclasse', [['fighter', 7]], 0],
    ['cavaliere mistico 7', [['fighter', 7, 'Cavaliere Mistico']], 3],
    ['arcane trickster 4', [['rogue', 4, 'Arcane Trickster']], 2],
    ['multiclasse: mago 3 / paladino 5', [['wizard', 3], ['paladin', 5]], 5],
    ['multiclasse: paladino 3 / ranger 3 per difetto', [['paladin', 3], ['ranger', 3]], 2],
    ['multiclasse: chierico 1 / artefice 3', [['cleric', 1], ['artificer', 3]], 3],
    ['multiclasse con classe non incantatrice', [['paladin', 5], ['fighter', 2]], 3],
    ['il warlock non conta', [['warlock', 5], ['sorcerer', 2]], 2],
  ])('%s', (_, entries, expected) => {
    expect(casterLevel(withClasses(...entries))).toBe(expected);
  });

  it('tabella del mago di 9° livello', () => {
    expect(spellSlots(withClasses(['wizard', 9]))).toEqual([4, 3, 3, 3, 1, 0, 0, 0, 0]);
  });

  it('livello 20', () => {
    expect(spellSlots(withClasses(['cleric', 20]))).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
  });

  it('paladino 20 come incantatore di 10°', () => {
    expect(spellSlots(withClasses(['paladin', 20]))).toEqual([4, 3, 3, 3, 2, 0, 0, 0, 0]);
  });

  it('nessuno slot senza classi incantatrici', () => {
    expect(spellSlots(createBlank()).every((n) => n === 0)).toBe(true);
  });
});

describe('magia del patto', () => {
  it.each([
    [1, 1, 1], [2, 2, 1], [3, 2, 2], [5, 2, 3], [7, 2, 4], [9, 2, 5], [11, 3, 5], [17, 4, 5], [20, 4, 5],
  ])('warlock %i → %i slot di %i°', (level, max, slotLevel) => {
    expect(pactSlots(withClasses(['warlock', level]))).toEqual({ max, slotLevel });
  });

  it('assente senza livelli da warlock', () => {
    expect(pactSlots(withClasses(['wizard', 5]))).toBeNull();
  });
});

describe('caratteristica da incantatore della classe', () => {
  it('dipende da classe e sottoclasse', () => {
    const [cleric, fighter, ek] = withClasses(['cleric', 1], ['fighter', 3], ['fighter', 3, 'Cavaliere mistico']).classes;
    expect(classSpellAbility(cleric)).toBe('wis');
    expect(classSpellAbility(fighter)).toBeNull();
    expect(classSpellAbility(ek)).toBe('int');
  });
});
