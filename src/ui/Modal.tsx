import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Finestra modale montata su `body` (l'header sticky con backdrop-filter farebbe da contenitore ai `fixed`). */
export function Modal({ title, onClose, children }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
