import { Backpack, Crown, Feather, ScrollText, Swords, WandSparkles, type LucideIcon } from 'lucide-react';
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

const TABS: { id: string; label: string; Icon: LucideIcon; Component: ComponentType<TabProps> }[] = [
  { id: 'main', label: 'Principale', Icon: ScrollText, Component: MainTab },
  { id: 'combat', label: 'Combattimento', Icon: Swords, Component: CombatTab },
  { id: 'spells', label: 'Incantesimi', Icon: WandSparkles, Component: SpellsTab },
  { id: 'inventory', label: 'Inventario', Icon: Backpack, Component: InventoryTab },
  { id: 'features', label: 'Privilegi', Icon: Crown, Component: FeaturesTab },
  { id: 'notes', label: 'Note', Icon: Feather, Component: NotesTab },
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
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            className="tab"
            aria-label={label}
            aria-selected={active === id}
            onClick={() => setActive(id)}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={1.5} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
