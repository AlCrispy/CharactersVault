import {
  ABILITIES,
  ARMOR_TYPES,
  RECHARGE_TYPES,
  type Ability,
  type ArmorType,
  type Coin,
  type ProficiencyLevel,
  type Recharge,
  type Skill,
} from './model';

export const ABILITY_LABEL: Record<Ability, { short: string; long: string }> = {
  str: { short: 'FOR', long: 'Forza' },
  dex: { short: 'DES', long: 'Destrezza' },
  con: { short: 'COS', long: 'Costituzione' },
  int: { short: 'INT', long: 'Intelligenza' },
  wis: { short: 'SAG', long: 'Saggezza' },
  cha: { short: 'CAR', long: 'Carisma' },
};

export const SKILL_LABEL: Record<Skill, string> = {
  acrobatics: 'Acrobazia',
  animalHandling: 'Addestrare Animali',
  arcana: 'Arcano',
  athletics: 'Atletica',
  deception: 'Inganno',
  history: 'Storia',
  insight: 'Intuizione',
  intimidation: 'Intimidire',
  investigation: 'Indagare',
  medicine: 'Medicina',
  nature: 'Natura',
  perception: 'Percezione',
  performance: 'Intrattenere',
  persuasion: 'Persuasione',
  religion: 'Religione',
  sleightOfHand: 'Rapidità di Mano',
  stealth: 'Furtività',
  survival: 'Sopravvivenza',
};

export const ARMOR_LABEL: Record<ArmorType, string> = {
  none: 'Nessuna armatura',
  light: 'Armatura leggera',
  medium: 'Armatura media',
  heavy: 'Armatura pesante',
  unarmoredBarbarian: 'Difesa senza armatura (Barbaro)',
  unarmoredMonk: 'Difesa senza armatura (Monaco)',
};

export const PROFICIENCY_LABEL: Record<ProficiencyLevel, string> = {
  none: 'Nessuna competenza',
  proficient: 'Competente',
  expertise: 'Maestria',
};

export const RECHARGE_LABEL: Record<Recharge, string> = {
  short: 'Riposo breve',
  long: 'Riposo lungo',
  none: 'Nessun ripristino',
};

export const COIN_LABEL: Record<Coin, string> = { cp: 'mr', sp: 'ma', ep: 'me', gp: 'mo', pp: 'mp' };

export const ABILITY_OPTIONS = ABILITIES.map((a) => ({ value: a, label: ABILITY_LABEL[a].long }));
export const ARMOR_OPTIONS = ARMOR_TYPES.map((t) => ({ value: t, label: ARMOR_LABEL[t] }));
export const RECHARGE_OPTIONS = RECHARGE_TYPES.map((r) => ({ value: r, label: RECHARGE_LABEL[r] }));
