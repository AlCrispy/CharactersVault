import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it } from 'vitest';
import { db } from '../core/db';
import { createCharacter, getCharacter, putCharacters } from '../core/repository';
import '../systems';
import { dnd5e } from '../systems/dnd5e-2014';
import { SheetHost } from './SheetHost';

beforeEach(async () => {
  await db.characters.clear();
});

it('carica la scheda e salva automaticamente', async () => {
  const user = userEvent.setup();
  const rec = await createCharacter(dnd5e, 'Thorin');
  render(<SheetHost id={rec.id} />);
  const name = await screen.findByLabelText('Nome personaggio');
  expect(name).toHaveValue('Thorin');
  await user.type(name, ' Scudodiquercia');
  expect(await screen.findByText('Salvato', {}, { timeout: 2000 })).toBeInTheDocument();
  expect((await getCharacter(rec.id))?.name).toBe('Thorin Scudodiquercia');
});

it('personaggio inesistente', async () => {
  render(<SheetHost id="nope" />);
  expect(await screen.findByText('Personaggio non trovato.')).toBeInTheDocument();
});

it('scheda danneggiata', async () => {
  const ts = new Date().toISOString();
  await putCharacters([{ id: 'bad', systemId: 'dnd5e-2014', schemaVersion: 1, name: 'Rotto', createdAt: ts, updatedAt: ts, data: {} }]);
  render(<SheetHost id="bad" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Impossibile aprire la scheda');
});

it("mostra i riposi del sistema nell'header", async () => {
  const rec = await createCharacter(dnd5e, 'Thorin');
  render(<SheetHost id={rec.id} />);
  const header = (await screen.findByText('Thorin')).closest('header')!;
  expect(header).toContainElement(screen.getByRole('button', { name: 'Riposo breve' }));
  expect(header).toContainElement(screen.getByRole('button', { name: 'Riposo lungo' }));
});
