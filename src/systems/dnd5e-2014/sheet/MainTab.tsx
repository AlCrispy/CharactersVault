import { Checkbox, NumberInput, Section, Select, Stat, TextArea, TextInput } from '../../../ui/fields';
import { signed } from '../../../ui/format';
import { CLASS_OPTIONS, CLASSES, type ClassId } from '../classes';
import { ABILITY_LABEL, SKILL_LABEL } from '../labels';
import { ABILITIES, newClass, SKILL_ABILITY, SKILLS, type ClassEntry } from '../model';
import { abilityModifier, classSpellAbility, hasJackOfAllTrades, passivePerception, proficiencyBonus, savingThrow, skillBonus, totalLevel } from '../rules';
import { fieldSetter, removeById, updateById } from './listOps';
import { ProficiencyToggle } from './ProficiencyToggle';
import type { TabProps } from './types';

const CLASS_SELECT_OPTIONS: { value: ClassId | 'none'; label: string }[] = [{ value: 'none', label: '— Scegli —' }, ...CLASS_OPTIONS];

export function IdentitySection({ data, onChange }: TabProps) {
  const set = fieldSetter(data, onChange);
  return (
    <Section title="Identità">
      <div className="grid-2">
        <TextInput label="Nome personaggio" value={data.name} onChange={(v) => set('name', v)} />
        <TextInput label="Razza" value={data.race} onChange={(v) => set('race', v)} />
        <TextInput label="Background" value={data.background} onChange={(v) => set('background', v)} />
        <TextInput label="Allineamento" value={data.alignment} onChange={(v) => set('alignment', v)} />
        <NumberInput label="Punti esperienza" value={data.xp} min={0} max={9_999_999} onChange={(v) => set('xp', v)} />
        <Checkbox label="Ispirazione" checked={data.inspiration} onChange={(v) => set('inspiration', v)} />
      </div>
    </Section>
  );
}

export function ClassesSection({ data, onChange }: TabProps) {
  const set = fieldSetter(data, onChange);
  const level = totalLevel(data);
  // Se la caratteristica da incantatore non è ancora scelta, la prende dalla prima classe incantatrice.
  const setClasses = (classes: ClassEntry[]) => {
    const ability = data.spellcasting.ability ?? classes.map(classSpellAbility).find((a) => a !== null) ?? null;
    onChange({ ...data, classes, spellcasting: { ...data.spellcasting, ability } });
  };
  return (
    <Section
      title="Classi"
      actions={
        <button type="button" className="btn small" onClick={() => set('classes', [...data.classes, newClass()])}>
          + Classe
        </button>
      }
    >
      {data.classes.map((k) => {
        const patch = (p: Partial<ClassEntry>) => setClasses(updateById(data.classes, k.id, p));
        const info = k.classId ? CLASSES[k.classId] : null;
        return (
          <div className="row" key={k.id}>
            <Select
              label="Classe"
              value={k.classId ?? 'none'}
              options={CLASS_SELECT_OPTIONS}
              onChange={(v) => patch({ classId: v === 'none' ? null : v })}
            />
            <TextInput label="Sottoclasse" value={k.subclass} onChange={(v) => patch({ subclass: v })} />
            <NumberInput label="Livello" className="narrow" value={k.level} min={1} max={20} onChange={(v) => patch({ level: v })} />
            <Stat label="Dado vita" value={info ? `d${info.hitDie}` : '—'} />
            <button
              type="button"
              className="btn small danger"
              aria-label={`Rimuovi classe ${info?.label ?? ''}`.trim()}
              onClick={() => setClasses(removeById(data.classes, k.id))}
            >
              ✕
            </button>
          </div>
        );
      })}
      <div className="stats-row">
        <Stat label="Livello totale" value={level} />
        <Stat label="Bonus competenza" value={signed(proficiencyBonus(level))} />
      </div>
    </Section>
  );
}

export function AbilitiesSection({ data, onChange }: TabProps) {
  const set = fieldSetter(data, onChange);
  return (
    <Section title="Caratteristiche">
      <div className="abilities">
        {ABILITIES.map((a) => {
          const name = ABILITY_LABEL[a].long;
          return (
            <div className="ability" key={a}>
              <span className="ability-name" aria-hidden="true">
                {name}
              </span>
              <output className="ability-mod" aria-label={`Modificatore ${name}`}>
                {signed(abilityModifier(data.abilities[a]))}
              </output>
              <NumberInput
                hideLabel
                label={name}
                className="ability-score"
                value={data.abilities[a]}
                min={1}
                max={30}
                onChange={(v) => set('abilities', { ...data.abilities, [a]: v })}
              />
              <div className="ability-save">
                <Checkbox
                  label="TS"
                  ariaLabel={`Competenza tiro salvezza ${name}`}
                  checked={data.saveProficiencies[a]}
                  onChange={(v) => set('saveProficiencies', { ...data.saveProficiencies, [a]: v })}
                />
                <output aria-label={`Tiro salvezza ${name}`}>{signed(savingThrow(data, a))}</output>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export function SkillsSection({ data, onChange }: TabProps) {
  const set = fieldSetter(data, onChange);
  return (
    <Section title="Abilità">
      {hasJackOfAllTrades(data) && <p className="muted">Factotum (Bardo): metà competenza alle prove senza competenza.</p>}
      <ul className="skills">
        {SKILLS.map((s) => {
          const name = SKILL_LABEL[s];
          const entry = data.skills[s];
          return (
            <li className="skill" key={s}>
              <ProficiencyToggle
                label={name}
                level={entry.level}
                onChange={(v) => set('skills', { ...data.skills, [s]: { ...entry, level: v } })}
              />
              <span className="skill-name">
                {name} <small className="muted">({ABILITY_LABEL[SKILL_ABILITY[s]].short})</small>
              </span>
              <NumberInput
                hideLabel
                label={`Bonus extra ${name}`}
                value={entry.bonus}
                min={-20}
                max={20}
                onChange={(v) => set('skills', { ...data.skills, [s]: { ...entry, bonus: v } })}
              />
              <output className="skill-value" aria-label={`Bonus ${name}`}>
                {signed(skillBonus(data, s))}
              </output>
            </li>
          );
        })}
      </ul>
      <div className="stats-row">
        <Stat label="Percezione passiva" value={passivePerception(data)} />
      </div>
    </Section>
  );
}

export function ProficienciesSection({ data, onChange }: TabProps) {
  const other = data.otherProficiencies;
  const setOther = (patch: Partial<typeof other>) => onChange({ ...data, otherProficiencies: { ...other, ...patch } });
  return (
    <Section title="Altre competenze">
      <TextArea label="Lingue" rows={2} value={other.languages} onChange={(v) => setOther({ languages: v })} />
      <TextArea label="Strumenti" rows={2} value={other.tools} onChange={(v) => setOther({ tools: v })} />
      <TextArea label="Armi" rows={2} value={other.weapons} onChange={(v) => setOther({ weapons: v })} />
      <TextArea label="Armature" rows={2} value={other.armor} onChange={(v) => setOther({ armor: v })} />
    </Section>
  );
}
