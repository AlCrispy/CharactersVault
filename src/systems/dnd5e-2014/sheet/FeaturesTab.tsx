import { Checkbox, NumberInput, Section, Select, TextArea, TextInput } from '../../../ui/fields';
import { Pips } from '../../../ui/Pips';
import { RemoveButton } from '../../../ui/RemoveButton';
import { RECHARGE_LABEL, RECHARGE_OPTIONS } from '../labels';
import { newFeature, type Feature } from '../model';
import { removeById, updateById } from './listOps';
import type { TabProps } from './types';

export function FeaturesSection({ data, onChange }: TabProps) {
  const setFeatures = (features: Feature[]) => onChange({ ...data, features });

  return (
    <Section
      title="Privilegi e tratti"
      actions={
        <button type="button" className="btn small" onClick={() => setFeatures([...data.features, newFeature()])}>
          + Privilegio
        </button>
      }
    >
      {data.features.length === 0 && <p className="muted">Nessun privilegio.</p>}
      <ul className="list">
        {data.features.map((f) => {
          const patch = (p: Partial<Feature>) => setFeatures(updateById(data.features, f.id, p));
          const uses = f.uses;
          return (
            <li key={f.id} className="list-item">
              <div className="row">
                <TextInput label="Nome privilegio" value={f.name} onChange={(v) => patch({ name: v })} />
                <TextInput label="Fonte" placeholder="Classe, razza, talento…" value={f.source} onChange={(v) => patch({ source: v })} />
                <RemoveButton label="Rimuovi privilegio" onClick={() => setFeatures(removeById(data.features, f.id))} />
              </div>
              {uses && (
                <div className="row">
                  <Pips label={`Utilizzi ${f.name}`} count={uses.used} max={uses.max} onChange={(v) => patch({ uses: { ...uses, used: v } })} />
                  <span className="muted">{RECHARGE_LABEL[uses.recharge]}</span>
                </div>
              )}
              <details>
                <summary>Dettagli</summary>
                <TextArea label="Descrizione" value={f.description} onChange={(v) => patch({ description: v })} />
                <Checkbox
                  label="Utilizzi limitati"
                  checked={uses !== null}
                  onChange={(v) => patch({ uses: v ? { max: 1, used: 0, recharge: 'long' } : null })}
                />
                {uses && (
                  <div className="grid-2">
                    <NumberInput
                      label="Utilizzi massimi"
                      value={uses.max}
                      min={0}
                      max={99}
                      onChange={(v) => patch({ uses: { ...uses, max: v, used: Math.min(uses.used, v) } })}
                    />
                    <Select label="Ripristino" value={uses.recharge} options={RECHARGE_OPTIONS} onChange={(v) => patch({ uses: { ...uses, recharge: v } })} />
                  </div>
                )}
              </details>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
