import { registry, type Registry } from './registry';
import type { CharacterRecord, GameSystem } from './types';

export type LoadResult =
  | { status: 'ok'; system: GameSystem<unknown>; data: unknown }
  | { status: 'unknownSystem'; systemId: string }
  | { status: 'damaged'; system: GameSystem<unknown>; error: string };

export function loadCharacter(record: CharacterRecord, reg: Registry = registry): LoadResult {
  const system = reg.get(record.systemId);
  if (!system) return { status: 'unknownSystem', systemId: record.systemId };
  try {
    const data = system.validate(system.migrate(record.data, record.schemaVersion));
    return { status: 'ok', system, data };
  } catch (e) {
    return { status: 'damaged', system, error: e instanceof Error ? e.message : String(e) };
  }
}
