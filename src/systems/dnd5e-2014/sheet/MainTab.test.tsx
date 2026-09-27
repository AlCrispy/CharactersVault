import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderSheet } from './testUtils';

function panel() {
  return within(screen.getByRole('tabpanel', { name: 'Principale' }));
}

describe('tab Principale', () => {
  it('aggiorna il modificatore quando cambia il punteggio', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    const input = panel().getByLabelText('Forza');
    await user.clear(input);
    await user.type(input, '16');
    expect(panel().getByLabelText('Modificatore Forza')).toHaveTextContent('+3');
    expect(data().abilities.str).toBe(16);
  });

  it('tiro salvezza con competenza', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.click(panel().getByLabelText('Competenza tiro salvezza Destrezza'));
    expect(data().saveProficiencies.dex).toBe(true);
    expect(panel().getByLabelText('Tiro salvezza Destrezza')).toHaveTextContent('+2');
  });

  it('maestria e factotum cambiano i bonus delle abilità', async () => {
    const user = userEvent.setup();
    renderSheet();
    const level = panel().getByLabelText('Livello');
    await user.clear(level);
    await user.type(level, '5');
    expect(panel().getByLabelText('Bonus competenza')).toHaveTextContent('+3');

    await user.selectOptions(panel().getByLabelText('Competenza Furtività'), 'expertise');
    expect(panel().getByLabelText('Bonus Furtività')).toHaveTextContent('+6');

    await user.click(panel().getByLabelText(/Factotum/));
    expect(panel().getByLabelText('Bonus Atletica')).toHaveTextContent('+1');
  });

  it('aggiunge e rimuove classi', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.click(panel().getByRole('button', { name: '+ Classe' }));
    expect(panel().getAllByLabelText('Classe')).toHaveLength(2);
    expect(panel().getByLabelText('Livello totale')).toHaveTextContent('2');
    await user.click(panel().getAllByRole('button', { name: /Rimuovi classe/ })[0]);
    expect(data().classes).toHaveLength(1);
  });

  it('modifica identità', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.type(panel().getByLabelText('Nome personaggio'), 'Lia');
    await user.type(panel().getByLabelText('Razza'), 'Elfo');
    expect(data().name).toBe('Lia');
    expect(data().race).toBe('Elfo');
  });
});
