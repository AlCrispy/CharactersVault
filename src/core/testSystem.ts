import { z } from 'zod';
import type { GameSystem } from './types';

const schema = z.object({ name: z.string(), hp: z.number() });
type TestData = z.infer<typeof schema>;

/** Sistema finto usato solo dai test del nucleo. v1 non aveva `hp`. */
export const testSystem: GameSystem<TestData> = {
  id: 'test',
  name: 'Test',
  schemaVersion: 2,
  createBlank: () => ({ name: '', hp: 1 }),
  migrate(data, fromVersion) {
    if (fromVersion > 2) throw new Error('Dati: troppo nuovo');
    if (fromVersion === 1) return { ...(data as object), hp: 1 };
    return data;
  },
  validate: (data) => schema.parse(data),
  getName: (d) => d.name,
  withName: (d, name) => ({ ...d, name }),
  summary: (d) => `PF ${d.hp}`,
  Sheet: () => null,
};
