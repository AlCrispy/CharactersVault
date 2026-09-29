import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../core/db';
import { buildExportFile } from '../core/importExport';
import { createCharacter, putCharacters } from '../core/repository';
import '../systems';
import { dnd5e } from '../systems/dnd5e-2014';
import { ConfirmProvider } from '../ui/confirm';
import { CharacterList } from './CharacterList';

beforeEach(async () => {
  await db.characters.clear();
  localStorage.clear();
  window.location.hash = '';
});

function row(name: string) {
  return screen.getByText(name).closest('li') as HTMLElement;
}

describe('CharacterList', () => {
  it('crea un personaggio e apre la scheda', async () => {
    const user = userEvent.setup();
    render(<CharacterList persisted={true} />);
    await user.type(screen.getByLabelText('Nome'), 'Thorin');
    await user.click(screen.getByRole('button', { name: 'Crea' }));
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/c\/.+/));
    const all = await db.characters.toArray();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ name: 'Thorin', systemId: 'dnd5e-2014' });
  });

  it('mostra i personaggi con sistema e riepilogo', async () => {
    await createCharacter(dnd5e, 'Lia');
    render(<CharacterList persisted={true} />);
    expect(await screen.findByText('Lia')).toBeInTheDocument();
    expect(within(row('Lia')).getByText('D&D 5e (2014) · Livello 1')).toBeInTheDocument();
    expect(screen.getByText('Nessun backup eseguito.')).toBeInTheDocument();
  });

  it('elimina dopo conferma', async () => {
    const user = userEvent.setup();
    await createCharacter(dnd5e, 'Lia');
    render(
      <ConfirmProvider>
        <CharacterList persisted={true} />
      </ConfirmProvider>,
    );
    await screen.findByText('Lia');
    await user.click(within(row('Lia')).getByRole('button', { name: 'Elimina' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Eliminare il personaggio?' }));
    expect(dialog.getByText(/"Lia" verrà eliminato/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Elimina' }));
    await waitFor(async () => expect(await db.characters.count()).toBe(0));
  });

  it('non elimina se annullato', async () => {
    const user = userEvent.setup();
    await createCharacter(dnd5e, 'Lia');
    render(
      <ConfirmProvider>
        <CharacterList persisted={true} />
      </ConfirmProvider>,
    );
    await screen.findByText('Lia');
    await user.click(within(row('Lia')).getByRole('button', { name: 'Elimina' }));
    await user.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await db.characters.count()).toBe(1);
  });

  it('duplica', async () => {
    const user = userEvent.setup();
    await createCharacter(dnd5e, 'Lia');
    render(<CharacterList persisted={true} />);
    await screen.findByText('Lia');
    await user.click(within(row('Lia')).getByRole('button', { name: 'Duplica' }));
    expect(await screen.findByText('Lia (copia)')).toBeInTheDocument();
  });

  it('segnala schede danneggiate e sistemi sconosciuti', async () => {
    const ts = new Date().toISOString();
    await putCharacters([
      { id: 'bad', systemId: 'dnd5e-2014', schemaVersion: 1, name: 'Rotto', createdAt: ts, updatedAt: ts, data: { foo: 1 } },
      { id: 'alien', systemId: 'boh', schemaVersion: 1, name: 'Alieno', createdAt: ts, updatedAt: ts, data: {} },
    ]);
    render(<CharacterList persisted={true} />);
    await screen.findByText('Rotto');
    expect(within(row('Rotto')).getByText('Scheda danneggiata')).toBeInTheDocument();
    expect(within(row('Rotto')).queryByRole('button', { name: 'Duplica' })).not.toBeInTheDocument();
    expect(within(row('Alieno')).getByText('Sistema sconosciuto: boh')).toBeInTheDocument();
  });

  it('importa un file', async () => {
    const ts = new Date().toISOString();
    const data = dnd5e.withName(dnd5e.createBlank(), 'Importato');
    const text = JSON.stringify(
      buildExportFile([{ id: 'imp', systemId: 'dnd5e-2014', schemaVersion: 1, name: 'Importato', createdAt: ts, updatedAt: ts, data }]),
    );
    render(<CharacterList persisted={true} />);
    fireEvent.change(screen.getByTestId('import-input'), {
      target: { files: [new File([text], 'imp.json', { type: 'application/json' })] },
    });
    expect(await screen.findByText('Importato')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Importati 1 personaggi.');
  });

  it('segnala file non validi', async () => {
    render(<CharacterList persisted={true} />);
    fireEvent.change(screen.getByTestId('import-input'), {
      target: { files: [new File(['non json'], 'x.json')] },
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Il file non è un JSON valido.');
  });

  it('avvisa se lo storage non è persistente', () => {
    render(<CharacterList persisted={false} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/backup/);
  });
});
