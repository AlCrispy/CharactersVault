import { useCallback, useEffect, useState } from 'react';
import { loadCharacter } from '../core/load';
import { getCharacter, saveCharacterData } from '../core/repository';
import type { GameSystem } from '../core/types';
import { useAutosave, type SaveStatus } from './useAutosave';

type HostState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; system: GameSystem<unknown>; data: unknown };

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
      if (loaded.status === 'ok') setState({ status: 'ready', system: loaded.system, data: loaded.data });
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
  return <LoadedSheet id={id} system={state.system} initial={state.data} />;
}

function LoadedSheet({ id, system, initial }: { id: string; system: GameSystem<unknown>; initial: unknown }) {
  const [data, setData] = useState(initial);
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
        {HeaderActions && <HeaderActions data={data} onChange={setData} />}
        <span className={`save-status ${status}`} role="status">
          {SAVE_LABEL[status]}
        </span>
      </header>
      <Sheet data={data} onChange={setData} />
    </div>
  );
}
