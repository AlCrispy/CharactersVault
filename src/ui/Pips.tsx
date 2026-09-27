import { NumberInput } from './fields';

interface PipsProps {
  label: string;
  count: number;
  max: number;
  onChange: (count: number) => void;
  hideLabel?: boolean;
}

const MAX_PIPS = 10;

export function Pips({ label, count, max, onChange, hideLabel }: PipsProps) {
  if (max > MAX_PIPS) {
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
