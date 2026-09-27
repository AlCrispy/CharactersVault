import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useMediaQuery } from './useMediaQuery';

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia');
});

function stubMatchMedia(initial: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches: initial,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  Object.defineProperty(window, 'matchMedia', { value: () => mql, configurable: true });
  return {
    set(matches: boolean) {
      mql.matches = matches;
      listeners.forEach((fn) => fn());
    },
  };
}

it('false se matchMedia non esiste', () => {
  const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
  expect(result.current).toBe(false);
});

it('segue i cambiamenti della media query', () => {
  const media = stubMatchMedia(true);
  const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
  expect(result.current).toBe(true);
  act(() => media.set(false));
  expect(result.current).toBe(false);
});
