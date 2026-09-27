import { Checkbox, NumberInput, Section, Select, TextArea, TextInput } from '../../../ui/fields';
import { signed } from '../../../ui/format';
import { ABILITY_OPTIONS } from '../labels';
import { newAttack, type Attack } from '../model';
import { attackDamage, attackToHit } from '../rules';
import { removeById, updateById } from './listOps';
import type { TabProps } from './types';

export function AttacksSection({ data, onChange }: TabProps) {
  const setAttacks = (attacks: Attack[]) => onChange({ ...data, attacks });

  return (
    <Section
      title="Attacchi"
      actions={
        <button type="button" className="btn small" onClick={() => setAttacks([...data.attacks, newAttack()])}>
          + Attacco
        </button>
      }
    >
      {data.attacks.length === 0 && <p className="muted">Nessun attacco.</p>}
      <ul className="list">
        {data.attacks.map((a) => {
          const patch = (p: Partial<Attack>) => setAttacks(updateById(data.attacks, a.id, p));
          return (
            <li key={a.id} className="list-item">
              <div className="list-summary">
                <strong>{a.name || 'Senza nome'}</strong>
                <span aria-label={`Tiro per colpire ${a.name}`}>{signed(attackToHit(data, a))}</span>
                <span aria-label={`Danno ${a.name}`}>
                  {attackDamage(data, a)} {a.damageType}
                </span>
              </div>
              <details>
                <summary>Modifica</summary>
                <div className="grid-2">
                  <TextInput label="Nome attacco" value={a.name} onChange={(v) => patch({ name: v })} />
                  <Select label="Caratteristica" value={a.ability} options={ABILITY_OPTIONS} onChange={(v) => patch({ ability: v })} />
                  <Checkbox label="Competente" checked={a.proficient} onChange={(v) => patch({ proficient: v })} />
                  <NumberInput label="Bonus al colpire" value={a.attackBonus} min={-20} max={20} onChange={(v) => patch({ attackBonus: v })} />
                  <TextInput label="Dadi danno" placeholder="1d8" value={a.damageDice} onChange={(v) => patch({ damageDice: v })} />
                  <Checkbox label="Aggiungi modificatore al danno" checked={a.addModToDamage} onChange={(v) => patch({ addModToDamage: v })} />
                  <NumberInput label="Bonus danno" value={a.damageBonus} min={-20} max={20} onChange={(v) => patch({ damageBonus: v })} />
                  <TextInput label="Tipo di danno" value={a.damageType} onChange={(v) => patch({ damageType: v })} />
                </div>
                <TextArea label="Note attacco" rows={2} value={a.notes} onChange={(v) => patch({ notes: v })} />
                <button type="button" className="btn small danger" onClick={() => setAttacks(removeById(data.attacks, a.id))}>
                  Rimuovi attacco
                </button>
              </details>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
