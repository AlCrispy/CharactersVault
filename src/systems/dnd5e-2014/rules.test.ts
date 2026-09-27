import { describe, expect, it } from 'vitest';
import { createBlank, newAttack, newClass, newItem, type Dnd5eCharacter } from './model';
import {
  abilityModifier,
  armorClass,
  attackDamage,
  attackToHit,
  carryingCapacityKg,
  hitDiceTotals,
  initiative,
  passivePerception,
  proficiencyBonus,
  savingThrow,
  skillBonus,
  spellAttackBonus,
  spellSaveDC,
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
      atLevel(5)(c);
      c.jackOfAllTrades = true;
      c.skills.stealth = { level: 'proficient', bonus: 0 };
    });
    expect(skillBonus(c, 'athletics')).toBe(1);
    expect(skillBonus(c, 'stealth')).toBe(3);
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
      atLevel(5)(c);
      c.abilities.dex = 14;
      c.jackOfAllTrades = true;
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
        { ...newClass(), level: 3, hitDie: 10 },
        { ...newClass(), level: 2, hitDie: 6 },
        { ...newClass(), level: 1, hitDie: 10 },
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
        { ...newClass(), name: 'Mago', level: 3 },
        { ...newClass(), name: 'Guerriero', level: 2 },
      ];
    });
    expect(summary(c)).toBe('Elfo · Mago 3 / Guerriero 2 — liv. 5');
  });

  it('senza dati', () => {
    expect(summary(createBlank())).toBe('Livello 1');
  });
});
