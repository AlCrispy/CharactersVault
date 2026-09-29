import { useEffect, useRef, useState } from 'react';

export type HpState = 'good' | 'mid' | 'bad' | 'down';

/** Stato di salute: sopra il 50% bene, fino al 25% medio, sotto male, a 0 a terra. */
export function hpState(current: number, max: number): HpState {
  if (max <= 0 || current <= 0) return 'down';
  const pct = current / max;
  return pct > 0.5 ? 'good' : pct > 0.25 ? 'mid' : 'bad';
}

interface Props {
  current: number;
  max: number;
  temp: number;
}

/**
 * Barra dei PF. Il colore segue lo stato di salute; quando si subiscono danni la barra sussulta
 * e la parte persa resta un attimo come scia chiara (`hp-trail`, che si ritira in ritardo via CSS).
 */
export function HpBar({ current, max, temp }: Props) {
  const hpPct = max > 0 ? Math.min(1, current / max) : 0;
  const tempPct = max > 0 ? Math.min(1 - hpPct, temp / max) : 0;
  const previous = useRef(current);
  const [hit, setHit] = useState(false);

  useEffect(() => {
    if (current < previous.current) setHit(true);
    previous.current = current;
  }, [current]);

  return (
    <div
      className="hp-bar"
      data-state={hpState(current, max)}
      data-hit={hit || undefined}
      aria-hidden="true"
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setHit(false);
      }}
    >
      <div className="hp-trail" style={{ width: `${hpPct * 100}%` }} />
      <div className="hp-fill" style={{ width: `${hpPct * 100}%` }} />
      <div className="hp-temp" style={{ width: `${tempPct * 100}%` }} />
    </div>
  );
}
