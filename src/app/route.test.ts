import { expect, it } from 'vitest';
import { parseHash, routeToHash } from './route';

it('interpreta gli hash', () => {
  expect(parseHash('')).toEqual({ name: 'list' });
  expect(parseHash('#/')).toEqual({ name: 'list' });
  expect(parseHash('#/c/abc-123')).toEqual({ name: 'sheet', id: 'abc-123' });
  expect(parseHash('#/c/')).toEqual({ name: 'list' });
  expect(parseHash('#/boh')).toEqual({ name: 'list' });
});

it('costruisce gli hash', () => {
  expect(routeToHash({ name: 'list' })).toBe('#/');
  expect(routeToHash({ name: 'sheet', id: 'a b' })).toBe('#/c/a%20b');
  expect(parseHash(routeToHash({ name: 'sheet', id: 'a b' }))).toEqual({ name: 'sheet', id: 'a b' });
});
