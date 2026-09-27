import { expect, it } from 'vitest';
import { createRegistry } from './registry';
import { testSystem } from './testSystem';

it('registra e restituisce i sistemi', () => {
  const reg = createRegistry();
  expect(reg.get('test')).toBeUndefined();
  reg.register(testSystem);
  expect(reg.get('test')).toBe(testSystem);
  expect(reg.list()).toEqual([testSystem]);
});

it('una nuova registrazione con lo stesso id sostituisce la precedente', () => {
  const reg = createRegistry();
  const other = { ...testSystem, name: 'Altro' };
  reg.register(testSystem);
  reg.register(other);
  expect(reg.get('test')).toBe(other);
  expect(reg.list()).toHaveLength(1);
});
