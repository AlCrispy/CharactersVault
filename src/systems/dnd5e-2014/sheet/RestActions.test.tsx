import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ConfirmProvider } from '../../../ui/confirm';
import { createBlank, newClass, type Dnd5eCharacter } from '../model';
import { RestActions } from './RestActions';
import { Sheet } from './Sheet';

function wounded() {
  const c = createBlank();
  c.classes = [{ ...newClass(), level: 3, classId: 'rogue' }];
  c.hp = { max: 20, current: 5, temp: 5 };
  return c;
}

/** Header con i riposi + scheda, con stato condiviso come in SheetHost. */
function renderWithRests(initial: Dnd5eCharacter) {
  const latest = { current: initial };
  function Harness() {
    const [data, setData] = useState(initial);
    latest.current = data;
    return (
      <ConfirmProvider>
        <RestActions data={data} onChange={setData} />
        <Sheet data={data} onChange={setData} />
      </ConfirmProvider>
    );
  }
  render(<Harness />);
  return { data: () => latest.current };
}

describe('riposi', () => {
  it('riposo breve in una finestra: spende dadi vita e recupera PF', async () => {
    const user = userEvent.setup();
    const { data } = renderWithRests(wounded());
    await user.click(screen.getByRole('button', { name: 'Riposo breve' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Riposo breve' }));
    const spend = dialog.getByLabelText('Spendi d8');
    await user.clear(spend);
    await user.type(spend, '2');
    const hp = dialog.getByLabelText('PF recuperati');
    await user.clear(hp);
    await user.type(hp, '9');
    await user.click(dialog.getByRole('button', { name: 'Conferma riposo breve' }));
    expect(data().hitDiceUsed.d8).toBe(2);
    expect(data().hp.current).toBe(14);
    expect(screen.getByLabelText('Dadi vita d8 disponibili')).toHaveTextContent('1 / 3');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Esc chiude la finestra senza cambiare nulla', async () => {
    const user = userEvent.setup();
    const { data } = renderWithRests(wounded());
    await user.click(screen.getByRole('button', { name: 'Riposo breve' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(data().hp.current).toBe(5);
  });

  it('riposo lungo dopo conferma ricarica anche le risorse', async () => {
    const user = userEvent.setup();
    const c = wounded();
    c.classes = [{ ...newClass(), level: 5, classId: 'monk' }];
    c.classResourcesUsed = { ki: 4 };
    const { data } = renderWithRests(c);
    await user.click(screen.getByRole('button', { name: 'Riposo lungo' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Riposo lungo' })).getByRole('button', { name: 'Riposa' }));
    expect(data().hp).toEqual({ max: 20, current: 20, temp: 0 });
    expect(data().classResourcesUsed).toEqual({});
  });

  it('riposo lungo annullato non cambia nulla', async () => {
    const user = userEvent.setup();
    const { data } = renderWithRests(wounded());
    await user.click(screen.getByRole('button', { name: 'Riposo lungo' }));
    await user.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(data().hp.current).toBe(5);
  });
});
