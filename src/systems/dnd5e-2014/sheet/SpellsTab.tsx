import { Checkbox, NumberInput, Section, Select, Stat, TextArea, TextInput } from '../../../ui/fields';
import { signed } from '../../../ui/format';
import { Pips } from '../../../ui/Pips';
import { RemoveButton } from '../../../ui/RemoveButton';
import { ABILITY_OPTIONS } from '../labels';
import { newSpell, type Ability, type Spell, type Spellcasting } from '../model';
import { pactSlots, spellAttackBonus, spellSaveDC, spellSlots } from '../rules';
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
  const max = spellSlots(props.data);
  const pact = pactSlots(props.data);
  const levels = max.flatMap((m, i) => (m > 0 ? [i] : []));
  const setUsed = (i: number, v: number) => setSc({ slotsUsed: sc.slotsUsed.map((u, j) => (j === i ? v : u)) });
  // Compare solo con classi (o sottoclassi) che lanciano incantesimi.
  if (levels.length === 0 && !pact) return null;
  return (
      <Section title="Slot incantesimo">
        {levels.length > 0 && (
          <ul className="slots">
            {levels.map((i) => (
              <li className="slot-row" key={i}>
                <span className="slot-level">{i + 1}°</span>
                <Pips
                  hideLabel
                  label={`Slot usati ${i + 1}° livello`}
                  count={Math.min(sc.slotsUsed[i], max[i])}
                  max={max[i]}
                  onChange={(v) => setUsed(i, v)}
                />
              </li>
            ))}
          </ul>
        )}
        {pact && (
          <>
            <h3>Magia del patto</h3>
            <ul className="slots">
              <li className="slot-row">
                <span className="slot-level">{pact.slotLevel}°</span>
                <Pips
                  hideLabel
                  label="Slot patto usati"
                  count={Math.min(sc.pactUsed, pact.max)}
                  max={pact.max}
                  onChange={(v) => setSc({ pactUsed: v })}
                />
              </li>
            </ul>
          </>
        )}
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
                  <RemoveButton label="Rimuovi incantesimo" onClick={() => setSc({ spells: removeById(sc.spells, s.id) })} />
                </div>
                <details>
                  <summary>Note</summary>
                  <TextArea label="Note incantesimo" rows={3} value={s.notes} onChange={(v) => patch({ notes: v })} />
                </details>
              </li>
            );
          })}
        </ul>
      </Section>
  );
}
