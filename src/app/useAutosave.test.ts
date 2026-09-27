import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutosave } from './useAutosave';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(save: (v: number) => Promise<void>) {
  return renderHook(({ value }) => useAutosave(value, save, 500), { initialProps: { value: 1 } });
}

describe('useAutosave', () => {
  it('non salva al primo render', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = setup(save);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(save).not.toHaveBeenCalled();
    expect(result.current).toBe('idle');
  });

  it('salva dopo il ritardo', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = setup(save);
    rerender({ value: 2 });
    expect(result.current).toBe('pending');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(499);
    });
    expect(save).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(save).toHaveBeenCalledExactlyOnceWith(2);
    expect(result.current).toBe('saved');
  });

  it('raggruppa modifiche ravvicinate', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender } = setup(save);
    rerender({ value: 2 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    rerender({ value: 3 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(save).toHaveBeenCalledExactlyOnceWith(3);
  });

  it('salva subito allo smontaggio se c’è una modifica in sospeso', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender, unmount } = setup(save);
    rerender({ value: 2 });
    unmount();
    expect(save).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('salva alla chiusura della pagina', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender } = setup(save);
    rerender({ value: 2 });
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(save).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('segnala errore se il salvataggio fallisce', async () => {
    const save = vi.fn().mockRejectedValue(new Error('disco pieno'));
    const { result, rerender } = setup(save);
    rerender({ value: 2 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current).toBe('error');
  });
});
