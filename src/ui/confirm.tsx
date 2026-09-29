import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Azione distruttiva: tasto rosso e fuoco iniziale su "Annulla". */
  danger?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

// Senza provider (es. componenti montati da soli) si ripiega sul dialogo del browser.
const ConfirmContext = createContext<Confirm>((o) => Promise.resolve(window.confirm(`${o.title}\n\n${o.message}`)));

export function useConfirm(): Confirm {
  return useContext(ConfirmContext);
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/** Mostra le richieste di conferma in una finestra nello stile del tema attivo. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback<Confirm>((options) => new Promise((resolve) => setPending({ ...options, resolve })), []);

  const close = useCallback(
    (ok: boolean) => {
      pending?.resolve(ok);
      setPending(null);
    },
    [pending],
  );
  const cancel = useCallback(() => close(false), [close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <Modal title={pending.title} onClose={cancel}>
          <p className="confirm-message">{pending.message}</p>
          <div className="confirm-actions">
            <button type="button" className="btn" autoFocus={pending.danger} onClick={cancel}>
              {pending.cancelLabel ?? 'Annulla'}
            </button>
            <button type="button" className={pending.danger ? 'btn danger' : 'btn primary'} autoFocus={!pending.danger} onClick={() => close(true)}>
              {pending.confirmLabel ?? 'Conferma'}
            </button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}
