import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { readFileText, shareOrDownload } from '../core/fileShare';
import { asCopy, buildExportFile, exportFileName, ImportError, parseImportFile, serializeExport, splitConflicts } from '../core/importExport';
import { loadCharacter } from '../core/load';
import { registry } from '../core/registry';
import { createCharacter, deleteCharacter, duplicateCharacter, existingIds, listCharacters, putCharacters } from '../core/repository';
import { daysSince, getLastBackup, setLastBackup } from '../core/storage';
import type { CharacterRecord } from '../core/types';
import { navigate, routeToHash } from './route';

function backupText(last: Date | null): string {
  if (!last) return 'Nessun backup eseguito.';
  const days = daysSince(last);
  if (days === 0) return 'Ultimo backup: oggi.';
  return days === 1 ? 'Ultimo backup: ieri.' : `Ultimo backup: ${days} giorni fa.`;
}

export function CharacterList({ persisted }: { persisted: boolean | null }) {
  const records = useLiveQuery(listCharacters, []);
  const systems = registry.list();
  const [systemId, setSystemId] = useState(systems[0]?.id ?? '');
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [lastBackup, setLastBackupState] = useState(getLastBackup);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const system = registry.get(systemId);
    if (!system || !newName.trim()) return;
    const record = await createCharacter(system, newName);
    setNewName('');
    navigate({ name: 'sheet', id: record.id });
  }

  async function exportRecords(list: CharacterRecord[]) {
    await shareOrDownload(exportFileName(list), serializeExport(buildExportFile(list)));
  }

  async function handleBackup() {
    if (!records?.length) return;
    await exportRecords(records);
    setLastBackup();
    setLastBackupState(getLastBackup());
  }

  async function handleDelete(record: CharacterRecord) {
    if (!window.confirm(`Eliminare "${record.name || 'Senza nome'}"? L'operazione non si può annullare.`)) return;
    await deleteCharacter(record.id);
  }

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { records: incoming, issues } = parseImportFile(await readFileText(file));
      const { fresh, conflicting } = splitConflicts(incoming, await existingIds());
      let toSave = fresh;
      if (conflicting.length > 0) {
        const overwrite = window.confirm(
          `${conflicting.length} personaggi esistono già.\nOK = sovrascrivi, Annulla = importa come copie.`,
        );
        toSave = [...fresh, ...(overwrite ? conflicting : conflicting.map((r) => asCopy(r)))];
      }
      await putCharacters(toSave);
      setMessage([`Importati ${toSave.length} personaggi.`, ...issues.map((i) => `Scartato "${i.name}": ${i.error}`)].join('\n'));
    } catch (err) {
      setMessage(err instanceof ImportError ? err.message : `Errore durante l'importazione: ${String(err)}`);
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <svg className="logo" viewBox="0 0 512 512" aria-hidden="true">
          <polygon points="256,72 415,164 415,348 256,440 97,348 97,164" fill="none" stroke="currentColor" strokeWidth="28" strokeLinejoin="round" />
          <polygon points="256,150 350,316 162,316" fill="currentColor" />
        </svg>
        <h1>Characters Vault</h1>
        <p className="tagline">Il grimorio dei tuoi eroi</p>
      </header>

      {persisted === false && (
        <p className="warning" role="alert">
          Il browser non garantisce la conservazione dei dati. Fai backup regolari; installare l'app aiuta.
        </p>
      )}
      <p className="backup-status">{backupText(lastBackup)}</p>

      <form className="card create-form" onSubmit={handleCreate}>
        <h2>Nuovo personaggio</h2>
        <label className="field">
          <span className="field-label">Nome</span>
          <input type="text" value={newName} required onChange={(e) => setNewName(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Sistema</span>
          <select value={systemId} onChange={(e) => setSystemId(e.target.value)}>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn primary">
          Crea
        </button>
      </form>

      <div className="toolbar">
        <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
          Importa
        </button>
        <button type="button" className="btn" disabled={!records?.length} onClick={handleBackup}>
          Backup completo
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden data-testid="import-input" onChange={handleImport} />
      </div>

      {message && (
        <pre className="message" role="status">
          {message}
        </pre>
      )}

      <ul className="character-list">
        {records?.map((r) => (
          <CharacterRow
            key={r.id}
            record={r}
            onExport={() => exportRecords([r])}
            onDuplicate={() => duplicateCharacter(r.id)}
            onDelete={() => handleDelete(r)}
          />
        ))}
      </ul>
      {records?.length === 0 && <p className="empty">Nessun personaggio. Creane uno o importa un file.</p>}
    </main>
  );
}

interface RowProps {
  record: CharacterRecord;
  onExport: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function CharacterRow({ record, onExport, onDuplicate, onDelete }: RowProps) {
  const loaded = loadCharacter(record);
  const name = record.name || 'Senza nome';
  const subtitle =
    loaded.status === 'ok'
      ? `${loaded.system.name} · ${loaded.system.summary(loaded.data)}`
      : loaded.status === 'unknownSystem'
        ? `Sistema sconosciuto: ${loaded.systemId}`
        : 'Scheda danneggiata';

  return (
    <li className="card character-row">
      <span className="monogram" aria-hidden="true">
        {name.trim().charAt(0).toUpperCase()}
      </span>
      <div className="character-info">
        {loaded.status === 'ok' ? (
          <a className="character-name" href={routeToHash({ name: 'sheet', id: record.id })}>
            {name}
          </a>
        ) : (
          <span className="character-name">{name}</span>
        )}
        <span className={loaded.status === 'ok' ? 'muted' : 'warning-text'}>{subtitle}</span>
      </div>
      <div className="row-actions">
        <button type="button" className="btn small" onClick={onExport}>
          Esporta
        </button>
        {loaded.status === 'ok' && (
          <button type="button" className="btn small" onClick={onDuplicate}>
            Duplica
          </button>
        )}
        <button type="button" className="btn small danger" onClick={onDelete}>
          Elimina
        </button>
      </div>
    </li>
  );
}
