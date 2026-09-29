import { NumberInput } from './fields';

interface PipsProps {
  label: string;
  count: number;
  max: number;
  onChange: (count: number) => void;
  hideLabel?: boolean;
  /** Oltre questo numero di caselle si mostra un campo numerico (default 10). */
  maxPips?: number;
}

export function Pips({ label, count, max, onChange, hideLabel, maxPips = 10 }: PipsProps) {
  if (max > maxPips) {
    return <NumberInput label={label} value={count} min={0} max={max} onChange={onChange} hideLabel={hideLabel} />;
  }
  return (
    <div className="pips-field">
      <span className={hideLabel ? 'visually-hidden' : 'field-label'}>{label}</span>
      <div className="pips" role="group" aria-label={label}>
        {Array.from({ length: max }, (_, i) => (
          <input
            key={i}
            type="checkbox"
            aria-label={`${label} ${i + 1}`}
            checked={i < count}
            onChange={() => onChange(i < count ? i : i + 1)}
          />
        ))}
      </div>
    </div>
  );
}
