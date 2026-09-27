import { render } from '@testing-library/react';
import { useState } from 'react';
import { createBlank, type Dnd5eCharacter } from '../model';
import { Sheet } from './Sheet';

/** Monta la scheda con stato reale; `data()` restituisce l'ultimo valore. */
export function renderSheet(initial: Dnd5eCharacter = createBlank()) {
  const latest = { current: initial };
  function Harness() {
    const [data, setData] = useState(initial);
    latest.current = data;
    return <Sheet data={data} onChange={setData} />;
  }
  const utils = render(<Harness />);
  return { ...utils, data: () => latest.current };
}
