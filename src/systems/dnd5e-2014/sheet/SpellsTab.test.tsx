import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createBlank, newClass } from '../model';
import { renderSheet } from './testUtils';

function panel() {
  return within(screen.getByRole('tabpanel', { name: 'Incantesimi' }));
}

describe('tab Incantesimi', () => {
  it('calcola CD e attacco dalla caratteristica scelta', async () => {
    const user = userEvent.setup();
    const c = createBlank();
    c.abilities.int = 16;
    renderSheet(c);
    expect(panel().getByLabelText('CD incantesimi')).toHaveTextContent('—');
    await user.selectOptions(panel().getByLabelText('Caratteristica da incantatore'), 'int');
    expect(panel().getByLabelText('CD incantesimi')).toHaveTextContent('13');
    expect(panel().getByLabelText('Attacco con incantesimi')).toHaveTextContent('+5');
  });

  it('calcola gli slot dalle classi e segna quelli usati', async () => {
    const user = userEvent.setup();
    const c = createBlank();
    c.classes = [{ ...newClass(), classId: 'wizard', level: 3 }];
    const { data } = renderSheet(c);
    const first = within(panel().getByRole('group', { name: 'Slot usati 1° livello' })).getAllByRole('checkbox');
    expect(first).toHaveLength(4);
    expect(within(panel().getByRole('group', { name: 'Slot usati 2° livello' })).getAllByRole('checkbox')).toHaveLength(2);
    expect(panel().queryByRole('group', { name: 'Slot usati 3° livello' })).toBeNull();
    await user.click(first[0]);
    expect(data().spellcasting.slotsUsed[0]).toBe(1);
  });

  it('senza classi incantatrici non mostra gli slot', () => {
    const c = createBlank();
    c.classes = [{ ...newClass(), classId: 'fighter', level: 5 }];
    renderSheet(c);
    expect(panel().queryByRole('heading', { name: 'Slot incantesimo' })).toBeNull();
  });

  it('mostra la magia del patto del warlock', async () => {
    const user = userEvent.setup();
    const c = createBlank();
    c.classes = [{ ...newClass(), classId: 'warlock', level: 5 }];
    const { data } = renderSheet(c);
    expect(panel().getByRole('heading', { name: 'Magia del patto' })).toBeInTheDocument();
    const boxes = within(panel().getByRole('group', { name: 'Slot patto usati' })).getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    await user.click(boxes[0]);
    expect(data().spellcasting.pactUsed).toBe(1);
  });

  it('aggiunge e rimuove incantesimi', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.click(panel().getByRole('button', { name: '+ Incantesimo' }));
    await user.type(panel().getByLabelText('Nome incantesimo'), 'Dardo incantato');
    const level = panel().getByLabelText('Livello incantesimo');
    await user.clear(level);
    await user.type(level, '1');
    await user.click(panel().getByLabelText('Preparato'));
    expect(data().spellcasting.spells[0]).toMatchObject({ name: 'Dardo incantato', level: 1, prepared: true });
    await user.click(panel().getByRole('button', { name: 'Rimuovi incantesimo' }));
    expect(data().spellcasting.spells).toHaveLength(0);
  });
});
