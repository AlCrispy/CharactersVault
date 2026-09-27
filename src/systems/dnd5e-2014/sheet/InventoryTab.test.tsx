import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createBlank } from '../model';
import { renderSheet } from './testUtils';

function panel() {
  return within(screen.getByRole('tabpanel', { name: 'Inventario' }));
}

async function replace(user: ReturnType<typeof userEvent.setup>, el: HTMLElement, text: string) {
  await user.clear(el);
  await user.type(el, text);
}

describe('tab Inventario', () => {
  it('calcola peso di oggetti e monete e capacità', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    expect(panel().getByLabelText('Capacità di carico')).toHaveTextContent('75 kg');

    await user.click(panel().getByRole('button', { name: '+ Oggetto' }));
    await user.type(panel().getByLabelText('Nome oggetto'), 'Corda');
    await replace(user, panel().getByLabelText('Quantità'), '2');
    await replace(user, panel().getByLabelText('Peso (kg)'), '1,5');
    expect(panel().getByLabelText('Peso trasportato')).toHaveTextContent('3 kg');

    await replace(user, panel().getByLabelText('mo'), '100');
    expect(panel().getByLabelText('Peso trasportato')).toHaveTextContent('4 kg');
    expect(data().inventory.coins.gp).toBe(100);
    expect(data().inventory.items[0]).toMatchObject({ name: 'Corda', quantity: 2, weightKg: 1.5 });
  });

  it('avvisa se si supera la capacità di carico', async () => {
    const c = createBlank();
    c.abilities.str = 1;
    c.inventory.coins.gp = 1000;
    renderSheet(c);
    expect(panel().getByRole('alert')).toHaveTextContent(/capacità di carico/);
  });

  it('rimuove un oggetto', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.click(panel().getByRole('button', { name: '+ Oggetto' }));
    await user.click(panel().getByRole('button', { name: 'Rimuovi oggetto' }));
    expect(data().inventory.items).toHaveLength(0);
  });
});
