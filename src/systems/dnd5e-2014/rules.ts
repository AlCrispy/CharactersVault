import { CLASSES, FULL_CASTER_SLOTS, normalizeName, pactSlotsForLevel, type CasterProgression } from './classes';
import {
  hitDieKey,
  SKILL_ABILITY,
  type Ability,
  type Attack,
  type ClassEntry,
  type Coins,
  type Dnd5eCharacter,
  type HitDieKey,
  type Skill,
} from './model';

const KG_PER_COIN = 0.01;
const KG_PER_STR = 7.5;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function totalLevel(c: Dnd5eCharacter): number {
  return Math.max(1, c.classes.reduce((sum, k) => sum + k.level, 0));
}

export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}

function pb(c: Dnd5eCharacter): number {
  return proficiencyBonus(totalLevel(c));
}

function mod(c: Dnd5eCharacter, a: Ability): number {
  return abilityModifier(c.abilities[a]);
}

/** Factotum: privilegio del Bardo dal 2° livello. */
export function hasJackOfAllTrades(c: Dnd5eCharacter): boolean {
  return c.classes.reduce((sum, k) => sum + (k.classId === 'bard' ? k.level : 0), 0) >= 2;
}

function jackBonus(c: Dnd5eCharacter): number {
  return hasJackOfAllTrades(c) ? Math.floor(pb(c) / 2) : 0;
}

export function savingThrow(c: Dnd5eCharacter, a: Ability): number {
  return mod(c, a) + (c.saveProficiencies[a] ? pb(c) : 0);
}

export function skillBonus(c: Dnd5eCharacter, s: Skill): number {
  const { level, bonus } = c.skills[s];
  const prof = level === 'expertise' ? 2 * pb(c) : level === 'proficient' ? pb(c) : jackBonus(c);
  return mod(c, SKILL_ABILITY[s]) + prof + bonus;
}

export function passivePerception(c: Dnd5eCharacter): number {
  return 10 + skillBonus(c, 'perception');
}

export function initiative(c: Dnd5eCharacter): number {
  return mod(c, 'dex') + jackBonus(c) + c.initiativeBonus;
}

export function armorClass(c: Dnd5eCharacter): number {
  const dex = mod(c, 'dex');
  const { type, base, shield, bonus } = c.armor;
  let ac: number;
  switch (type) {
    case 'none':
      ac = 10 + dex;
      break;
    case 'light':
      ac = base + dex;
      break;
    case 'medium':
      ac = base + Math.min(dex, 2);
      break;
    case 'heavy':
      ac = base;
      break;
    case 'unarmoredBarbarian':
      ac = 10 + dex + mod(c, 'con');
      break;
    case 'unarmoredMonk':
      ac = 10 + dex + mod(c, 'wis');
      break;
  }
  return ac + (shield ? 2 : 0) + bonus;
}

export function attackToHit(c: Dnd5eCharacter, a: Attack): number {
  return mod(c, a.ability) + (a.proficient ? pb(c) : 0) + a.attackBonus;
}

export function attackDamage(c: Dnd5eCharacter, a: Attack): string {
  const flat = (a.addModToDamage ? mod(c, a.ability) : 0) + a.damageBonus;
  const dice = a.damageDice.trim();
  if (!dice) return String(flat);
  if (flat === 0) return dice;
  return `${dice} ${flat > 0 ? '+' : '-'} ${Math.abs(flat)}`;
}

export function spellSaveDC(c: Dnd5eCharacter): number | null {
  const a = c.spellcasting.ability;
  return a ? 8 + pb(c) + mod(c, a) : null;
}

export function spellAttackBonus(c: Dnd5eCharacter): number | null {
  const a = c.spellcasting.ability;
  return a ? pb(c) + mod(c, a) : null;
}

