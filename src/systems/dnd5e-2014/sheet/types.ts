import type { Dnd5eCharacter } from '../model';

export interface TabProps {
  data: Dnd5eCharacter;
  onChange: (next: Dnd5eCharacter) => void;
}
