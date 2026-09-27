import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { renderSheet } from './testUtils';

it('mostra 6 tab e cambia quello attivo', async () => {
  const user = userEvent.setup();
  renderSheet();
  const tabs = screen.getAllByRole('tab');
  expect(tabs.map((t) => t.textContent)).toEqual(['Principale', 'Combattimento', 'Incantesimi', 'Inventario', 'Privilegi', 'Note']);
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  await user.click(screen.getByRole('tab', { name: 'Note' }));
  expect(screen.getByRole('tab', { name: 'Note' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel', { name: 'Note' })).toHaveAttribute('data-active', 'true');
  expect(screen.getByRole('tabpanel', { name: 'Principale' })).toHaveAttribute('data-active', 'false');
});
