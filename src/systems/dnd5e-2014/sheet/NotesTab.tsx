import { Section, TextArea } from '../../../ui/fields';
import type { Dnd5eCharacter } from '../model';
import type { TabProps } from './types';

function noteSetter({ data, onChange }: TabProps) {
  return (key: keyof Dnd5eCharacter['notes'], value: string) => onChange({ ...data, notes: { ...data.notes, [key]: value } });
}

export function PersonalitySection(props: TabProps) {
  const { notes } = props.data;
  const setNote = noteSetter(props);
  return (
    <Section title="Personalità">
      <TextArea label="Tratti della personalità" rows={3} value={notes.traits} onChange={(v) => setNote('traits', v)} />
      <TextArea label="Ideali" rows={2} value={notes.ideals} onChange={(v) => setNote('ideals', v)} />
      <TextArea label="Legami" rows={2} value={notes.bonds} onChange={(v) => setNote('bonds', v)} />
      <TextArea label="Difetti" rows={2} value={notes.flaws} onChange={(v) => setNote('flaws', v)} />
    </Section>
  );
}

export function NotesSection(props: TabProps) {
  const setNote = noteSetter(props);
  return (
    <Section title="Note">
      <TextArea label="Note" rows={10} value={props.data.notes.free} onChange={(v) => setNote('free', v)} />
    </Section>
  );
}
