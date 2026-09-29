import { HIT_DIE_KEYS, type Dnd5eCharacter, type Feature, type HitDieKey, type Recharge } from './model';
import { rechargeClassResources } from './classFeatures';
import { hitDiceTotals, totalLevel } from './rules';

export interface ShortRestOptions {
  spend: Record<HitDieKey, number>;
  hpRecovered: number;
}

export function applyDamage(c: Dnd5eCharacter, amount: number): Dnd5eCharacter {
  const dmg = Math.max(0, amount);
  const absorbed = Math.min(c.hp.temp, dmg);
  return {
    ...c,
    hp: { ...c.hp, temp: c.hp.temp - absorbed, current: Math.max(0, c.hp.current - (dmg - absorbed)) },
  };
}

export function applyHealing(c: Dnd5eCharacter, amount: number): Dnd5eCharacter {
  const heal = Math.max(0, amount);
  return { ...c, hp: { ...c.hp, current: Math.min(c.hp.max, c.hp.current + heal) } };
}

export function setTempHp(c: Dnd5eCharacter, value: number): Dnd5eCharacter {
  return { ...c, hp: { ...c.hp, temp: Math.max(0, value) } };
}

function rechargeFeatures(features: Feature[], kinds: Recharge[]): Feature[] {
  return features.map((f) => (f.uses && kinds.includes(f.uses.recharge) ? { ...f, uses: { ...f.uses, used: 0 } } : f));
}

export function shortRest(c: Dnd5eCharacter, opts: ShortRestOptions): Dnd5eCharacter {
  const totals = hitDiceTotals(c);
  const hitDiceUsed = { ...c.hitDiceUsed };
  for (const k of HIT_DIE_KEYS) {
    const available = Math.max(0, totals[k] - hitDiceUsed[k]);
    hitDiceUsed[k] += Math.min(available, Math.max(0, opts.spend[k]));
  }
  return {
    ...applyHealing(c, opts.hpRecovered),
    hitDiceUsed,
    features: rechargeFeatures(c.features, ['short']),
    classResourcesUsed: rechargeClassResources(c, 'short'),
    spellcasting: { ...c.spellcasting, pactUsed: 0 },
  };
}

export function longRest(c: Dnd5eCharacter): Dnd5eCharacter {
  let budget = Math.max(1, Math.floor(totalLevel(c) / 2));
  const hitDiceUsed = { ...c.hitDiceUsed };
  for (const k of [...HIT_DIE_KEYS].reverse()) {
    const recovered = Math.min(budget, hitDiceUsed[k]);
    hitDiceUsed[k] -= recovered;
    budget -= recovered;
  }
  return {
    ...c,
    hp: { ...c.hp, current: c.hp.max, temp: 0 },
    hitDiceUsed,
    spellcasting: { ...c.spellcasting, slotsUsed: c.spellcasting.slotsUsed.map(() => 0), pactUsed: 0 },
    features: rechargeFeatures(c.features, ['short', 'long']),
    classResourcesUsed: rechargeClassResources(c, 'long'),
    deathSaves: { successes: 0, failures: 0 },
    exhaustion: Math.max(0, c.exhaustion - 1),
  };
}
