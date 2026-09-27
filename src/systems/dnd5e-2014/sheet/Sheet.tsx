import { useState, type ComponentType } from 'react';
import type { SheetProps } from '../../../core/types';
import type { Dnd5eCharacter } from '../model';
import { CombatTab } from './CombatTab';
import { FeaturesTab } from './FeaturesTab';
import { InventoryTab } from './InventoryTab';
import { MainTab } from './MainTab';
import { NotesTab } from './NotesTab';
import { SpellsTab } from './SpellsTab';
import type { TabProps } from './types';

const TABS: { id: string; label: string; Component: ComponentType<TabProps> }[] = [
  { id: 'main', label: 'Principale', Component: MainTab },
  { id: 'combat', label: 'Combattimento', Component: CombatTab },
  { id: 'spells', label: 'Incantesimi', Component: SpellsTab },
  { id: 'inventory', label: 'Inventario', Component: InventoryTab },
  { id: 'features', label: 'Privilegi', Component: FeaturesTab },
  { id: 'notes', label: 'Note', Component: NotesTab },
];

export function Sheet({ data, onChange }: SheetProps<Dnd5eCharacter>) {
  const [active, setActive] = useState(TABS[0].id);
  return (
    <div className="sheet">
      <div className="sheet-panels">
        {TABS.map(({ id, label, Component }) => (
          <div key={id} className="panel" role="tabpanel" aria-label={label} data-active={active === id}>
            <Component data={data} onChange={onChange} />
          </div>
        ))}
      </div>
      <nav className="tabbar" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" className="tab" aria-selected={active === t.id} onClick={() => setActive(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
