import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from './App';

it("mostra il titolo dell'app", () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Characters Vault' })).toBeInTheDocument();
});
