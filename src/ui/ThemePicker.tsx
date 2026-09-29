import { Select } from './fields';
import { THEMES, useTheme } from './theme';

const OPTIONS = THEMES.map((t) => ({ value: t.id, label: t.label }));

export function ThemePicker() {
  const [theme, setTheme] = useTheme();
  return <Select label="Tema" value={theme} options={OPTIONS} onChange={setTheme} />;
}
