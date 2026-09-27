import { expect, it } from 'vitest';
import { removeById, updateById } from './listOps';

const list = [{ id: 'a', n: 1 }, { id: 'b', n: 2 }];

it('updateById aggiorna solo la voce indicata', () => {
  expect(updateById(list, 'b', { n: 5 })).toEqual([{ id: 'a', n: 1 }, { id: 'b', n: 5 }]);
  expect(list[1].n).toBe(2);
});

it('removeById rimuove la voce indicata', () => {
  expect(removeById(list, 'a')).toEqual([{ id: 'b', n: 2 }]);
});
