import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderSheet } from './testUtils';

function panel() {
  return within(screen.getByRole('tabpanel', { name: 'Privilegi' }));
}

describe('tab Privilegi', () => {
  it('aggiunge un privilegio con utilizzi limitati', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.click(panel().getByRole('button', { name: '+ Privilegio' }));
    await user.type(panel().getByLabelText('Nome privilegio'), 'Secondo fiato');
    await user.click(panel().getByLabelText('Utilizzi limitati'));
    await user.selectOptions(panel().getByLabelText('Ripristino'), 'short');
    const boxes = within(panel().getByRole('group', { name: 'Utilizzi Secondo fiato' })).getAllByRole('checkbox');
    expect(boxes).toHaveLength(1);
    await user.click(boxes[0]);
    expect(data().features[0]).toMatchObject({ name: 'Secondo fiato', uses: { max: 1, used: 1, recharge: 'short' } });
  });

  it('togliere utilizzi limitati imposta uses a null', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.click(panel().getByRole('button', { name: '+ Privilegio' }));
    await user.click(panel().getByLabelText('Utilizzi limitati'));
    await user.click(panel().getByLabelText('Utilizzi limitati'));
    expect(data().features[0].uses).toBeNull();
  });

  it('rimuove un privilegio', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.click(panel().getByRole('button', { name: '+ Privilegio' }));
    await user.click(panel().getByRole('button', { name: 'Rimuovi privilegio' }));
    expect(data().features).toHaveLength(0);
  });
});
