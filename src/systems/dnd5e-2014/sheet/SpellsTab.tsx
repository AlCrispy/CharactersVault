import { Checkbox, NumberInput, Section, Select, Stat, TextArea, TextInput } from '../../../ui/fields';
import { signed } from '../../../ui/format';
import { Pips } from '../../../ui/Pips';
import { ABILITY_OPTIONS } from '../labels';
import { newSpell, type Ability, type Spell, type Spellcasting } from '../model';
import { spellAttackBonus, spellSaveDC } from '../rules';
import { removeById, updateById } from './listOps';
import type { TabProps } from './types';

const CASTER_OPTIONS: { value: Ability | 'none'; label: string }[] = [{ value: 'none', label: 'Nessuna' }, ...ABILITY_OPTIONS];

function spellcastingOf({ data, onChange }: TabProps) {
  const sc = data.spellcasting;
  const setSc = (patch: Partial<Spellcasting>) => onChange({ ...data, spellcasting: { ...sc, ...patch } });
  return { sc, setSc };
}

export function CasterSection(props: TabProps) {
  const { sc, setSc } = spellcastingOf(props);
  const dc = spellSaveDC(props.data);
  const atk = spellAttackBonus(props.data);
  return (
      <Section title="Incantatore">
        <Select
          label="Caratteristica da incantatore"
          value={sc.ability ?? 'none'}
          options={CASTER_OPTIONS}
          onChange={(v) => setSc({ ability: v === 'none' ? null : v })}
        />
        <div className="stats-row">
          <Stat label="CD incantesimi" value={dc ?? '—'} />
          <Stat label="Attacco con incantesimi" value={atk === null ? '—' : signed(atk)} />
        </div>
      </Section>
  );
}

export function SlotsSection(props: TabProps) {
  const { sc, setSc } = spellcastingOf(props);
  return (
      <Section title="Slot incantesimo">
        <ul className="slots">
          {sc.slots.map((slot, i) => (
            <li className="slot-row" key={i}>
              <span className="slot-level">{i + 1}°</span>
              <NumberInput
                hideLabel
                label={`Slot ${i + 1}° livello`}
                className="narrow"
                value={slot.max}
                min={0}
                max={9}
                onChange={(v) => setSc({ slots: sc.slots.map((s, j) => (j === i ? { max: v, used: Math.min(s.used, v) } : s)) })}
              />
              <Pips
                hideLabel
                label={`Slot usati ${i + 1}° livello`}
                count={slot.used}
                max={slot.max}
                onChange={(v) => setSc({ slots: sc.slots.map((s, j) => (j === i ? { ...s, used: v } : s)) })}
              />
            </li>
          ))}
        </ul>
        <h3>Magia del patto</h3>
        <div className="row">
          <NumberInput
            label="Livello slot patto"
            className="narrow"
            value={sc.pact.slotLevel}
            min={1}
            max={5}
            onChange={(v) => setSc({ pact: { ...sc.pact, slotLevel: v } })}
          />
          <NumberInput
            label="Slot patto"
            className="narrow"
            value={sc.pact.max}
            min={0}
            max={4}
            onChange={(v) => setSc({ pact: { ...sc.pact, max: v, used: Math.min(sc.pact.used, v) } })}
          />
          <Pips label="Slot patto usati" count={sc.pact.used} max={sc.pact.max} onChange={(v) => setSc({ pact: { ...sc.pact, used: v } })} />
        </div>
      </Section>
  );
}

export function SpellListSection(props: TabProps) {
  const { sc, setSc } = spellcastingOf(props);
  // Ordinamento solo per livello (stabile): ordinare per nome sposterebbe la riga mentre si scrive.
  const spells = [...sc.spells].sort((a, b) => a.level - b.level);
  return (
      <Section
        title="Incantesimi"
        actions={
          <button type="button" className="btn small" onClick={() => setSc({ spells: [...sc.spells, newSpell()] })}>
            + Incantesimo
          </button>
        }
      >
        {spells.length === 0 && <p className="muted">Nessun incantesimo.</p>}
        <ul className="list">
          {spells.map((s) => {
            const patch = (p: Partial<Spell>) => setSc({ spells: updateById(sc.spells, s.id, p) });
            return (
              <li key={s.id} className="list-item">
                <div className="row">
                  <NumberInput label="Livello incantesimo" className="narrow" value={s.level} min={0} max={9} onChange={(v) => patch({ level: v })} />
                  <TextInput label="Nome incantesimo" value={s.name} onChange={(v) => patch({ name: v })} />
                  {s.level > 0 && <Checkbox label="Preparato" checked={s.prepared} onChange={(v) => patch({ prepared: v })} />}
                </div>
                <details>
                  <summary>Note</summary>
                  <TextArea label="Note incantesimo" rows={3} value={s.notes} onChange={(v) => patch({ notes: v })} />
                  <button type="button" className="btn small danger" onClick={() => setSc({ spells: removeById(sc.spells, s.id) })}>
                    Rimuovi incantesimo
                  </button>
                </details>
              </li>
            );
          })}
        </ul>
      </Section>
  );
}
