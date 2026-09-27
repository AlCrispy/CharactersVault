import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { renderSheet } from './testUtils';

it('salva le note', async () => {
  const user = userEvent.setup();
  const { data } = renderSheet();
  const panel = within(screen.getByRole('tabpanel', { name: 'Note' }));
  await user.type(panel.getByLabelText('Ideali'), 'Libertà');
  await user.type(panel.getByLabelText('Note'), 'Deve 10 mo a Bob');
  expect(data().notes.ideals).toBe('Libertà');
  expect(data().notes.free).toBe('Deve 10 mo a Bob');
});
