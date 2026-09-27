import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { daysSince, getLastBackup, requestPersistence, setLastBackup } from './storage';

function stubStorage(value: unknown) {
  Object.defineProperty(navigator, 'storage', { value, configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'storage');
});

describe('requestPersistence', () => {
  it('false se l’API non esiste', async () => {
    stubStorage(undefined);
    expect(await requestPersistence()).toBe(false);
  });

  it('true se già persistente, senza richiederlo', async () => {
    const persist = vi.fn();
    stubStorage({ persisted: vi.fn().mockResolvedValue(true), persist });
    expect(await requestPersistence()).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it('richiede la persistenza e restituisce la risposta', async () => {
    stubStorage({ persisted: vi.fn().mockResolvedValue(false), persist: vi.fn().mockResolvedValue(false) });
    expect(await requestPersistence()).toBe(false);
  });
});

describe('ultimo backup', () => {
  beforeEach(() => localStorage.clear());

  it('null se mai fatto', () => {
    expect(getLastBackup()).toBeNull();
  });

  it('salva e rilegge la data', () => {
    setLastBackup(new Date('2026-09-20T12:00:00.000Z'));
    expect(getLastBackup()?.toISOString()).toBe('2026-09-20T12:00:00.000Z');
  });

  it('ignora valori corrotti', () => {
    localStorage.setItem('characters-vault:lastBackup', 'boh');
    expect(getLastBackup()).toBeNull();
  });

  it('giorni trascorsi', () => {
    expect(daysSince(new Date('2026-09-17T12:00:00Z'), new Date('2026-09-27T11:00:00Z'))).toBe(9);
    expect(daysSince(new Date('2026-09-28T00:00:00Z'), new Date('2026-09-27T00:00:00Z'))).toBe(0);
  });
});
