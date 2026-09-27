import { useEffect, useState } from 'react';

function query(q: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(q).matches;
}

/** Vero finché la media query corrisponde; si aggiorna quando la finestra cambia. */
export function useMediaQuery(q: string): boolean {
  const [matches, setMatches] = useState(() => query(q));
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(q);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [q]);
  return matches;
}
