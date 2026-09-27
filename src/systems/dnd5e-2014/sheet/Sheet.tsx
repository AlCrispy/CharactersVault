import { useState } from 'react';
import type { SheetProps } from '../../../core/types';
import { useMediaQuery } from '../../../ui/useMediaQuery';
import type { Dnd5eCharacter } from '../model';
import { DESKTOP_TABS, MOBILE_TABS } from './layouts';

export const DESKTOP_QUERY = '(min-width: 1024px)';

export function Sheet({ data, onChange }: SheetProps<Dnd5eCharacter>) {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const tabs = desktop ? DESKTOP_TABS : MOBILE_TABS;
  const [activeId, setActiveId] = useState(tabs[0].id);
  // Cambiando layout l'id attivo può non esistere più: si torna al primo tab.
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  const tabbar = (
    <nav className="tabbar" role="tablist">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          className="tab"
          aria-label={label}
          aria-selected={active.id === id}
          onClick={() => setActiveId(id)}
        >
          <Icon aria-hidden="true" size={20} strokeWidth={1.5} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className="sheet" data-layout={desktop ? 'desktop' : 'mobile'}>
      {desktop && tabbar}
      <div className="sheet-panels">
        {tabs.map(({ id, label, columns }) => (
          <div key={id} className="panel" role="tabpanel" aria-label={label} data-active={active.id === id}>
            {columns.map((col, i) => (
              <div key={i} className="panel-column" style={col.span ? { gridColumn: `span ${col.span}` } : undefined}>
                {col.sections.map((Section, j) => (
                  <Section key={j} data={data} onChange={onChange} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      {!desktop && tabbar}
    </div>
  );
}
