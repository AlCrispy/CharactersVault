import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ConfirmProvider, useConfirm, type ConfirmOptions } from './confirm';

function Asker({ options, onResult }: { options: ConfirmOptions; onResult: (ok: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <button type="button" onClick={async () => onResult(await confirm(options))}>
      Chiedi
    </button>
  );
}

function setup(options: ConfirmOptions) {
  const results: boolean[] = [];
  render(
    <ConfirmProvider>
      <Asker options={options} onResult={(ok) => results.push(ok)} />
    </ConfirmProvider>,
  );
  return results;
}

describe('conferma a tema', () => {
  it('mostra titolo, messaggio e tasti e risolve true su conferma', async () => {
    const user = userEvent.setup();
    const results = setup({ title: 'Riposo lungo', message: 'Ripristinare tutto?', confirmLabel: 'Riposa' });
    await user.click(screen.getByRole('button', { name: 'Chiedi' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Riposo lungo' }));
    expect(dialog.getByText('Ripristinare tutto?')).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Riposa' }));
    expect(results).toEqual([true]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Annulla ed Esc risolvono false', async () => {
    const user = userEvent.setup();
    const results = setup({ title: 'Eliminare?', message: 'Non si può annullare.', danger: true });
    await user.click(screen.getByRole('button', { name: 'Chiedi' }));
    await user.click(screen.getByRole('button', { name: 'Annulla' }));
    await user.click(screen.getByRole('button', { name: 'Chiedi' }));
    await user.keyboard('{Escape}');
    expect(results).toEqual([false, false]);
  });

  it('per le azioni distruttive il fuoco parte da Annulla', async () => {
    const user = userEvent.setup();
    setup({ title: 'Eliminare?', message: 'Non si può annullare.', danger: true, confirmLabel: 'Elimina' });
    await user.click(screen.getByRole('button', { name: 'Chiedi' }));
    expect(screen.getByRole('button', { name: 'Annulla' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Elimina' })).toHaveClass('danger');
  });
});
