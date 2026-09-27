import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createBlank, newClass } from '../model';
import { renderSheet } from './testUtils';

function panel() {
  return within(screen.getByRole('tabpanel', { name: 'Combattimento' }));
}

function wounded() {
  const c = createBlank();
  c.classes = [{ ...newClass(), level: 3, hitDie: 8 }];
  c.hp = { max: 20, current: 20, temp: 5 };
  return c;
}

describe('tab Combattimento', () => {
  it('il danno scala prima i PF temporanei', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet(wounded());
    const amount = panel().getByLabelText('Quantità');
    await user.clear(amount);
    await user.type(amount, '8');
    await user.click(panel().getByRole('button', { name: 'Danno' }));
    expect(data().hp).toEqual({ max: 20, current: 17, temp: 0 });
    expect(panel().getByLabelText('PF attuali')).toHaveTextContent('17 / 20');
    expect(amount).toHaveValue('0');
  });

  it('la cura non supera il massimo', async () => {
    const user = userEvent.setup();
    const c = wounded();
    c.hp.current = 15;
    const { data } = renderSheet(c);
    const amount = panel().getByLabelText('Quantità');
    await user.clear(amount);
    await user.type(amount, '10');
    await user.click(panel().getByRole('button', { name: 'Cura' }));
    expect(data().hp.current).toBe(20);
  });

  it('riposo breve spende dadi vita e recupera PF', async () => {
    const user = userEvent.setup();
    const c = wounded();
    c.hp.current = 5;
    const { data } = renderSheet(c);
    await user.click(panel().getByRole('button', { name: 'Riposo breve' }));
    const spend = panel().getByLabelText('Spendi d8');
    await user.clear(spend);
    await user.type(spend, '2');
    const hp = panel().getByLabelText('PF recuperati');
    await user.clear(hp);
    await user.type(hp, '9');
    await user.click(panel().getByRole('button', { name: 'Conferma riposo breve' }));
    expect(data().hitDiceUsed.d8).toBe(2);
    expect(data().hp.current).toBe(14);
    expect(panel().getByLabelText('Dadi vita d8 disponibili')).toHaveTextContent('1 / 3');
    expect(panel().queryByLabelText('PF recuperati')).not.toBeInTheDocument();
  });

  it('riposo lungo dopo conferma', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const c = wounded();
    c.hp.current = 1;
    const { data } = renderSheet(c);
    await user.click(panel().getByRole('button', { name: 'Riposo lungo' }));
    expect(data().hp).toEqual({ max: 20, current: 20, temp: 0 });
  });

  it('riposo lungo annullato non cambia nulla', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const c = wounded();
    c.hp.current = 1;
    const { data } = renderSheet(c);
    await user.click(panel().getByRole('button', { name: 'Riposo lungo' }));
    expect(data().hp.current).toBe(1);
  });

  it('CA con armatura media e scudo', async () => {
    const user = userEvent.setup();
    const c = createBlank();
    c.abilities.dex = 18;
    renderSheet(c);
    await user.selectOptions(panel().getByLabelText('Protezione'), 'medium');
    const base = panel().getByLabelText('CA base armatura');
    await user.clear(base);
    await user.type(base, '14');
    await user.click(panel().getByLabelText('Scudo (+2)'));
    expect(panel().getByLabelText('Classe Armatura')).toHaveTextContent('18');
  });

  it('attacco mostra tiro per colpire e danno', async () => {
    const user = userEvent.setup();
    const c = createBlank();
    c.abilities.str = 16;
    renderSheet(c);
    await user.click(panel().getByRole('button', { name: '+ Attacco' }));
    await user.type(panel().getByLabelText('Nome attacco'), 'Spada');
    expect(panel().getByLabelText('Tiro per colpire Spada')).toHaveTextContent('+5');
    expect(panel().getByLabelText('Danno Spada')).toHaveTextContent('1d6 + 3');
  });
});
