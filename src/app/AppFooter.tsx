import { ThemePicker } from '../ui/ThemePicker';

/** Footer comune a tutte le pagine: preferenze dell'app. */
export function AppFooter() {
  return (
    <footer className="app-footer">
      <span className="app-footer-name">Characters Vault</span>
      <ThemePicker />
    </footer>
  );
}
