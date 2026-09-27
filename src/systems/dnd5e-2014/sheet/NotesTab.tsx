import { Section, TextArea } from '../../../ui/fields';
import type { Dnd5eCharacter } from '../model';
import type { TabProps } from './types';

export function NotesTab({ data, onChange }: TabProps) {
  const setNote = (key: keyof Dnd5eCharacter['notes'], value: string) => onChange({ ...data, notes: { ...data.notes, [key]: value } });

  return (
    <>
      <Section title="Personalità">
        <TextArea label="Tratti della personalità" rows={3} value={data.notes.traits} onChange={(v) => setNote('traits', v)} />
        <TextArea label="Ideali" rows={2} value={data.notes.ideals} onChange={(v) => setNote('ideals', v)} />
        <TextArea label="Legami" rows={2} value={data.notes.bonds} onChange={(v) => setNote('bonds', v)} />
        <TextArea label="Difetti" rows={2} value={data.notes.flaws} onChange={(v) => setNote('flaws', v)} />
      </Section>
      <Section title="Note">
        <TextArea label="Note" rows={10} value={data.notes.free} onChange={(v) => setNote('free', v)} />
      </Section>
    </>
  );
}
