import { z } from 'zod';
import { newId } from '../../core/id';
import { CLASS_IDS } from './classes';

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type Ability = (typeof ABILITIES)[number];

export const SKILL_ABILITY = {
  acrobatics: 'dex',
  animalHandling: 'wis',
  arcana: 'int',
  athletics: 'str',
  deception: 'cha',
  history: 'int',
  insight: 'wis',
  intimidation: 'cha',
  investigation: 'int',
  medicine: 'wis',
  nature: 'int',
  perception: 'wis',
  performance: 'cha',
  persuasion: 'cha',
  religion: 'int',
  sleightOfHand: 'dex',
  stealth: 'dex',
  survival: 'wis',
} as const satisfies Record<string, Ability>;
export type Skill = keyof typeof SKILL_ABILITY;
export const SKILLS = Object.keys(SKILL_ABILITY) as Skill[];

export const HIT_DICE = [6, 8, 10, 12] as const;
export type HitDie = (typeof HIT_DICE)[number];
export const HIT_DIE_KEYS = ['d6', 'd8', 'd10', 'd12'] as const;
export type HitDieKey = (typeof HIT_DIE_KEYS)[number];
export function hitDieKey(d: HitDie): HitDieKey {
  return `d${d}`;
}

export const ARMOR_TYPES = ['none', 'light', 'medium', 'heavy', 'unarmoredBarbarian', 'unarmoredMonk'] as const;
export type ArmorType = (typeof ARMOR_TYPES)[number];

export const PROFICIENCY_LEVELS = ['none', 'proficient', 'expertise'] as const;
export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

export const RECHARGE_TYPES = ['short', 'long', 'none'] as const;
export type Recharge = (typeof RECHARGE_TYPES)[number];

export const COINS = ['cp', 'sp', 'ep', 'gp', 'pp'] as const;
export type Coin = (typeof COINS)[number];

const int = (min: number, max: number) => z.number().int().min(min).max(max);
const bonus = int(-99, 99);
const count = int(0, 9_999_999);

const classSchema = z.object({
  id: z.string(),
  /** `null` finché la classe non è stata scelta. */
  classId: z.enum(CLASS_IDS).nullable(),
  subclass: z.string(),
  level: int(1, 20),
});

const attackSchema = z.object({
  id: z.string(),
  name: z.string(),
  ability: z.enum(ABILITIES),
  proficient: z.boolean(),
  attackBonus: bonus,
  damageDice: z.string(),
  addModToDamage: z.boolean(),
  damageBonus: bonus,
  damageType: z.string(),
  notes: z.string(),
});

const spellSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: int(0, 9),
  prepared: z.boolean(),
  /** Lanciabile come rituale (alcune classi, es. il mago, possono farlo anche senza averlo preparato). Assente nei dati vecchi. */
  ritual: z.boolean().default(false),
  notes: z.string(),
});

const featureSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.string(),
  description: z.string(),
  uses: z.object({ max: int(0, 99), used: int(0, 99), recharge: z.enum(RECHARGE_TYPES) }).nullable(),
});

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().min(0).max(99_999),
  weightKg: z.number().min(0).max(99_999),
  equipped: z.boolean(),
  notes: z.string(),
});

const skillKeys = SKILLS as [Skill, ...Skill[]];

