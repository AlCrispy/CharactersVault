import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createBlank } from '../model';
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

  it('gestisce gli slot', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    const max = panel().getByLabelText('Slot 1° livello');
    await user.clear(max);
    await user.type(max, '2');
    const boxes = within(panel().getByRole('group', { name: 'Slot usati 1° livello' })).getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    await user.click(boxes[0]);
    expect(data().spellcasting.slots[0]).toEqual({ max: 2, used: 1 });
  });

  it('ridurre il massimo riduce anche gli usati', async () => {
    const user = userEvent.setup();
    const c = createBlank();
    c.spellcasting.slots[0] = { max: 3, used: 3 };
    const { data } = renderSheet(c);
    const max = panel().getByLabelText('Slot 1° livello');
    await user.clear(max);
    await user.type(max, '1');
    expect(data().spellcasting.slots[0]).toEqual({ max: 1, used: 1 });
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
