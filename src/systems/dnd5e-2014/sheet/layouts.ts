import { Backpack, Crown, Feather, ScrollText, Shield, Swords, WandSparkles, type LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';
import { AttacksSection } from './AttacksSection';
import { ConditionsSection, DefenseSection, HitPointsSection, RestSection } from './CombatTab';
import { FeaturesSection } from './FeaturesTab';
import { CoinsSection, ItemsSection } from './InventoryTab';
import { AbilitiesSection, ClassesSection, IdentitySection, ProficienciesSection, SkillsSection } from './MainTab';
import { NotesSection, PersonalitySection } from './NotesTab';
import { CasterSection, SlotsSection, SpellListSection } from './SpellsTab';
import type { TabProps } from './types';

export interface Column {
  sections: ComponentType<TabProps>[];
  /** Colonne della griglia desktop occupate (default 1). */
  span?: number;
}

export interface TabLayout {
  id: string;
  label: string;
  Icon: LucideIcon;
  columns: Column[];
}

const single = (...sections: ComponentType<TabProps>[]): Column[] => [{ sections }];

/** Telefono: 6 tab, una colonna ciascuno. */
export const MOBILE_TABS: TabLayout[] = [
  {
    id: 'main',
    label: 'Principale',
    Icon: ScrollText,
    columns: single(IdentitySection, ClassesSection, AbilitiesSection, SkillsSection, ProficienciesSection),
  },
  {
    id: 'combat',
    label: 'Combattimento',
    Icon: Swords,
    columns: single(HitPointsSection, DefenseSection, ConditionsSection, RestSection, AttacksSection),
  },
  { id: 'spells', label: 'Incantesimi', Icon: WandSparkles, columns: single(CasterSection, SlotsSection, SpellListSection) },
  { id: 'inventory', label: 'Inventario', Icon: Backpack, columns: single(CoinsSection, ItemsSection) },
  { id: 'features', label: 'Privilegi', Icon: Crown, columns: single(FeaturesSection) },
  { id: 'notes', label: 'Note', Icon: Feather, columns: single(PersonalitySection, NotesSection) },
];

/** Desktop: 3 tab, card correlate affiancate su 3 colonne. */
export const DESKTOP_TABS: TabLayout[] = [
  {
    id: 'hero',
    label: 'Eroe',
    Icon: Shield,
    columns: [
      { sections: [IdentitySection, ClassesSection, ProficienciesSection] },
      { sections: [AbilitiesSection, SkillsSection] },
      { sections: [HitPointsSection, DefenseSection, ConditionsSection, RestSection, AttacksSection] },
    ],
  },
  {
    id: 'gear',
    label: 'Magia ed equipaggiamento',
    Icon: WandSparkles,
    columns: [{ sections: [CasterSection, SlotsSection] }, { sections: [SpellListSection] }, { sections: [CoinsSection, ItemsSection] }],
  },
  {
    id: 'story',
    label: 'Privilegi e storia',
    Icon: Feather,
    columns: [{ sections: [FeaturesSection], span: 2 }, { sections: [PersonalitySection, NotesSection] }],
  },
];