export const dnd5eSchema = z.object({
  name: z.string(),
  race: z.string(),
  background: z.string(),
  alignment: z.string(),
  xp: count,
  inspiration: z.boolean(),
  classes: z.array(classSchema),
  abilities: z.record(z.enum(ABILITIES), int(1, 30)),
  saveProficiencies: z.record(z.enum(ABILITIES), z.boolean()),
  skills: z.record(z.enum(skillKeys), z.object({ level: z.enum(PROFICIENCY_LEVELS), bonus })),
  otherProficiencies: z.object({
    languages: z.string(),
    tools: z.string(),
    weapons: z.string(),
    armor: z.string(),
  }),
  armor: z.object({ type: z.enum(ARMOR_TYPES), base: int(0, 30), shield: z.boolean(), bonus }),
  initiativeBonus: bonus,
  speedMeters: z.number().min(0).max(999),
  hp: z.object({ max: int(0, 999), current: int(0, 999), temp: int(0, 999) }),
  deathSaves: z.object({ successes: int(0, 3), failures: int(0, 3) }),
  exhaustion: int(0, 6),
  /** Usi spesi delle risorse di classe (classFeatures.ts), per id. */
  classResourcesUsed: z.record(z.string(), int(0, 999)),
  hitDiceUsed: z.record(z.enum(HIT_DIE_KEYS), int(0, 20)),
  attacks: z.array(attackSchema),
  spellcasting: z.object({
    ability: z.enum(ABILITIES).nullable(),
    // I massimi derivano dalle classi (rules.ts): qui solo gli slot spesi.
    slotsUsed: z.array(int(0, 99)).length(9),
    pactUsed: int(0, 99),
    spells: z.array(spellSchema),
  }),
  features: z.array(featureSchema),
  inventory: z.object({
    items: z.array(itemSchema),
    coins: z.record(z.enum(COINS), count),
  }),
  notes: z.object({
    traits: z.string(),
    ideals: z.string(),
    bonds: z.string(),
    flaws: z.string(),
    free: z.string(),
  }),
});

export type Dnd5eCharacter = z.infer<typeof dnd5eSchema>;
export type ClassEntry = Dnd5eCharacter['classes'][number];
export type Attack = Dnd5eCharacter['attacks'][number];
export type Spellcasting = Dnd5eCharacter['spellcasting'];
export type Spell = Spellcasting['spells'][number];
export type Feature = Dnd5eCharacter['features'][number];
export type Inventory = Dnd5eCharacter['inventory'];
export type Item = Inventory['items'][number];
export type Coins = Inventory['coins'];

export function newClass(): ClassEntry {
  return { id: newId(), classId: null, subclass: '', level: 1 };
}

export function newAttack(): Attack {
  return {
    id: newId(),
    name: '',
    ability: 'str',
    proficient: true,
    attackBonus: 0,
    damageDice: '1d6',
    addModToDamage: true,
    damageBonus: 0,
    damageType: '',
    notes: '',
  };
}

export function newSpell(): Spell {
  return { id: newId(), name: '', level: 0, prepared: false, ritual: false, notes: '' };
}

export function newFeature(): Feature {
  return { id: newId(), name: '', source: '', description: '', uses: null };
}

export function newItem(): Item {
  return { id: newId(), name: '', quantity: 1, weightKg: 0, equipped: false, notes: '' };
}

export function createBlank(): Dnd5eCharacter {
  return {
    name: '',
    race: '',
    background: '',
    alignment: '',
    xp: 0,
    inspiration: false,
    classes: [newClass()],
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saveProficiencies: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
    skills: Object.fromEntries(SKILLS.map((s) => [s, { level: 'none', bonus: 0 }])) as Dnd5eCharacter['skills'],
    otherProficiencies: { languages: '', tools: '', weapons: '', armor: '' },
    armor: { type: 'none', base: 10, shield: false, bonus: 0 },
    initiativeBonus: 0,
    speedMeters: 9,
    hp: { max: 10, current: 10, temp: 0 },
    deathSaves: { successes: 0, failures: 0 },
    exhaustion: 0,
    classResourcesUsed: {},
    hitDiceUsed: { d6: 0, d8: 0, d10: 0, d12: 0 },
    attacks: [],
    spellcasting: {
      ability: null,
      slotsUsed: Array.from({ length: 9 }, () => 0),
      pactUsed: 0,
      spells: [],
    },
    features: [],
    inventory: { items: [], coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } },
    notes: { traits: '', ideals: '', bonds: '', flaws: '', free: '' },
  };
}
