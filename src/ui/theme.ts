import { useState } from 'react';

export const THEMES = [
  { id: 'grimoire', label: 'Grimorio', color: '#0e0b08' },
  { id: 'heraldic', label: 'Araldico', color: '#0f1626' },
] as const;
export type ThemeId = (typeof THEMES)[number]['id'];

const THEME_KEY = 'characters-vault:theme';
const DEFAULT_THEME: ThemeId = 'grimoire';

const isTheme = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

export function getStoredTheme(): ThemeId {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return isTheme(value) ? value : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Applica il tema a `<html data-theme>` e alla barra del browser. */
export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id;
  const color = THEMES.find((t) => t.id === id)!.color;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

export function useTheme(): [ThemeId, (id: ThemeId) => void] {
  const [theme, setTheme] = useState(getStoredTheme);
  function change(id: ThemeId) {
    setTheme(id);
    applyTheme(id);
    try {
      localStorage.setItem(THEME_KEY, id);
    } catch {
      // localStorage non disponibile: il tema vale solo per questa sessione.
    }
  }
  return [theme, change];
}
