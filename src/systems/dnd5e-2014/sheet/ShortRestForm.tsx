import { useState } from 'react';
import { NumberInput } from '../../../ui/fields';
import { signed } from '../../../ui/format';
import type { ShortRestOptions } from '../actions';
import { HIT_DIE_KEYS, type Dnd5eCharacter, type HitDieKey } from '../model';
import { abilityModifier, hitDiceTotals } from '../rules';

interface Props {
  data: Dnd5eCharacter;
  onConfirm: (opts: ShortRestOptions) => void;
  onCancel: () => void;
}

export function ShortRestForm({ data, onConfirm, onCancel }: Props) {
  const totals = hitDiceTotals(data);
  const [spend, setSpend] = useState<Record<HitDieKey, number>>({ d6: 0, d8: 0, d10: 0, d12: 0 });
  const [hp, setHp] = useState(0);
  const available = HIT_DIE_KEYS.filter((k) => totals[k] - data.hitDiceUsed[k] > 0);

  return (
    <div className="card inset" role="group" aria-label="Riposo breve">
      <p className="muted">
        Tira i dadi vita che spendi e aggiungi a ciascuno il modificatore di Costituzione ({signed(abilityModifier(data.abilities.con))}).
      </p>
      {available.length === 0 && <p>Nessun dado vita disponibile.</p>}
      <div className="row">
        {available.map((k) => (
          <NumberInput
            key={k}
            label={`Spendi ${k}`}
            value={spend[k]}
            min={0}
            max={totals[k] - data.hitDiceUsed[k]}
            onChange={(v) => setSpend({ ...spend, [k]: v })}
          />
        ))}
        <NumberInput label="PF recuperati" value={hp} min={0} max={999} onChange={setHp} />
      </div>
      <div className="row">
        <button type="button" className="btn primary" onClick={() => onConfirm({ spend, hpRecovered: hp })}>
          Conferma riposo breve
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Annulla
        </button>
      </div>
    </div>
  );
}
