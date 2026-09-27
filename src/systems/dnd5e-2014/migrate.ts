export const SCHEMA_VERSION = 1;

/**
 * Porta i dati salvati alla versione corrente.
 * Quando lo schema cambia: incrementa SCHEMA_VERSION e aggiungi un passo
 * `if (fromVersion < N) current = vPrecedenteToVN(current);` in ordine crescente.
 */
export function migrate(data: unknown, fromVersion: number): unknown {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) {
    throw new Error(`Versione dei dati non valida: ${fromVersion}`);
  }
  if (fromVersion > SCHEMA_VERSION) {
    throw new Error(`Dati creati con una versione più recente dell'app (v${fromVersion}). Aggiorna l'app.`);
  }
  return data;
}
