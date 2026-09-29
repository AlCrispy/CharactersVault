import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderSheet } from './testUtils';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    value: (q: string) => ({ matches: q === '(min-width: 1024px)', addEventListener() {}, removeEventListener() {} }),
    configurable: true,
  });
});

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia');
});

function headings(panel: string) {
  return within(screen.getByRole('tabpanel', { name: panel }))
    .getAllByRole('heading', { level: 2 })
    .map((h) => h.textContent);
}

describe('layout desktop', () => {
  it('raggruppa le card in 4 tab', async () => {
    const user = userEvent.setup();
    renderSheet();
    expect(screen.getAllByRole('tab').map((t) => t.getAttribute('aria-label'))).toEqual([
      'Eroe',
      'Classi',
      'Magia ed equipaggiamento',
      'Privilegi e storia',
    ]);
    expect(headings('Eroe')).toEqual([
      'Identità',
      'Altre competenze',
      'Caratteristiche',
      'Abilità',
      'Punti ferita',
      'Difesa e movimento',
      'Condizioni',
      'Attacchi',
    ]);
    expect(headings('Classi')).toEqual(['Classi']);
    expect(headings('Magia ed equipaggiamento')).toEqual(['Incantatore', 'Incantesimi', 'Monete', 'Oggetti']);
    expect(headings('Privilegi e storia')).toEqual(['Privilegi e tratti', 'Personalità', 'Note']);

    await user.click(screen.getByRole('tab', { name: 'Privilegi e storia' }));
    expect(screen.getByRole('tabpanel', { name: 'Privilegi e storia' })).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Eroe' })).toHaveAttribute('data-active', 'false');
  });

  it('le card funzionano anche nel layout desktop', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    const eroe = within(screen.getByRole('tabpanel', { name: 'Eroe' }));
    const str = eroe.getByLabelText('Forza');
    await user.clear(str);
    await user.type(str, '18');
    expect(eroe.getByLabelText('Modificatore Forza')).toHaveTextContent('+4');
    expect(data().abilities.str).toBe(18);
  });
});
