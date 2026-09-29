import { Section, Stat } from '../../../ui/fields';
import { Pips } from '../../../ui/Pips';
import { classResources, classStats } from '../classFeatures';
import { RECHARGE_LABEL } from '../labels';
import type { TabProps } from './types';

/** Risorse e valori legati alle classi scelte; non compare se le classi non ne hanno. */
export function ClassResourcesSection({ data, onChange }: TabProps) {
  const resources = classResources(data);
  const stats = classStats(data);
  if (resources.length === 0 && stats.length === 0) return null;
  const used = data.classResourcesUsed;
  return (
    <Section title="Risorse di classe">
      {stats.length > 0 && (
        <div className="stats-row">
          {stats.map((s) => (
            <Stat key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      )}
      {resources.length > 0 && (
        <ul className="slots">
          {resources.map((r) => (
            <li className="slot-row" key={r.id}>
              <span className="skill-name">
                {r.label} <small className="muted">({RECHARGE_LABEL[r.recharge].toLowerCase()})</small>
              </span>
              <Pips
                hideLabel
                label={`${r.label} spesi`}
                count={Math.min(used[r.id] ?? 0, r.max)}
                max={r.max}
                onChange={(v) => onChange({ ...data, classResourcesUsed: { ...used, [r.id]: v } })}
              />
              {r.max > 10 && <small className="muted">su {r.max}</small>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
