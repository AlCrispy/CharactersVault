import { Checkbox, NumberInput, Section, Select, Stat, TextArea, TextInput } from '../../../ui/fields';
import { signed } from '../../../ui/format';
import { ABILITY_LABEL, SKILL_LABEL } from '../labels';
import { ABILITIES, HIT_DIE_KEYS, newClass, SKILL_ABILITY, SKILLS, type Dnd5eCharacter, type HitDie, type HitDieKey } from '../model';
import { abilityModifier, passivePerception, proficiencyBonus, savingThrow, skillBonus, totalLevel } from '../rules';
import { removeById, updateById } from './listOps';
import { ProficiencyToggle } from './ProficiencyToggle';
import type { TabProps } from './types';

const DIE_OPTIONS = HIT_DIE_KEYS.map((k) => ({ value: k, label: k }));

export function MainTab({ data, onChange }: TabProps) {
  const set = <K extends keyof Dnd5eCharacter>(key: K, value: Dnd5eCharacter[K]) => onChange({ ...data, [key]: value });
  const level = totalLevel(data);
  const other = data.otherProficiencies;

  return (
    <>
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

      <Section
        title="Classi"
        actions={
          <button type="button" className="btn small" onClick={() => set('classes', [...data.classes, newClass()])}>
            + Classe
          </button>
        }
      >
        {data.classes.map((k) => {
          const patch = (p: Partial<typeof k>) => set('classes', updateById(data.classes, k.id, p));
          return (
            <div className="row" key={k.id}>
              <TextInput label="Classe" value={k.name} onChange={(v) => patch({ name: v })} />
              <TextInput label="Sottoclasse" value={k.subclass} onChange={(v) => patch({ subclass: v })} />
              <NumberInput label="Livello" className="narrow" value={k.level} min={1} max={20} onChange={(v) => patch({ level: v })} />
              <Select<HitDieKey>
                label="Dado vita"
                value={`d${k.hitDie}`}
                options={DIE_OPTIONS}
                onChange={(v) => patch({ hitDie: Number(v.slice(1)) as HitDie })}
              />
              <button
                type="button"
                className="btn small danger"
                aria-label={`Rimuovi classe ${k.name}`}
                onClick={() => set('classes', removeById(data.classes, k.id))}
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

      <Section title="Abilità">
        <Checkbox
          label="Factotum (metà competenza alle prove senza competenza)"
          checked={data.jackOfAllTrades}
          onChange={(v) => set('jackOfAllTrades', v)}
        />
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

      <Section title="Altre competenze">
        <TextArea label="Lingue" rows={2} value={other.languages} onChange={(v) => set('otherProficiencies', { ...other, languages: v })} />
        <TextArea label="Strumenti" rows={2} value={other.tools} onChange={(v) => set('otherProficiencies', { ...other, tools: v })} />
        <TextArea label="Armi" rows={2} value={other.weapons} onChange={(v) => set('otherProficiencies', { ...other, weapons: v })} />
        <TextArea label="Armature" rows={2} value={other.armor} onChange={(v) => set('otherProficiencies', { ...other, armor: v })} />
      </Section>
    </>
  );
}
