import type { GameSystem } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySystem = GameSystem<any>;

export function createRegistry() {
  const systems = new Map<string, AnySystem>();
  return {
    /** Sovrascrive un sistema con lo stesso id (utile con l'hot reload di Vite). */
    register(system: AnySystem): void {
      systems.set(system.id, system);
    },
    get(id: string): GameSystem<unknown> | undefined {
      return systems.get(id);
    },
    list(): GameSystem<unknown>[] {
      return [...systems.values()];
    },
  };
}

export type Registry = ReturnType<typeof createRegistry>;

export const registry = createRegistry();
