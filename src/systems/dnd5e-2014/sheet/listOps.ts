export function updateById<T extends { id: string }>(list: readonly T[], id: string, patch: Partial<T>): T[] {
  return list.map((x) => (x.id === id ? { ...x, ...patch } : x));
}

export function removeById<T extends { id: string }>(list: readonly T[], id: string): T[] {
  return list.filter((x) => x.id !== id);
}

/** Restituisce un setter che sostituisce un campo di primo livello. */
export function fieldSetter<T extends object>(data: T, onChange: (next: T) => void) {
  return <K extends keyof T>(key: K, value: T[K]) => onChange({ ...data, [key]: value });
}
