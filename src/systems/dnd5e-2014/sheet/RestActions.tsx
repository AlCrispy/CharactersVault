import { Hourglass, Moon } from 'lucide-react';
import { useState } from 'react';
import type { SheetProps } from '../../../core/types';
import { useConfirm } from '../../../ui/confirm';
import { Modal } from '../../../ui/Modal';
import { longRest, shortRest } from '../actions';
import type { Dnd5eCharacter } from '../model';
import { ShortRestForm } from './ShortRestForm';

/** Tasti dei riposi nell'header della scheda. */
export function RestActions({ data, onChange, readOnly = false }: SheetProps<Dnd5eCharacter>) {
  const [resting, setResting] = useState(false);
  const confirm = useConfirm();

  async function handleLongRest() {
    const ok = await confirm({
      title: 'Riposo lungo',
      message: 'Ripristinare PF, slot incantesimo, dadi vita e risorse?',
      confirmLabel: 'Riposa',
    });
    if (ok) onChange(longRest(data));
  }

  return (
    <div className="header-actions">
      <button type="button" className="btn small" aria-label="Riposo breve" title="Riposo breve" disabled={readOnly} onClick={() => setResting(true)}>
        <Hourglass aria-hidden="true" size={16} strokeWidth={1.75} />
      </button>
      <button type="button" className="btn small" aria-label="Riposo lungo" title="Riposo lungo" disabled={readOnly} onClick={handleLongRest}>
        <Moon aria-hidden="true" size={16} strokeWidth={1.75} />
      </button>
      {resting && (
        <Modal title="Riposo breve" onClose={() => setResting(false)}>
          <ShortRestForm
            data={data}
            onCancel={() => setResting(false)}
            onConfirm={(opts) => {
              onChange(shortRest(data, opts));
              setResting(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
