import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from './App';

it('mostra la lista personaggi e avvisa se lo storage non è persistente', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Characters Vault' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Nuovo personaggio' })).toBeInTheDocument();
  // jsdom non espone navigator.storage.persist → persistenza non garantita.
  expect(await screen.findByRole('alert')).toBeInTheDocument();
});
