const LAST_BACKUP_KEY = 'characters-vault:lastBackup';
const DAY_MS = 86_400_000;

/** Chiede al browser di non cancellare i dati in caso di poco spazio. */
export async function requestPersistence(): Promise<boolean> {
  const storage = navigator.storage;
  if (!storage?.persist) return false;
  try {
    if (await storage.persisted()) return true;
    return await storage.persist();
  } catch {
    return false;
  }
}

export function getLastBackup(): Date | null {
  try {
    const value = localStorage.getItem(LAST_BACKUP_KEY);
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export function setLastBackup(date = new Date()): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, date.toISOString());
  } catch {
    // localStorage non disponibile (es. navigazione privata): il promemoria non è critico.
  }
}

export function daysSince(date: Date, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
}
