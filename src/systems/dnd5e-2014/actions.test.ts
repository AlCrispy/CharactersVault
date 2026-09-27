import { describe, expect, it } from 'vitest';
import { applyDamage, applyHealing, longRest, setTempHp, shortRest } from './actions';
import { createBlank, newClass, newFeature, type Dnd5eCharacter } from './model';

function char(mut: (c: Dnd5eCharacter) => void): Dnd5eCharacter {
  const c = createBlank();
  mut(c);
  return c;
}

const noSpend = { d6: 0, d8: 0, d10: 0, d12: 0 };

describe('danno e cura', () => {
  const base = char((c) => { c.hp = { max: 20, current: 20, temp: 5 }; });

  it('il danno scala prima i PF temporanei', () => {
    expect(applyDamage(base, 3).hp).toEqual({ max: 20, current: 20, temp: 2 });
    expect(applyDamage(base, 8).hp).toEqual({ max: 20, current: 17, temp: 0 });
  });

  it('i PF non scendono sotto zero', () => {
    expect(applyDamage(base, 100).hp).toEqual({ max: 20, current: 0, temp: 0 });
  });

  it('non muta i dati originali', () => {
    applyDamage(base, 8);
    expect(base.hp).toEqual({ max: 20, current: 20, temp: 5 });
  });

  it('la cura non supera il massimo e non tocca i temporanei', () => {
    const hurt = char((c) => { c.hp = { max: 20, current: 5, temp: 3 }; });
    expect(applyHealing(hurt, 4).hp).toEqual({ max: 20, current: 9, temp: 3 });
    expect(applyHealing(hurt, 50).hp).toEqual({ max: 20, current: 20, temp: 3 });
  });

  it('valori negativi vengono ignorati', () => {
    expect(applyDamage(base, -5).hp).toEqual(base.hp);
    expect(applyHealing(base, -5).hp).toEqual(base.hp);
  });

  it('i PF temporanei si impostano, non si sommano', () => {
    expect(setTempHp(base, 8).hp.temp).toBe(8);
    expect(setTempHp(base, -1).hp.temp).toBe(0);
  });
});

describe('riposo breve', () => {
  const c = char((c) => {
    c.classes = [{ ...newClass(), level: 5, hitDie: 8 }];
    c.hitDiceUsed.d8 = 1;
    c.hp = { max: 40, current: 10, temp: 0 };
    c.spellcasting.slots[0] = { max: 4, used: 3 };
    c.spellcasting.pact = { slotLevel: 3, max: 2, used: 2 };
    c.features = [
      { ...newFeature(), uses: { max: 1, used: 1, recharge: 'short' } },
      { ...newFeature(), uses: { max: 1, used: 1, recharge: 'long' } },
    ];
  });

  it('spende dadi vita e recupera PF', () => {
    const r = shortRest(c, { spend: { ...noSpend, d8: 2 }, hpRecovered: 12 });
    expect(r.hitDiceUsed.d8).toBe(3);
    expect(r.hp.current).toBe(22);
  });

  it('non spende più dadi di quelli disponibili', () => {
    const r = shortRest(c, { spend: { ...noSpend, d8: 10, d12: 3 }, hpRecovered: 0 });
    expect(r.hitDiceUsed.d8).toBe(5);
    expect(r.hitDiceUsed.d12).toBe(0);
  });

  it('i PF recuperati non superano il massimo', () => {
    expect(shortRest(c, { spend: noSpend, hpRecovered: 999 }).hp.current).toBe(40);
  });

  it('ripristina privilegi a riposo breve e slot del patto, non gli altri', () => {
    const r = shortRest(c, { spend: noSpend, hpRecovered: 0 });
    expect(r.features[0].uses?.used).toBe(0);
    expect(r.features[1].uses?.used).toBe(1);
    expect(r.spellcasting.pact.used).toBe(0);
    expect(r.spellcasting.slots[0].used).toBe(3);
  });
});

describe('riposo lungo', () => {
  const c = char((c) => {
    c.classes = [
      { ...newClass(), level: 3, hitDie: 10 },
      { ...newClass(), level: 2, hitDie: 6 },
    ];
    c.hitDiceUsed = { d6: 2, d8: 0, d10: 3, d12: 0 };
    c.hp = { max: 40, current: 3, temp: 4 };
    c.spellcasting.slots[0] = { max: 4, used: 4 };
    c.spellcasting.slots[2] = { max: 2, used: 1 };
    c.spellcasting.pact = { slotLevel: 1, max: 1, used: 1 };
    c.features = [
      { ...newFeature(), uses: { max: 1, used: 1, recharge: 'short' } },
      { ...newFeature(), uses: { max: 1, used: 1, recharge: 'long' } },
      { ...newFeature(), uses: { max: 1, used: 1, recharge: 'none' } },
      newFeature(),
    ];
    c.deathSaves = { successes: 2, failures: 1 };
    c.exhaustion = 2;
  });

  it('ripristina PF e azzera i temporanei', () => {
    expect(longRest(c).hp).toEqual({ max: 40, current: 40, temp: 0 });
  });

  it('recupera metà dei dadi vita partendo dai più grandi', () => {
    expect(longRest(c).hitDiceUsed).toEqual({ d6: 2, d8: 0, d10: 1, d12: 0 });
  });

  it('recupera almeno un dado vita', () => {
    const lvl1 = char((c) => {
      c.classes = [{ ...newClass(), level: 1, hitDie: 12 }];
      c.hitDiceUsed.d12 = 1;
    });
    expect(longRest(lvl1).hitDiceUsed.d12).toBe(0);
  });

  it('ripristina slot e privilegi breve/lungo', () => {
    const r = longRest(c);
    expect(r.spellcasting.slots.every((s) => s.used === 0)).toBe(true);
    expect(r.spellcasting.pact.used).toBe(0);
    expect(r.features.map((f) => f.uses?.used ?? null)).toEqual([0, 0, 1, null]);
  });

  it('azzera i tiri contro morte e riduce lo sfinimento', () => {
    const r = longRest(c);
    expect(r.deathSaves).toEqual({ successes: 0, failures: 0 });
    expect(r.exhaustion).toBe(1);
    expect(longRest({ ...c, exhaustion: 0 }).exhaustion).toBe(0);
  });
});
