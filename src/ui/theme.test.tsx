import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemePicker } from './ThemePicker';
import { applyTheme, getStoredTheme } from './theme';

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('tema', () => {
  it('di default è Grimorio', () => {
    expect(getStoredTheme()).toBe('grimoire');
  });

  it('ignora valori sconosciuti salvati', () => {
    localStorage.setItem('characters-vault:theme', 'boh');
    expect(getStoredTheme()).toBe('grimoire');
  });

  it('applyTheme imposta data-theme', () => {
    applyTheme('heraldic');
    expect(document.documentElement.dataset.theme).toBe('heraldic');
  });

  it('il selettore applica e ricorda il tema', async () => {
    const user = userEvent.setup();
    render(<ThemePicker />);
    await user.selectOptions(screen.getByLabelText('Tema'), 'heraldic');
    expect(document.documentElement.dataset.theme).toBe('heraldic');
    expect(getStoredTheme()).toBe('heraldic');
  });
});
