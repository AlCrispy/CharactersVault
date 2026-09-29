import type { ComponentType } from 'react';

export interface SheetProps<T> {
  data: T;
  onChange: (next: T) => void;
}

/** Contratto che ogni modulo di sistema di gioco implementa. */
export interface GameSystem<T> {
  id: string;
  name: string;
  schemaVersion: number;
  createBlank(): T;
  /** Porta dati salvati con `fromVersion` alla versione corrente. Lancia errore se impossibile. */
  migrate(data: unknown, fromVersion: number): unknown;
  /** Valida dati già migrati. Lancia errore con messaggio leggibile se non validi. */
  validate(data: unknown): T;
  getName(data: T): string;
  withName(data: T, name: string): T;
  summary(data: T): string;
  Sheet: ComponentType<SheetProps<T>>;
  /** Azioni rapide nell'header della scheda (es. riposi). */
  HeaderActions?: ComponentType<SheetProps<T>>;
}

export interface CharacterRecord {
  id: string;
  systemId: string;
  schemaVersion: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: unknown;
}
