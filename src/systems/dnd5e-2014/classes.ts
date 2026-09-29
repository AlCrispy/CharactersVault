import type { Ability, HitDie } from './model';

export const CLASS_IDS = [
  'barbarian',
  'bard',
  'cleric',
  'druid',
  'fighter',
  'monk',
  'paladin',
  'ranger',
  'rogue',
  'sorcerer',
  'warlock',
  'wizard',
  'artificer',
] as const;
export type ClassId = (typeof CLASS_IDS)[number];

/**
 * Progressione degli slot incantesimo:
 * - `full`/`half`/`third`: contano per intero, metà o un terzo nella tabella del multiclasse;
 * - `artificer`: come `half` ma arrotondato per eccesso (ha slot dal 1° livello);
 * - `pact`: Magia del patto, separata dagli altri slot.
 */
export type CasterProgression = 'none' | 'full' | 'half' | 'third' | 'artificer' | 'pact';

interface ClassInfo {
  label: string;
  hitDie: HitDie;
  progression: CasterProgression;
  spellAbility: Ability | null;
  /** Sottoclassi (nomi IT/EN normalizzati) che danno incantesimi a una classe altrimenti non incantatrice (1/3). */
  thirdCaster?: { aliases: readonly string[]; spellAbility: Ability };
}

export const CLASSES: Record<ClassId, ClassInfo> = {
  barbarian: { label: 'Barbaro', hitDie: 12, progression: 'none', spellAbility: null },
  bard: { label: 'Bardo', hitDie: 8, progression: 'full', spellAbility: 'cha' },
  cleric: { label: 'Chierico', hitDie: 8, progression: 'full', spellAbility: 'wis' },
  druid: { label: 'Druido', hitDie: 8, progression: 'full', spellAbility: 'wis' },
  fighter: {
    label: 'Guerriero',
    hitDie: 10,
    progression: 'none',
    spellAbility: null,
    thirdCaster: { aliases: ['cavaliere mistico', 'eldritch knight'], spellAbility: 'int' },
  },
  monk: { label: 'Monaco', hitDie: 8, progression: 'none', spellAbility: null },
  paladin: { label: 'Paladino', hitDie: 10, progression: 'half', spellAbility: 'cha' },
  ranger: { label: 'Ranger', hitDie: 10, progression: 'half', spellAbility: 'wis' },
  rogue: {
    label: 'Ladro',
    hitDie: 8,
    progression: 'none',
    spellAbility: null,
    thirdCaster: { aliases: ['mistificatore arcano', 'arcane trickster'], spellAbility: 'int' },
  },
  sorcerer: { label: 'Stregone', hitDie: 6, progression: 'full', spellAbility: 'cha' },
  warlock: { label: 'Warlock', hitDie: 8, progression: 'pact', spellAbility: 'cha' },
  wizard: { label: 'Mago', hitDie: 6, progression: 'full', spellAbility: 'int' },
  artificer: { label: 'Artefice', hitDie: 8, progression: 'artificer', spellAbility: 'int' },
};

export const CLASS_OPTIONS = CLASS_IDS.map((id) => ({ value: id, label: CLASSES[id].label }));

export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Slot per livello incantatore (tabella dell'incantatore completo / del multiclasse, PHB). */
export const FULL_CASTER_SLOTS: readonly (readonly number[])[] = [
  [],
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Magia del patto per livello da warlock: numero di slot e loro livello. */
export function pactSlotsForLevel(level: number): { max: number; slotLevel: number } | null {
  if (level < 1) return null;
  const max = level === 1 ? 1 : level < 11 ? 2 : level < 17 ? 3 : 4;
  const slotLevel = Math.min(5, Math.ceil(level / 2));
  return { max, slotLevel };
}