export function hitDiceTotals(c: Dnd5eCharacter): Record<HitDieKey, number> {
  const totals: Record<HitDieKey, number> = { d6: 0, d8: 0, d10: 0, d12: 0 };
  for (const k of c.classes) if (k.classId) totals[hitDieKey(CLASSES[k.classId].hitDie)] += k.level;
  return totals;
}

function isThirdCaster(k: ClassEntry): boolean {
  const third = k.classId && CLASSES[k.classId].thirdCaster;
  if (!third) return false;
  const sub = normalizeName(k.subclass);
  return third.aliases.some((a) => sub.includes(a));
}

export function casterProgression(k: ClassEntry): CasterProgression {
  if (!k.classId) return 'none';
  return isThirdCaster(k) ? 'third' : CLASSES[k.classId].progression;
}

/** Caratteristica da incantatore suggerita dalla classe (anche per Cavaliere Mistico / Mistificatore Arcano). */
export function classSpellAbility(k: ClassEntry): Ability | null {
  if (!k.classId) return null;
  const info = CLASSES[k.classId];
  return isThirdCaster(k) && info.thirdCaster ? info.thirdCaster.spellAbility : info.spellAbility;
}

/** Livello minimo in cui la classe ottiene il privilegio Incantesimi. */
const MIN_CASTER_LEVEL: Partial<Record<CasterProgression, number>> = { full: 1, artificer: 1, half: 2, third: 3 };

/**
 * Livello da incantatore per la tabella degli slot (PHB cap. 6, Multiclasse).
 * Con una sola classe incantatrice si usa la sua tabella (arrotondata per eccesso),
 * con più classi la somma arrotondata per difetto (l'artefice arrotonda sempre per eccesso).
 */
export function casterLevel(c: Dnd5eCharacter): number {
  const casters = c.classes
    .map((k) => ({ level: k.level, prog: casterProgression(k) }))
    .filter(({ level, prog }) => level >= (MIN_CASTER_LEVEL[prog] ?? Infinity));
  if (casters.length === 1) {
    const { level, prog } = casters[0];
    return prog === 'full' ? level : prog === 'third' ? Math.ceil(level / 3) : Math.ceil(level / 2);
  }
  return casters.reduce((sum, { level, prog }) => {
    switch (prog) {
      case 'full':
        return sum + level;
      case 'artificer':
        return sum + Math.ceil(level / 2);
      case 'half':
        return sum + Math.floor(level / 2);
      default:
        return sum + Math.floor(level / 3);
    }
  }, 0);
}

/** Slot massimi per livello 1°–9° (esclusa la Magia del patto). */
export function spellSlots(c: Dnd5eCharacter): number[] {
  const row = FULL_CASTER_SLOTS[Math.min(20, casterLevel(c))];
  return Array.from({ length: 9 }, (_, i) => row[i] ?? 0);
}

export function pactSlots(c: Dnd5eCharacter): { max: number; slotLevel: number } | null {
  const level = c.classes.reduce((sum, k) => sum + (casterProgression(k) === 'pact' ? k.level : 0), 0);
  return pactSlotsForLevel(Math.min(20, level));
}

export function coinCount(coins: Coins): number {
  return coins.cp + coins.sp + coins.ep + coins.gp + coins.pp;
}

export function totalWeightKg(c: Dnd5eCharacter): number {
  const items = c.inventory.items.reduce((sum, i) => sum + i.quantity * i.weightKg, 0);
  return round2(items + coinCount(c.inventory.coins) * KG_PER_COIN);
}

export function carryingCapacityKg(c: Dnd5eCharacter): number {
  return round2(c.abilities.str * KG_PER_STR);
}

export function summary(c: Dnd5eCharacter): string {
  const classes = c.classes
    .filter((k) => k.classId)
    .map((k) => `${CLASSES[k.classId!].label} ${k.level}`)
    .join(' / ');
  const parts = [c.race.trim(), classes].filter(Boolean);
  return parts.length ? `${parts.join(' · ')} — liv. ${totalLevel(c)}` : `Livello ${totalLevel(c)}`;
}
