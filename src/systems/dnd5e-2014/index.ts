import { z } from 'zod';
import type { GameSystem } from '../../core/types';
import { migrate, SCHEMA_VERSION } from './migrate';
import { createBlank, dnd5eSchema, type Dnd5eCharacter } from './model';
import { summary } from './rules';
import { Sheet } from './sheet/Sheet';

export const dnd5e: GameSystem<Dnd5eCharacter> = {
  id: 'dnd5e-2014',
  name: 'D&D 5e (2014)',
  schemaVersion: SCHEMA_VERSION,
  createBlank,
  migrate,
  validate(data) {
    const result = dnd5eSchema.safeParse(data);
    if (!result.success) throw new Error(z.prettifyError(result.error));
    return result.data;
  },
  getName: (d) => d.name,
  withName: (d, name) => ({ ...d, name }),
  summary,
  Sheet,
};
