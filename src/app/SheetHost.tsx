import { Lock, LockOpen } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { loadCharacter } from '../core/load';
import { getCharacter, saveCharacterData, setCharacterLocked } from '../core/repository';
import type { GameSystem } from '../core/types';
import { useAutosave, type SaveStatus } from './useAutosave';

type HostState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; system: GameSystem<unknown>; data: unknown; locked: boolean };

const SAVE_LABEL: Record<SaveStatus, string> = {
  idle: '',
  pending: 'Salvataggio…',
  saved: 'Salvato',
  error: 'Errore di salvataggio',
};

export function SheetHost({ id }: { id: string }) {
  const [state, setState] = useState<HostState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    getCharacter(id).then((record) => {
      if (cancelled) return;
      if (!record) {
        setState({ status: 'missing' });
        return;
      }
      const loaded = loadCharacter(record);
      if (loaded.status === 'ok') setState({ status: 'ready', system: loaded.system, data: loaded.data, locked: record.locked ?? false });
      else setState({ status: 'error', message: loaded.status === 'damaged' ? loaded.error : `sistema sconosciuto (${loaded.systemId})` });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === 'loading') return <p className="page">Caricamento…</p>;
  if (state.status === 'missing') {
    return (
      <main className="page">
        <p>Personaggio non trovato.</p>
        <a href="#/">Torna alla lista</a>
      </main>
    );
  }
  if (state.status === 'error') {
    return (
      <main className="page">
        <p className="warning" role="alert">
          Impossibile aprire la scheda: {state.message}
        </p>
        <a href="#/">Torna alla lista</a>
      </main>
    );
  }
  return <LoadedSheet id={id} system={state.system} initial={state.data} initialLocked={state.locked} />;
}

interface LoadedSheetProps {
  id: string;
  system: GameSystem<unknown>;
  initial: unknown;
  initialLocked: boolean;
}

function LoadedSheet({ id, system, initial, initialLocked }: LoadedSheetProps) {
  const [data, setData] = useState(initial);
  const [locked, setLocked] = useState(initialLocked);
  // Da bloccata ogni modifica viene scartata, anche se un controllo sfuggisse al blocco dell'interfaccia.
  const change = useCallback((next: unknown) => {
    if (!locked) setData(next);
  }, [locked]);

  function toggleLock() {
    const next = !locked;
    setLocked(next);
    void setCharacterLocked(id, next);
  }
  const save = useCallback((d: unknown) => saveCharacterData(id, system, d), [id, system]);
  const status = useAutosave(data, save);
  const { Sheet, HeaderActions } = system;

  return (
    <div className="sheet-host">
      <header className="sheet-header">
        <a href="#/" className="btn small" aria-label="Lista">
          ← <span className="back-label">Lista</span>
        </a>
        <div className="sheet-heading">
          <span className="sheet-title">{system.getName(data) || 'Senza nome'}</span>
          <span className="sheet-subtitle">{system.summary(data)}</span>
        </div>
        {HeaderActions && <HeaderActions data={data} onChange={change} readOnly={locked} />}
        <div className="header-actions sheet-state">
          <button
            type="button"
            className="btn small lock-toggle"
            aria-pressed={locked}
            aria-label={locked ? 'Sblocca scheda' : 'Blocca scheda'}
            title={locked ? 'Scheda bloccata: tocca per sbloccarla' : 'Blocca la scheda'}
            onClick={toggleLock}
          >
            {locked ? <Lock aria-hidden="true" size={16} strokeWidth={1.75} /> : <LockOpen aria-hidden="true" size={16} strokeWidth={1.75} />}
          </button>
          {/* Da bloccata non si modifica nulla: lo stato del salvataggio non serve. */}
          {!locked && (
            <span className={`save-status ${status}`} role="status">
              {SAVE_LABEL[status]}
            </span>
          )}
        </div>
      </header>
      <Sheet data={data} onChange={change} readOnly={locked} />
    </div>
  );
}
