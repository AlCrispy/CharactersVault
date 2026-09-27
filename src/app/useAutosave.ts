import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saved' | 'error';

export function useAutosave<T>(value: T, save: (value: T) => Promise<void>, delay = 500): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const latest = useRef({ value, save });
  latest.current = { value, save };
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isFirstRender = useRef(true);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (!pending.current) return;
    pending.current = false;
    try {
      await latest.current.save(latest.current.value);
      setStatus('saved');
    } catch {
      // Il prossimo cambiamento ritenta il salvataggio.
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    pending.current = true;
    setStatus('pending');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), delay);
  }, [value, delay, flush]);

  useEffect(() => {
    const onPageHide = () => void flush();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      void flush();
    };
  }, [flush]);

  return status;
}
