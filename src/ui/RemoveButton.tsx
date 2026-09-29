import { Trash2 } from 'lucide-react';

/** Tasto neutro con cestino per togliere una voce da una lista; il nome dice cosa rimuove. */
export function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="btn small remove-btn" aria-label={label} title={label} onClick={onClick}>
      <Trash2 aria-hidden="true" size={16} strokeWidth={1.75} />
    </button>
  );
}
