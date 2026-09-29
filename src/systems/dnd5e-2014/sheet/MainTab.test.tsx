import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderSheet } from './testUtils';

function panel() {
  return within(screen.getByRole('tabpanel', { name: 'Principale' }));
}

function classesPanel() {
  return within(screen.getByRole('tabpanel', { name: 'Classi' }));
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
    expect(panel().queryByText(/Factotum/)).toBeNull();
    await user.selectOptions(classesPanel().getByLabelText('Classe'), 'bard');
    const level = classesPanel().getByLabelText('Livello');
    await user.clear(level);
    await user.type(level, '5');
    expect(classesPanel().getByLabelText('Bonus competenza')).toHaveTextContent('+3');

    const stealth = panel().getByRole('button', { name: /^Competenza Furtività/ });
    await user.click(stealth);
    await user.click(stealth);
    expect(stealth).toHaveAccessibleName('Competenza Furtività: maestria');
    expect(panel().getByLabelText('Bonus Furtività')).toHaveTextContent('+6');

    expect(panel().getByText(/Factotum/)).toBeInTheDocument();
    expect(panel().getByLabelText('Bonus Atletica')).toHaveTextContent('+1');
  });

  it('aggiunge e rimuove classi', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.click(classesPanel().getByRole('button', { name: '+ Classe' }));
    expect(classesPanel().getAllByLabelText('Classe')).toHaveLength(2);
    expect(classesPanel().getByLabelText('Livello totale')).toHaveTextContent('2');
    await user.click(classesPanel().getAllByRole('button', { name: /Rimuovi classe/ })[0]);
    expect(data().classes).toHaveLength(1);
  });

  it('la classe scelta dà dado vita e caratteristica da incantatore', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    expect(classesPanel().getByLabelText('Dado vita')).toHaveTextContent('—');
    await user.selectOptions(classesPanel().getByLabelText('Classe'), 'paladin');
    expect(data().classes[0].classId).toBe('paladin');
    expect(classesPanel().getByLabelText('Dado vita')).toHaveTextContent('d10');
    expect(data().spellcasting.ability).toBe('cha');
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
