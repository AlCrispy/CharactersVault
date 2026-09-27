import { PROFICIENCY_LABEL } from '../labels';
import { PROFICIENCY_LEVELS, type ProficiencyLevel } from '../model';

function next(level: ProficiencyLevel): ProficiencyLevel {
  return PROFICIENCY_LEVELS[(PROFICIENCY_LEVELS.indexOf(level) + 1) % PROFICIENCY_LEVELS.length];
}

const SPOKEN: Record<ProficiencyLevel, string> = { none: 'nessuna', proficient: 'competente', expertise: 'maestria' };

interface Props {
  /** Nome dell'abilità, usato nel nome accessibile. */
  label: string;
  level: ProficiencyLevel;
  onChange: (level: ProficiencyLevel) => void;
}

/** Rombo a tre stati: ogni tocco passa a nessuna → competente → maestria → nessuna. */
export function ProficiencyToggle({ label, level, onChange }: Props) {
  return (
    <button
      type="button"
      className="prof-toggle"
      data-level={level}
      title={PROFICIENCY_LABEL[level]}
      aria-label={`Competenza ${label}: ${SPOKEN[level]}`}
      onClick={() => onChange(next(level))}
    >
      <span className="prof-gem" aria-hidden="true" />
    </button>
  );
}
