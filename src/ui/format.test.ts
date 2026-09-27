import { expect, it } from 'vitest';
import { formatNumber, signed } from './format';

it('signed', () => {
  expect(signed(2)).toBe('+2');
  expect(signed(0)).toBe('+0');
  expect(signed(-1)).toBe('-1');
});

it('formatNumber usa la virgola e al massimo 2 decimali', () => {
  expect(formatNumber(112.5)).toBe('112,5');
  expect(formatNumber(3)).toBe('3');
  expect(formatNumber(1.234)).toBe('1,23');
});
