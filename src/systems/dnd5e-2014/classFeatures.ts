import { CLASS_IDS, type ClassId } from './classes';
import type { Dnd5eCharacter } from './model';
import { abilityModifier, proficiencyBonus, totalLevel } from './rules';

/** Risorsa di classe con usi limitati; gli usi spesi stanno in `classResourcesUsed[id]`. */
export interface ClassResource {
  id: string;
  label: string;
  max: number;
  recharge: 'short' | 'long';
}

/** Valore derivato da mostrare (dado di Arti Marziali, Attacco Furtivo…). */
export interface ClassStat {
  label: string;
  value: string;
}

/** Livelli per classe, sommando eventuali voci ripetute. */
export function classLevels(c: Dnd5eCharacter): Record<ClassId, number> {
  const levels = Object.fromEntries(CLASS_IDS.map((id) => [id, 0])) as Record<ClassId, number>;
  for (const k of c.classes) if (k.classId) levels[k.classId] += k.level;
  return levels;
}

/** Soglie crescenti [livello, valore]: restituisce il valore dell'ultima soglia raggiunta. */
function byLevel<T>(level: number, steps: readonly [number, T][]): T | null {
  let value: T | null = null;
  for (const [min, v] of steps) if (level >= min) value = v;
  return value;
}

const atLeastOne = (n: number) => Math.max(1, n);

export function classResources(c: Dnd5eCharacter): ClassResource[] {
  const lv = classLevels(c);
  const mod = (a: keyof Dnd5eCharacter['abilities']) => abilityModifier(c.abilities[a]);
  const out: ClassResource[] = [];
  const add = (id: string, label: string, max: number | null, recharge: ClassResource['recharge']) => {
    if (!max || max <= 0) return;
    // Stessa risorsa da due classi (es. Incanalare Divinità): non si sommano, vale la migliore.
    const prev = out.find((r) => r.id === id);
    if (prev) prev.max = Math.max(prev.max, max);
    else out.push({ id, label, max, recharge });
  };

  if (lv.barbarian && lv.barbarian < 20) {
    add('rage', 'Ira', byLevel(lv.barbarian, [[1, 2], [3, 3], [6, 4], [12, 5], [17, 6]]), 'long');
  }
  if (lv.bard) add('bardicInspiration', 'Ispirazione bardica', atLeastOne(mod('cha')), lv.bard >= 5 ? 'short' : 'long');
  add('channelDivinity', 'Incanalare Divinità', byLevel(lv.cleric, [[2, 1], [6, 2], [18, 3]]), 'short');
  if (lv.druid < 20) add('wildShape', 'Forma Selvatica', byLevel(lv.druid, [[2, 2]]), 'short');
  if (lv.fighter) {
    add('secondWind', 'Recuperare Energie', 1, 'short');
    add('actionSurge', 'Azione Impetuosa', byLevel(lv.fighter, [[2, 1], [17, 2]]), 'short');
    add('indomitable', 'Indomito', byLevel(lv.fighter, [[9, 1], [13, 2], [17, 3]]), 'long');
  }
  if (lv.monk >= 2) add('ki', 'Punti ki', lv.monk, 'short');
  if (lv.paladin) {
    add('layOnHands', 'Imposizione delle Mani (PF)', 5 * lv.paladin, 'long');
    add('divineSense', 'Percepire il Divino', atLeastOne(1 + mod('cha')), 'long');
    add('channelDivinity', 'Incanalare Divinità', byLevel(lv.paladin, [[3, 1]]), 'short');
  }
  if (lv.sorcerer >= 2) add('sorceryPoints', 'Punti stregoneria', lv.sorcerer, 'long');
  for (const [min, spell] of [[11, 6], [13, 7], [15, 8], [17, 9]] as const) {
    if (lv.warlock >= min) add(`mysticArcanum${spell}`, `Arcanum mistico ${spell}°`, 1, 'long');
  }
  if (lv.wizard) add('arcaneRecovery', 'Recupero Arcano', 1, 'long');
  if (lv.artificer >= 7) add('flashOfGenius', 'Lampo di Genio', atLeastOne(mod('int')), 'long');
  return out;
}

export function classStats(c: Dnd5eCharacter): ClassStat[] {
  const lv = classLevels(c);
  const pb = proficiencyBonus(totalLevel(c));
  const signed = (n: number) => (n >= 0 ? `+${n}` : String(n));
  const out: ClassStat[] = [];
  if (lv.barbarian) {
    out.push({ label: 'Danni ira', value: signed(byLevel(lv.barbarian, [[1, 2], [9, 3], [16, 4]])!) });
    if (lv.barbarian >= 20) out.push({ label: 'Ira', value: 'Illimitata' });
  }
  if (lv.bard) out.push({ label: 'Dado ispirazione', value: byLevel(lv.bard, [[1, 'd6'], [5, 'd8'], [10, 'd10'], [15, 'd12']])! });
  if (lv.monk) {
    out.push({ label: 'Arti marziali', value: byLevel(lv.monk, [[1, 'd4'], [5, 'd6'], [11, 'd8'], [17, 'd10']])! });
    if (lv.monk >= 2) out.push({ label: 'CD ki', value: String(8 + pb + abilityModifier(c.abilities.wis)) });
  }
  if (lv.rogue) out.push({ label: 'Attacco furtivo', value: `${Math.ceil(lv.rogue / 2)}d6` });
  if (lv.wizard) out.push({ label: 'Recupero arcano (livelli)', value: String(Math.ceil(lv.wizard / 2)) });
  return out;
}

/** Azzera gli usi spesi delle risorse che si ricaricano con il riposo indicato. */
export function rechargeClassResources(c: Dnd5eCharacter, rest: 'short' | 'long'): Dnd5eCharacter['classResourcesUsed'] {
  if (rest === 'long') return {};
  const short = new Set(classResources(c).filter((r) => r.recharge === 'short').map((r) => r.id));
  return Object.fromEntries(Object.entries(c.classResourcesUsed).filter(([id]) => !short.has(id)));
}
