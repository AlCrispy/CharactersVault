import { useState, type ReactNode } from 'react';

function labelClass(hideLabel?: boolean) {
  return hideLabel ? 'visually-hidden' : 'field-label';
}

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  integer?: boolean;
  className?: string;
  hideLabel?: boolean;
}

export function NumberInput({ label, value, onChange, min, max, integer = true, className, hideLabel }: NumberInputProps) {
  // Bozza locale: permette di svuotare il campo o scrivere "-" senza che il valore salti.
  const [draft, setDraft] = useState<string | null>(null);

  function handleChange(text: string) {
    setDraft(text);
    if (text.trim() === '') return;
    const n = Number(text.replace(',', '.'));
    if (!Number.isFinite(n)) return;
    let v = integer ? Math.trunc(n) : n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    onChange(v);
  }

  const inputMode = min !== undefined && min >= 0 ? (integer ? 'numeric' : 'decimal') : 'text';

  return (
    <label className={`field ${className ?? ''}`}>
      <span className={labelClass(hideLabel)}>{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        value={draft ?? String(value)}
        onFocus={() => setDraft(String(value))}
        onBlur={() => setDraft(null)}
        onChange={(e) => handleChange(e.target.value)}
      />
    </label>
  );
}

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  hideLabel?: boolean;
  placeholder?: string;
}

export function TextInput({ label, value, onChange, className, hideLabel, placeholder }: TextInputProps) {
  return (
    <label className={`field ${className ?? ''}`}>
      <span className={labelClass(hideLabel)}>{label}</span>
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function TextArea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  className?: string;
}

export function Checkbox({ label, checked, onChange, ariaLabel, className }: CheckboxProps) {
  return (
    <label className={`check ${className ?? ''}`}>
      <input type="checkbox" aria-label={ariaLabel} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
}

export function Select<T extends string>({ label, value, options, onChange, hideLabel }: SelectProps<T>) {
  return (
    <label className="field">
      <span className={labelClass(hideLabel)}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card section">
      <header className="section-header">
        <h2>{title}</h2>
        {actions}
      </header>
      <div className="ornament" aria-hidden="true">
        ❖
      </div>
      {children}
    </section>
  );
}

interface StatProps {
  label: string;
  value: string | number;
  ariaLabel?: string;
  /** `shield` disegna il valore dentro uno scudo (es. Classe Armatura). */
  variant?: 'shield';
}

export function Stat({ label, value, ariaLabel, variant }: StatProps) {
  return (
    <div className={variant ? `stat ${variant}` : 'stat'}>
      <span className="stat-label">{label}</span>
      <output className="stat-value" aria-label={ariaLabel ?? label}>
        {value}
      </output>
    </div>
  );
}
