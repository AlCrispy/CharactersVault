import { useState } from 'react';
import { Checkbox, NumberInput, Section, Select, Stat } from '../../../ui/fields';
import { formatNumber, signed } from '../../../ui/format';
import { Pips } from '../../../ui/Pips';
import { applyDamage, applyHealing, longRest, setTempHp, shortRest } from '../actions';
import { ARMOR_OPTIONS } from '../labels';
import { HIT_DIE_KEYS, type Dnd5eCharacter } from '../model';
import { armorClass, hitDiceTotals, initiative } from '../rules';
import { AttacksSection } from './AttacksSection';
import { ShortRestForm } from './ShortRestForm';
import type { TabProps } from './types';

const ARMOR_WITH_BASE = new Set(['light', 'medium', 'heavy']);

export function CombatTab({ data, onChange }: TabProps) {
  const set = <K extends keyof Dnd5eCharacter>(key: K, value: Dnd5eCharacter[K]) => onChange({ ...data, [key]: value });
  const [amount, setAmount] = useState(0);
  const [resting, setResting] = useState(false);
  const totals = hitDiceTotals(data);
  const { current, max, temp } = data.hp;
  const hpPct = max > 0 ? Math.min(1, current / max) : 0;
  const tempPct = max > 0 ? Math.min(1 - hpPct, temp / max) : 0;

  function handleLongRest() {
    if (window.confirm('Riposo lungo: ripristinare PF, slot incantesimo, dadi vita e privilegi?')) onChange(longRest(data));
  }

  return (
    <>
      <Section title="Punti ferita">
        <div className="stats-row">
          <Stat label="PF attuali" value={`${data.hp.current} / ${data.hp.max}`} />
          <Stat label="PF temporanei" value={data.hp.temp} />
        </div>
        <div className="hp-bar" aria-hidden="true">
          <div className="hp-fill" style={{ width: `${hpPct * 100}%` }} />
          <div className="hp-temp" style={{ width: `${tempPct * 100}%` }} />
        </div>
        <div className="row">
          <NumberInput label="Quantità" value={amount} min={0} max={999} onChange={setAmount} />
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              onChange(applyDamage(data, amount));
              setAmount(0);
            }}
          >
            Danno
          </button>
          <button
            type="button"
            className="btn ok"
            onClick={() => {
              onChange(applyHealing(data, amount));
              setAmount(0);
            }}
          >
            Cura
          </button>
        </div>
        <div className="grid-3">
          <NumberInput label="PF massimi" value={data.hp.max} min={0} max={999} onChange={(v) => set('hp', { ...data.hp, max: v })} />
          <NumberInput label="PF correnti" value={data.hp.current} min={0} max={999} onChange={(v) => set('hp', { ...data.hp, current: v })} />
          <NumberInput label="PF temp." value={data.hp.temp} min={0} max={999} onChange={(v) => onChange(setTempHp(data, v))} />
        </div>
      </Section>

      <Section title="Difesa e movimento">
        <div className="stats-row">
          <Stat label="CA" ariaLabel="Classe Armatura" variant="shield" value={armorClass(data)} />
          <Stat label="Iniziativa" value={signed(initiative(data))} />
          <Stat label="Velocità" value={`${formatNumber(data.speedMeters)} m`} />
        </div>
        <Select label="Protezione" value={data.armor.type} options={ARMOR_OPTIONS} onChange={(v) => set('armor', { ...data.armor, type: v })} />
        <div className="grid-3">
          {ARMOR_WITH_BASE.has(data.armor.type) && (
            <NumberInput label="CA base armatura" value={data.armor.base} min={0} max={30} onChange={(v) => set('armor', { ...data.armor, base: v })} />
          )}
          <Checkbox label="Scudo (+2)" checked={data.armor.shield} onChange={(v) => set('armor', { ...data.armor, shield: v })} />
          <NumberInput label="Bonus CA" value={data.armor.bonus} min={-10} max={20} onChange={(v) => set('armor', { ...data.armor, bonus: v })} />
          <NumberInput label="Bonus iniziativa" value={data.initiativeBonus} min={-10} max={20} onChange={(v) => set('initiativeBonus', v)} />
          <NumberInput label="Velocità (m)" value={data.speedMeters} min={0} max={999} integer={false} onChange={(v) => set('speedMeters', v)} />
        </div>
      </Section>

      <Section title="Condizioni">
        <div className="row">
          <Pips
            label="Successi TS morte"
            count={data.deathSaves.successes}
            max={3}
            onChange={(v) => set('deathSaves', { ...data.deathSaves, successes: v })}
          />
          <Pips
            label="Fallimenti TS morte"
            count={data.deathSaves.failures}
            max={3}
            onChange={(v) => set('deathSaves', { ...data.deathSaves, failures: v })}
          />
          <NumberInput label="Sfinimento" className="narrow" value={data.exhaustion} min={0} max={6} onChange={(v) => set('exhaustion', v)} />
        </div>
      </Section>

      <Section title="Dadi vita e riposi">
        {HIT_DIE_KEYS.filter((k) => totals[k] > 0).map((k) => (
          <div className="row" key={k}>
            <Stat label={`Disponibili ${k}`} ariaLabel={`Dadi vita ${k} disponibili`} value={`${totals[k] - data.hitDiceUsed[k]} / ${totals[k]}`} />
            <NumberInput
              label={`Usati ${k}`}
              className="narrow"
              value={data.hitDiceUsed[k]}
              min={0}
              max={totals[k]}
              onChange={(v) => set('hitDiceUsed', { ...data.hitDiceUsed, [k]: v })}
            />
          </div>
        ))}
        <div className="row">
          <button type="button" className="btn" onClick={() => setResting(true)}>
            Riposo breve
          </button>
          <button type="button" className="btn" onClick={handleLongRest}>
            Riposo lungo
          </button>
        </div>
        {resting && (
          <ShortRestForm
            data={data}
            onCancel={() => setResting(false)}
            onConfirm={(opts) => {
              onChange(shortRest(data, opts));
              setResting(false);
            }}
          />
        )}
      </Section>

      <AttacksSection data={data} onChange={onChange} />
    </>
  );
}
