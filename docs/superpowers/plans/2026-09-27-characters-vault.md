# Characters Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA offline, installabile su telefono e PC, per gestire schede di giochi di ruolo; primo modulo D&D 5e 2014 con calcoli automatici, riposi, monete/peso, esporta/importa JSON.

**Architecture:** Nucleo generico (`src/core`: contratto `GameSystem`, registro, IndexedDB via Dexie, esporta/importa) + interfaccia generica (`src/app`: lista personaggi, host scheda con salvataggio automatico) + moduli di sistema (`src/systems/dnd5e-2014`: modello zod, regole pure, azioni pure, componenti React della scheda). I dati salvati contengono solo input dell'utente; i valori derivati si ricalcolano a ogni render.

**Tech Stack:** React 19, TypeScript, Vite, vite-plugin-pwa, Dexie 4 + dexie-react-hooks, zod 4, Vitest + React Testing Library + jsdom + fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-09-27-characters-vault-design.md`

## Global Constraints

- Node 22, npm. Comandi da eseguire nella root `E:\Project\4Theory\CharactersVault`.
- Nessun backend, nessuna chiamata di rete a runtime. Dati solo in IndexedDB (+ `localStorage` per la data dell'ultimo backup).
- Testi dell'interfaccia solo in italiano. Identificatori nel codice in inglese.
- Solo tema scuro.
- Pesi in kg: capacità di carico = FOR × 7,5 kg; 50 monete = 0,5 kg (0,01 kg a moneta).
- ID sistema D&D: `"dnd5e-2014"`, nome visualizzato `"D&D 5e (2014)"`, `schemaVersion` 1.
- Formato file export: `{ "format": "characters-vault", "version": 1, "exportedAt": ISO, "characters": CharacterRecord[] }`.
- Salvataggio automatico con debounce 500 ms.
- `vite.config.ts` usa `base: './'` e routing via hash, per funzionare su hosting statico in sottocartella (GitHub Pages).
- `core/` non importa mai da `app/` o `systems/`. `app/` non importa mai direttamente da `systems/dnd5e-2014/` (solo tramite il registro; unica eccezione: `src/main.tsx` e i test importano `src/systems` per registrare i moduli).
- Commit frequenti; messaggi in formato Conventional Commits, terminati da `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Structure

```
.gitattributes, .gitignore, package.json, tsconfig.json, vite.config.ts, index.html, README.md
.github/workflows/deploy.yml
public/icon.svg (+ PNG generati)
src/
  main.tsx                  bootstrap React, registra i sistemi
  App.tsx                   sceglie pagina in base alla route, chiede storage persistente
  styles.css                tema scuro, layout mobile-first
  test/setup.ts             jest-dom, fake-indexeddb, cleanup
  core/
    id.ts                   newId() UUID v4 (funziona anche in contesti non sicuri)
    types.ts                GameSystem<T>, SheetProps<T>, CharacterRecord
    registry.ts             createRegistry(), registry
    load.ts                 loadCharacter(record) → ok | unknownSystem | damaged
    testSystem.ts           sistema finto per i test del nucleo
    db.ts                   Dexie: tabella characters
    repository.ts           CRUD personaggi
    importExport.ts         build/serialize/parse file, conflitti
    storage.ts              storage persistente, data ultimo backup
    fileShare.ts            condividi (mobile) o scarica, lettura file
  ui/
    fields.tsx              NumberInput, TextInput, TextArea, Checkbox, Select, Section, Stat
    Pips.tsx                contatore a caselle (slot, utilizzi, TS morte)
    format.ts               signed(), formatNumber()
  app/
    route.ts                parseHash, routeToHash, navigate, useRoute
    useAutosave.ts          hook salvataggio con debounce
    CharacterList.tsx       pagina iniziale
    SheetHost.tsx           carica record, monta Sheet del sistema, autosave
  systems/
    index.ts                registra tutti i moduli
    dnd5e-2014/
      model.ts              costanti, schema zod, tipi, createBlank, factory voci
      labels.ts             etichette italiane e opzioni select
      rules.ts              valori derivati + summary
      actions.ts            danno, cura, PF temporanei, riposi
      migrate.ts            migrazioni schema
      index.ts              GameSystem dnd5e
      sheet/
        types.ts            TabProps
        listOps.ts          updateById, removeById
        testUtils.tsx       renderSheet() per i test
        Sheet.tsx           tab + layout
        MainTab.tsx, CombatTab.tsx, AttacksSection.tsx, ShortRestForm.tsx,
        SpellsTab.tsx, InventoryTab.tsx, FeaturesTab.tsx, NotesTab.tsx
```

---

### Task 1: Scaffold progetto

**Files:**
- Create: `.gitattributes`, `.gitignore`, `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/test/setup.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: niente
- Produces: script npm `dev`, `dev:lan`, `build`, `preview`, `test`, `test:watch`; ambiente test jsdom con jest-dom e fake-indexeddb; classi CSS usate da tutti i task successivi (`page`, `card`, `section`, `section-header`, `field`, `field-label`, `narrow`, `check`, `btn`, `small`, `primary`, `danger`, `ok`, `row`, `grid-2`, `grid-3`, `stats-row`, `stat`, `stat-label`, `stat-value`, `abilities`, `ability`, `skills`, `skill`, `skill-name`, `skill-value`, `list`, `list-item`, `list-summary`, `pips-field`, `pips`, `slots`, `slot-row`, `slot-level`, `coins`, `muted`, `warning`, `warning-text`, `message`, `visually-hidden`, `inset`, `create-form`, `toolbar`, `character-list`, `character-row`, `character-info`, `character-name`, `row-actions`, `backup-status`, `sheet-host`, `sheet-header`, `sheet-title`, `save-status`, `sheet`, `sheet-panels`, `panel`, `tabbar`, `tab`, `empty`).

- [ ] **Step 1: File di configurazione git**

`.gitattributes`:
```
* text=auto eol=lf
*.png binary
*.ico binary
```

`.gitignore`:
```
node_modules
dist
dev-dist
coverage
*.local
```

- [ ] **Step 2: package.json**

```json
{
  "name": "characters-vault",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "dev:lan": "vite --host",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Installa dipendenze**

Run:
```bash
npm install react@^19 react-dom@^19 zod@^4 dexie@^4 dexie-react-hooks
npm install -D typescript vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom fake-indexeddb @types/react @types/react-dom vite-plugin-pwa @vite-pwa/assets-generator
```
Expected: installazione senza errori `ERESOLVE`. Se `vite-plugin-pwa` segnala un conflitto di peer dependency con la versione di `vite` installata, reinstallare `vite` alla major più alta supportata dal plugin (leggere `npm view vite-plugin-pwa peerDependencies`) e ripetere.

- [ ] **Step 4: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 5: vite.config.ts**

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
});
```

- [ ] **Step 6: index.html**

```html
<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#121418" />
    <title>Characters Vault</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Setup test**

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
```

- [ ] **Step 8: Scrivi il test di fumo (fallisce)**

`src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from './App';

it("mostra il titolo dell'app", () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Characters Vault' })).toBeInTheDocument();
});
```

- [ ] **Step 9: Esegui il test**

Run: `npm test`
Expected: FAIL, `Failed to resolve import "./App"`.

- [ ] **Step 10: App, main e stili**

`src/App.tsx`:
```tsx
export default function App() {
  return (
    <main className="page">
      <h1>Characters Vault</h1>
    </main>
  );
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/styles.css`:
```css
:root {
  color-scheme: dark;
  --bg: #121418;
  --surface: #1b1e24;
  --surface-2: #252932;
  --border: #343a45;
  --text: #e9e6df;
  --muted: #9ba1ab;
  --accent: #d4a842;
  --accent-text: #1a1406;
  --danger: #e06464;
  --ok: #5dba7d;
  --warning: #e0a44a;
  --radius: 10px;
  --gap: 12px;
  --tabbar-h: 56px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 16px;
  line-height: 1.4;
}

* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--text); }
body { min-height: 100dvh; }
a { color: var(--accent); }
h1 { font-size: 1.5rem; margin: 0; }
h2 { font-size: 1.05rem; margin: 0; }
h3 { font-size: 0.95rem; margin: 16px 0 8px; color: var(--muted); }

.page { max-width: 720px; margin: 0 auto; padding: 16px 16px 32px; }
.page-header { margin-bottom: 12px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; }
.inset { background: var(--surface-2); margin-top: 12px; }
.section { margin-bottom: var(--gap); }
.section-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px; }

.field { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
.field-label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
.field.narrow { flex: 0 0 72px; }
input[type='text'], select, textarea {
  width: 100%; background: var(--surface-2); color: var(--text); border: 1px solid var(--border);
  border-radius: 8px; padding: 8px 10px; font: inherit; min-height: 40px;
}
textarea { resize: vertical; }
input:focus, select:focus, textarea:focus, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.check { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; cursor: pointer; }
input[type='checkbox'] { width: 20px; height: 20px; accent-color: var(--accent); }

.btn {
  background: var(--surface-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px;
  padding: 8px 14px; font: inherit; min-height: 40px; cursor: pointer; text-decoration: none;
  display: inline-flex; align-items: center;
}
.btn:disabled { opacity: 0.5; cursor: default; }
.btn.small { padding: 4px 10px; min-height: 32px; font-size: 0.875rem; }
.btn.primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); font-weight: 600; }
.btn.danger { color: var(--danger); }
.btn.ok { color: var(--ok); }

.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; margin-bottom: 8px; }
.grid-2, .grid-3 { display: grid; gap: 8px; grid-template-columns: 1fr 1fr; align-items: end; }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.stats-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
.stat { background: var(--surface-2); border-radius: 8px; padding: 6px 12px; display: flex; flex-direction: column; align-items: center; min-width: 80px; }
.stat-label { font-size: 0.7rem; color: var(--muted); text-transform: uppercase; }
.stat-value { font-size: 1.25rem; font-weight: 700; }

.abilities { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.ability { background: var(--surface-2); border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
.ability .stat { background: transparent; padding: 0; }
.skills { list-style: none; margin: 8px 0; padding: 0; }
.skill { display: grid; grid-template-columns: 112px 1fr 56px 44px; gap: 6px; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--border); }
.skill-value { text-align: right; font-weight: 700; }

.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.list-item { background: var(--surface-2); border-radius: 8px; padding: 10px; }
.list-summary { display: flex; flex-wrap: wrap; gap: 12px; align-items: baseline; margin-bottom: 6px; }
details summary { cursor: pointer; color: var(--muted); font-size: 0.875rem; padding: 4px 0; }
details[open] summary { margin-bottom: 8px; }

.pips-field { display: flex; flex-direction: column; gap: 4px; }
.pips { display: flex; flex-wrap: wrap; gap: 6px; min-height: 40px; align-items: center; }
.slots { list-style: none; padding: 0; margin: 0; }
.slot-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
.slot-level { width: 28px; font-weight: 700; color: var(--muted); }
.coins { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }

.muted { color: var(--muted); }
.empty { color: var(--muted); text-align: center; padding: 24px 0; }
.warning {
  background: color-mix(in srgb, var(--warning) 15%, transparent); border: 1px solid var(--warning);
  color: var(--warning); border-radius: 8px; padding: 8px 12px;
}
.warning-text { color: var(--warning); }
.message { white-space: pre-wrap; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 10px; font: inherit; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.create-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
.character-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.character-row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; align-items: center; }
.character-info { display: flex; flex-direction: column; }
.character-name { font-weight: 700; font-size: 1.05rem; }
.row-actions { display: flex; gap: 6px; }
.backup-status { color: var(--muted); font-size: 0.875rem; }

.sheet-header {
  position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 10px;
  padding: 8px 16px; background: var(--bg); border-bottom: 1px solid var(--border);
}
.sheet-title { flex: 1; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.save-status { font-size: 0.8rem; color: var(--muted); }
.save-status.error { color: var(--danger); }
.sheet-panels { padding: 12px 16px calc(var(--tabbar-h) + 24px + env(safe-area-inset-bottom)); max-width: 720px; margin: 0 auto; }
.panel[data-active='false'] { display: none; }
.tabbar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 3; display: flex; overflow-x: auto;
  background: var(--surface); border-top: 1px solid var(--border); padding-bottom: env(safe-area-inset-bottom);
}
.tab {
  flex: 1 0 auto; min-height: var(--tabbar-h); padding: 0 12px; background: none; border: 0;
  color: var(--muted); font: inherit; font-size: 0.8rem; cursor: pointer;
}
.tab[aria-selected='true'] { color: var(--accent); box-shadow: inset 0 2px 0 var(--accent); }

@media (min-width: 1024px) {
  .sheet-panels { max-width: 1400px; display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--gap); align-items: start; padding-bottom: 24px; }
  .panel[data-active='false'] { display: block; }
  .tabbar { display: none; }
}

@media (max-width: 420px) {
  .abilities { grid-template-columns: repeat(2, 1fr); }
  .coins { grid-template-columns: repeat(3, 1fr); }
  .grid-3 { grid-template-columns: 1fr 1fr; }
}
```

- [ ] **Step 11: Verifica test e build**

Run: `npm test`
Expected: PASS (1 test).

Run: `npm run build`
Expected: build completata, cartella `dist/` generata, nessun errore TypeScript.

- [ ] **Step 12: Commit**

```bash
git add .
git commit -m "chore: scaffold Vite React TypeScript project

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Nucleo — ID, contratto, registro, caricamento

**Files:**
- Create: `src/core/id.ts`, `src/core/types.ts`, `src/core/registry.ts`, `src/core/load.ts`, `src/core/testSystem.ts`
- Test: `src/core/id.test.ts`, `src/core/registry.test.ts`, `src/core/load.test.ts`

**Interfaces:**
- Consumes: niente
- Produces:
  - `newId(): string` (UUID v4)
  - `interface SheetProps<T> { data: T; onChange: (next: T) => void }`
  - `interface GameSystem<T> { id; name; schemaVersion; createBlank(): T; migrate(data: unknown, fromVersion: number): unknown; validate(data: unknown): T; getName(data: T): string; withName(data: T, name: string): T; summary(data: T): string; Sheet: ComponentType<SheetProps<T>> }`
  - `interface CharacterRecord { id; systemId; schemaVersion; name; createdAt; updatedAt; data: unknown }`
  - `createRegistry(): Registry` con `register(system)`, `get(id): GameSystem<unknown> | undefined`, `list(): GameSystem<unknown>[]`; `type Registry`; `registry` (istanza globale)
  - `type LoadResult = { status: 'ok'; system; data } | { status: 'unknownSystem'; systemId } | { status: 'damaged'; system; error }`
  - `loadCharacter(record: CharacterRecord, reg?: Registry): LoadResult`
  - `testSystem: GameSystem<{ name: string; hp: number }>` (id `'test'`, schemaVersion 2) solo per test

- [ ] **Step 1: Test per id, registro e caricamento (falliscono)**

`src/core/id.test.ts`:
```ts
import { expect, it } from 'vitest';
import { newId } from './id';

it('genera UUID v4 diversi', () => {
  const a = newId();
  const b = newId();
  expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(a).not.toBe(b);
});
```

`src/core/registry.test.ts`:
```ts
import { expect, it } from 'vitest';
import { createRegistry } from './registry';
import { testSystem } from './testSystem';

it('registra e restituisce i sistemi', () => {
  const reg = createRegistry();
  expect(reg.get('test')).toBeUndefined();
  reg.register(testSystem);
  expect(reg.get('test')).toBe(testSystem);
  expect(reg.list()).toEqual([testSystem]);
});

it('una nuova registrazione con lo stesso id sostituisce la precedente', () => {
  const reg = createRegistry();
  const other = { ...testSystem, name: 'Altro' };
  reg.register(testSystem);
  reg.register(other);
  expect(reg.get('test')).toBe(other);
  expect(reg.list()).toHaveLength(1);
});
```

`src/core/load.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { loadCharacter } from './load';
import { createRegistry } from './registry';
import { testSystem } from './testSystem';
import type { CharacterRecord } from './types';

const reg = createRegistry();
reg.register(testSystem);

function record(patch: Partial<CharacterRecord>): CharacterRecord {
  return {
    id: 'r1',
    systemId: 'test',
    schemaVersion: 2,
    name: 'Ada',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    data: { name: 'Ada', hp: 7 },
    ...patch,
  };
}

describe('loadCharacter', () => {
  it('carica un record valido', () => {
    const r = loadCharacter(record({}), reg);
    expect(r).toEqual({ status: 'ok', system: testSystem, data: { name: 'Ada', hp: 7 } });
  });

  it('applica le migrazioni', () => {
    const r = loadCharacter(record({ schemaVersion: 1, data: { name: 'Ada' } }), reg);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.data).toEqual({ name: 'Ada', hp: 1 });
  });

  it('segnala sistema sconosciuto', () => {
    expect(loadCharacter(record({ systemId: 'boh' }), reg)).toEqual({ status: 'unknownSystem', systemId: 'boh' });
  });

  it('segnala dati danneggiati', () => {
    const r = loadCharacter(record({ data: { name: 3 } }), reg);
    expect(r.status).toBe('damaged');
  });

  it('segnala versione troppo recente come danneggiata', () => {
    const r = loadCharacter(record({ schemaVersion: 9 }), reg);
    expect(r.status).toBe('damaged');
    if (r.status === 'damaged') expect(r.error).toContain('troppo nuovo');
  });
});
```

- [ ] **Step 2: Esegui i test**

Run: `npm test -- src/core`
Expected: FAIL, moduli `./id`, `./registry`, `./testSystem`, `./load` non trovati.

- [ ] **Step 3: Implementa**

`src/core/id.ts`:
```ts
// Usa getRandomValues (non randomUUID) perché funziona anche su http:// in LAN.
export function newId(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
```

`src/core/types.ts`:
```ts
import type { ComponentType } from 'react';

export interface SheetProps<T> {
  data: T;
  onChange: (next: T) => void;
}

/** Contratto che ogni modulo di sistema di gioco implementa. */
export interface GameSystem<T> {
  id: string;
  name: string;
  schemaVersion: number;
  createBlank(): T;
  /** Porta dati salvati con `fromVersion` alla versione corrente. Lancia errore se impossibile. */
  migrate(data: unknown, fromVersion: number): unknown;
  /** Valida dati già migrati. Lancia errore con messaggio leggibile se non validi. */
  validate(data: unknown): T;
  getName(data: T): string;
  withName(data: T, name: string): T;
  summary(data: T): string;
  Sheet: ComponentType<SheetProps<T>>;
}

export interface CharacterRecord {
  id: string;
  systemId: string;
  schemaVersion: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: unknown;
}
```

`src/core/registry.ts`:
```ts
import type { GameSystem } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySystem = GameSystem<any>;

export function createRegistry() {
  const systems = new Map<string, AnySystem>();
  return {
    /** Sovrascrive un sistema con lo stesso id (utile con l'hot reload di Vite). */
    register(system: AnySystem): void {
      systems.set(system.id, system);
    },
    get(id: string): GameSystem<unknown> | undefined {
      return systems.get(id);
    },
    list(): GameSystem<unknown>[] {
      return [...systems.values()];
    },
  };
}

export type Registry = ReturnType<typeof createRegistry>;

export const registry = createRegistry();
```

`src/core/load.ts`:
```ts
import { registry, type Registry } from './registry';
import type { CharacterRecord, GameSystem } from './types';

export type LoadResult =
  | { status: 'ok'; system: GameSystem<unknown>; data: unknown }
  | { status: 'unknownSystem'; systemId: string }
  | { status: 'damaged'; system: GameSystem<unknown>; error: string };

export function loadCharacter(record: CharacterRecord, reg: Registry = registry): LoadResult {
  const system = reg.get(record.systemId);
  if (!system) return { status: 'unknownSystem', systemId: record.systemId };
  try {
    const data = system.validate(system.migrate(record.data, record.schemaVersion));
    return { status: 'ok', system, data };
  } catch (e) {
    return { status: 'damaged', system, error: e instanceof Error ? e.message : String(e) };
  }
}
```

`src/core/testSystem.ts`:
```ts
import { z } from 'zod';
import type { GameSystem } from './types';

const schema = z.object({ name: z.string(), hp: z.number() });
type TestData = z.infer<typeof schema>;

/** Sistema finto usato solo dai test del nucleo. v1 non aveva `hp`. */
export const testSystem: GameSystem<TestData> = {
  id: 'test',
  name: 'Test',
  schemaVersion: 2,
  createBlank: () => ({ name: '', hp: 1 }),
  migrate(data, fromVersion) {
    if (fromVersion > 2) throw new Error('Dati: troppo nuovo');
    if (fromVersion === 1) return { ...(data as object), hp: 1 };
    return data;
  },
  validate: (data) => schema.parse(data),
  getName: (d) => d.name,
  withName: (d, name) => ({ ...d, name }),
  summary: (d) => `PF ${d.hp}`,
  Sheet: () => null,
};
```

- [ ] **Step 4: Esegui i test**

Run: `npm test -- src/core`
Expected: PASS (8 test).

- [ ] **Step 5: Commit**

```bash
git add src/core
git commit -m "feat(core): add game system contract, registry and loader

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: D&D — modello dati ed etichette

**Files:**
- Create: `src/systems/dnd5e-2014/model.ts`, `src/systems/dnd5e-2014/labels.ts`
- Test: `src/systems/dnd5e-2014/model.test.ts`

**Interfaces:**
- Consumes: `newId()` da `src/core/id.ts`
- Produces (da `model.ts`):
  - `ABILITIES = ['str','dex','con','int','wis','cha'] as const`, `type Ability`
  - `SKILL_ABILITY` (mappa abilità → caratteristica), `type Skill`, `SKILLS: Skill[]`
  - `HIT_DICE = [6,8,10,12] as const`, `type HitDie`, `HIT_DIE_KEYS = ['d6','d8','d10','d12'] as const`, `type HitDieKey`, `hitDieKey(d: HitDie): HitDieKey`
  - `ARMOR_TYPES`, `type ArmorType`; `PROFICIENCY_LEVELS`, `type ProficiencyLevel`; `RECHARGE_TYPES`, `type Recharge`; `COINS = ['cp','sp','ep','gp','pp'] as const`, `type Coin`
  - `dnd5eSchema` (zod), `type Dnd5eCharacter`
  - tipi voce: `ClassEntry`, `Attack`, `SpellSlot`, `Spell`, `Feature`, `Item`, `Coins`, `Spellcasting`, `Inventory`
  - `createBlank(): Dnd5eCharacter`, `newClass(): ClassEntry`, `newAttack(): Attack`, `newSpell(): Spell`, `newFeature(): Feature`, `newItem(): Item`
- Produces (da `labels.ts`): `ABILITY_LABEL: Record<Ability, {short, long}>`, `SKILL_LABEL: Record<Skill, string>`, `ARMOR_LABEL`, `PROFICIENCY_LABEL`, `RECHARGE_LABEL`, `COIN_LABEL`, `ABILITY_OPTIONS`, `ARMOR_OPTIONS`, `PROFICIENCY_OPTIONS`, `RECHARGE_OPTIONS` (array `{ value, label }`)

- [ ] **Step 1: Test del modello (fallisce)**

`src/systems/dnd5e-2014/model.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { SKILL_LABEL } from './labels';
import { createBlank, dnd5eSchema, newAttack, newClass, newFeature, newItem, newSpell, SKILLS } from './model';

describe('modello D&D 5e', () => {
  it('createBlank produce dati validi', () => {
    expect(() => dnd5eSchema.parse(createBlank())).not.toThrow();
  });

  it('createBlank ha 18 abilità, 9 slot e una classe', () => {
    const c = createBlank();
    expect(Object.keys(c.skills)).toHaveLength(18);
    expect(c.spellcasting.slots).toHaveLength(9);
    expect(c.classes).toHaveLength(1);
  });

  it('i dati con voci in tutte le liste restano validi', () => {
    const c = createBlank();
    c.attacks.push(newAttack());
    c.spellcasting.spells.push(newSpell());
    c.features.push(newFeature(), { ...newFeature(), uses: { max: 2, used: 1, recharge: 'short' } });
    c.inventory.items.push(newItem());
    c.classes.push(newClass());
    expect(() => dnd5eSchema.parse(c)).not.toThrow();
  });

  it('rifiuta punteggi fuori intervallo', () => {
    const c = createBlank();
    c.abilities.str = 31;
    expect(() => dnd5eSchema.parse(c)).toThrow();
  });

  it('rifiuta abilità mancanti', () => {
    const c = createBlank() as unknown as { skills: Record<string, unknown> };
    delete c.skills.stealth;
    expect(() => dnd5eSchema.parse(c)).toThrow();
  });

  it('ogni abilità ha una etichetta italiana', () => {
    for (const s of SKILLS) expect(SKILL_LABEL[s]).toBeTruthy();
  });
});
```

- [ ] **Step 2: Esegui il test**

Run: `npm test -- src/systems/dnd5e-2014/model`
Expected: FAIL, moduli non trovati.

- [ ] **Step 3: Implementa model.ts**

`src/systems/dnd5e-2014/model.ts`:
```ts
import { z } from 'zod';
import { newId } from '../../core/id';

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type Ability = (typeof ABILITIES)[number];

export const SKILL_ABILITY = {
  acrobatics: 'dex',
  animalHandling: 'wis',
  arcana: 'int',
  athletics: 'str',
  deception: 'cha',
  history: 'int',
  insight: 'wis',
  intimidation: 'cha',
  investigation: 'int',
  medicine: 'wis',
  nature: 'int',
  perception: 'wis',
  performance: 'cha',
  persuasion: 'cha',
  religion: 'int',
  sleightOfHand: 'dex',
  stealth: 'dex',
  survival: 'wis',
} as const satisfies Record<string, Ability>;
export type Skill = keyof typeof SKILL_ABILITY;
export const SKILLS = Object.keys(SKILL_ABILITY) as Skill[];

export const HIT_DICE = [6, 8, 10, 12] as const;
export type HitDie = (typeof HIT_DICE)[number];
export const HIT_DIE_KEYS = ['d6', 'd8', 'd10', 'd12'] as const;
export type HitDieKey = (typeof HIT_DIE_KEYS)[number];
export function hitDieKey(d: HitDie): HitDieKey {
  return `d${d}`;
}

export const ARMOR_TYPES = ['none', 'light', 'medium', 'heavy', 'unarmoredBarbarian', 'unarmoredMonk'] as const;
export type ArmorType = (typeof ARMOR_TYPES)[number];

export const PROFICIENCY_LEVELS = ['none', 'proficient', 'expertise'] as const;
export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

export const RECHARGE_TYPES = ['short', 'long', 'none'] as const;
export type Recharge = (typeof RECHARGE_TYPES)[number];

export const COINS = ['cp', 'sp', 'ep', 'gp', 'pp'] as const;
export type Coin = (typeof COINS)[number];

const int = (min: number, max: number) => z.number().int().min(min).max(max);
const bonus = int(-99, 99);
const count = int(0, 9_999_999);

const hitDieSchema = z.union([z.literal(6), z.literal(8), z.literal(10), z.literal(12)]);

const classSchema = z.object({
  id: z.string(),
  name: z.string(),
  subclass: z.string(),
  level: int(1, 20),
  hitDie: hitDieSchema,
});

const attackSchema = z.object({
  id: z.string(),
  name: z.string(),
  ability: z.enum(ABILITIES),
  proficient: z.boolean(),
  attackBonus: bonus,
  damageDice: z.string(),
  addModToDamage: z.boolean(),
  damageBonus: bonus,
  damageType: z.string(),
  notes: z.string(),
});

const slotSchema = z.object({ max: int(0, 99), used: int(0, 99) });

const spellSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: int(0, 9),
  prepared: z.boolean(),
  notes: z.string(),
});

const featureSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.string(),
  description: z.string(),
  uses: z.object({ max: int(0, 99), used: int(0, 99), recharge: z.enum(RECHARGE_TYPES) }).nullable(),
});

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().min(0).max(99_999),
  weightKg: z.number().min(0).max(99_999),
  equipped: z.boolean(),
  notes: z.string(),
});

const skillKeys = SKILLS as [Skill, ...Skill[]];

export const dnd5eSchema = z.object({
  name: z.string(),
  race: z.string(),
  background: z.string(),
  alignment: z.string(),
  xp: count,
  inspiration: z.boolean(),
  classes: z.array(classSchema),
  abilities: z.record(z.enum(ABILITIES), int(1, 30)),
  saveProficiencies: z.record(z.enum(ABILITIES), z.boolean()),
  skills: z.record(z.enum(skillKeys), z.object({ level: z.enum(PROFICIENCY_LEVELS), bonus })),
  jackOfAllTrades: z.boolean(),
  otherProficiencies: z.object({
    languages: z.string(),
    tools: z.string(),
    weapons: z.string(),
    armor: z.string(),
  }),
  armor: z.object({ type: z.enum(ARMOR_TYPES), base: int(0, 30), shield: z.boolean(), bonus }),
  initiativeBonus: bonus,
  speedMeters: z.number().min(0).max(999),
  hp: z.object({ max: int(0, 999), current: int(0, 999), temp: int(0, 999) }),
  deathSaves: z.object({ successes: int(0, 3), failures: int(0, 3) }),
  exhaustion: int(0, 6),
  hitDiceUsed: z.record(z.enum(HIT_DIE_KEYS), int(0, 20)),
  attacks: z.array(attackSchema),
  spellcasting: z.object({
    ability: z.enum(ABILITIES).nullable(),
    slots: z.array(slotSchema).length(9),
    pact: z.object({ slotLevel: int(1, 5), max: int(0, 4), used: int(0, 4) }),
    spells: z.array(spellSchema),
  }),
  features: z.array(featureSchema),
  inventory: z.object({
    items: z.array(itemSchema),
    coins: z.record(z.enum(COINS), count),
  }),
  notes: z.object({
    traits: z.string(),
    ideals: z.string(),
    bonds: z.string(),
    flaws: z.string(),
    free: z.string(),
  }),
});

export type Dnd5eCharacter = z.infer<typeof dnd5eSchema>;
export type ClassEntry = Dnd5eCharacter['classes'][number];
export type Attack = Dnd5eCharacter['attacks'][number];
export type Spellcasting = Dnd5eCharacter['spellcasting'];
export type SpellSlot = Spellcasting['slots'][number];
export type Spell = Spellcasting['spells'][number];
export type Feature = Dnd5eCharacter['features'][number];
export type Inventory = Dnd5eCharacter['inventory'];
export type Item = Inventory['items'][number];
export type Coins = Inventory['coins'];

export function newClass(): ClassEntry {
  return { id: newId(), name: '', subclass: '', level: 1, hitDie: 8 };
}

export function newAttack(): Attack {
  return {
    id: newId(),
    name: '',
    ability: 'str',
    proficient: true,
    attackBonus: 0,
    damageDice: '1d6',
    addModToDamage: true,
    damageBonus: 0,
    damageType: '',
    notes: '',
  };
}

export function newSpell(): Spell {
  return { id: newId(), name: '', level: 0, prepared: false, notes: '' };
}

export function newFeature(): Feature {
  return { id: newId(), name: '', source: '', description: '', uses: null };
}

export function newItem(): Item {
  return { id: newId(), name: '', quantity: 1, weightKg: 0, equipped: false, notes: '' };
}

export function createBlank(): Dnd5eCharacter {
  return {
    name: '',
    race: '',
    background: '',
    alignment: '',
    xp: 0,
    inspiration: false,
    classes: [newClass()],
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saveProficiencies: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
    skills: Object.fromEntries(SKILLS.map((s) => [s, { level: 'none', bonus: 0 }])) as Dnd5eCharacter['skills'],
    jackOfAllTrades: false,
    otherProficiencies: { languages: '', tools: '', weapons: '', armor: '' },
    armor: { type: 'none', base: 10, shield: false, bonus: 0 },
    initiativeBonus: 0,
    speedMeters: 9,
    hp: { max: 10, current: 10, temp: 0 },
    deathSaves: { successes: 0, failures: 0 },
    exhaustion: 0,
    hitDiceUsed: { d6: 0, d8: 0, d10: 0, d12: 0 },
    attacks: [],
    spellcasting: {
      ability: null,
      slots: Array.from({ length: 9 }, () => ({ max: 0, used: 0 })),
      pact: { slotLevel: 1, max: 0, used: 0 },
      spells: [],
    },
    features: [],
    inventory: { items: [], coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } },
    notes: { traits: '', ideals: '', bonds: '', flaws: '', free: '' },
  };
}
```

- [ ] **Step 4: Implementa labels.ts**

`src/systems/dnd5e-2014/labels.ts`:
```ts
import {
  ABILITIES,
  ARMOR_TYPES,
  PROFICIENCY_LEVELS,
  RECHARGE_TYPES,
  type Ability,
  type ArmorType,
  type Coin,
  type ProficiencyLevel,
  type Recharge,
  type Skill,
} from './model';

export const ABILITY_LABEL: Record<Ability, { short: string; long: string }> = {
  str: { short: 'FOR', long: 'Forza' },
  dex: { short: 'DES', long: 'Destrezza' },
  con: { short: 'COS', long: 'Costituzione' },
  int: { short: 'INT', long: 'Intelligenza' },
  wis: { short: 'SAG', long: 'Saggezza' },
  cha: { short: 'CAR', long: 'Carisma' },
};

export const SKILL_LABEL: Record<Skill, string> = {
  acrobatics: 'Acrobazia',
  animalHandling: 'Addestrare Animali',
  arcana: 'Arcano',
  athletics: 'Atletica',
  deception: 'Inganno',
  history: 'Storia',
  insight: 'Intuizione',
  intimidation: 'Intimidire',
  investigation: 'Indagare',
  medicine: 'Medicina',
  nature: 'Natura',
  perception: 'Percezione',
  performance: 'Intrattenere',
  persuasion: 'Persuasione',
  religion: 'Religione',
  sleightOfHand: 'Rapidità di Mano',
  stealth: 'Furtività',
  survival: 'Sopravvivenza',
};

export const ARMOR_LABEL: Record<ArmorType, string> = {
  none: 'Nessuna armatura',
  light: 'Armatura leggera',
  medium: 'Armatura media',
  heavy: 'Armatura pesante',
  unarmoredBarbarian: 'Difesa senza armatura (Barbaro)',
  unarmoredMonk: 'Difesa senza armatura (Monaco)',
};

export const PROFICIENCY_LABEL: Record<ProficiencyLevel, string> = {
  none: '—',
  proficient: 'Competente',
  expertise: 'Maestria',
};

export const RECHARGE_LABEL: Record<Recharge, string> = {
  short: 'Riposo breve',
  long: 'Riposo lungo',
  none: 'Nessun ripristino',
};

export const COIN_LABEL: Record<Coin, string> = { cp: 'mr', sp: 'ma', ep: 'me', gp: 'mo', pp: 'mp' };

export const ABILITY_OPTIONS = ABILITIES.map((a) => ({ value: a, label: ABILITY_LABEL[a].long }));
export const ARMOR_OPTIONS = ARMOR_TYPES.map((t) => ({ value: t, label: ARMOR_LABEL[t] }));
export const PROFICIENCY_OPTIONS = PROFICIENCY_LEVELS.map((p) => ({ value: p, label: PROFICIENCY_LABEL[p] }));
export const RECHARGE_OPTIONS = RECHARGE_TYPES.map((r) => ({ value: r, label: RECHARGE_LABEL[r] }));
```

- [ ] **Step 5: Esegui il test**

Run: `npm test -- src/systems/dnd5e-2014/model`
Expected: PASS (6 test). Se `rifiuta abilità mancanti` fallisce, la versione installata di zod non rende esaustivo `z.record(z.enum(...))`: verificare con `npm ls zod` che sia 4.x.

- [ ] **Step 6: Commit**

```bash
git add src/systems
git commit -m "feat(dnd5e): add character data model and Italian labels

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: D&D — regole derivate

**Files:**
- Create: `src/systems/dnd5e-2014/rules.ts`
- Test: `src/systems/dnd5e-2014/rules.test.ts`

**Interfaces:**
- Consumes: tipi e costanti di `model.ts` (Task 3)
- Produces (tutte funzioni pure):
  - `abilityModifier(score: number): number`
  - `totalLevel(c: Dnd5eCharacter): number`
  - `proficiencyBonus(level: number): number`
  - `savingThrow(c, a: Ability): number`
  - `skillBonus(c, s: Skill): number`
  - `passivePerception(c): number`
  - `initiative(c): number`
  - `armorClass(c): number`
  - `attackToHit(c, a: Attack): number`
  - `attackDamage(c, a: Attack): string`
  - `spellSaveDC(c): number | null`, `spellAttackBonus(c): number | null`
  - `hitDiceTotals(c): Record<HitDieKey, number>`
  - `coinCount(coins: Coins): number`
  - `totalWeightKg(c): number`, `carryingCapacityKg(c): number`
  - `summary(c): string`

- [ ] **Step 1: Test delle regole (fallisce)**

`src/systems/dnd5e-2014/rules.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createBlank, newAttack, newClass, newItem, type Dnd5eCharacter } from './model';
import {
  abilityModifier,
  armorClass,
  attackDamage,
  attackToHit,
  carryingCapacityKg,
  hitDiceTotals,
  initiative,
  passivePerception,
  proficiencyBonus,
  savingThrow,
  skillBonus,
  spellAttackBonus,
  spellSaveDC,
  summary,
  totalLevel,
  totalWeightKg,
} from './rules';

function char(mut: (c: Dnd5eCharacter) => void = () => {}): Dnd5eCharacter {
  const c = createBlank();
  mut(c);
  return c;
}

function atLevel(level: number) {
  return (c: Dnd5eCharacter) => {
    c.classes = [{ ...newClass(), level }];
  };
}

describe('abilityModifier', () => {
  it.each([
    [1, -5], [8, -1], [9, -1], [10, 0], [11, 0], [12, 1], [15, 2], [30, 10],
  ])('punteggio %i → %i', (score, mod) => {
    expect(abilityModifier(score)).toBe(mod);
  });
});

describe('livello e bonus competenza', () => {
  it.each([
    [1, 2], [4, 2], [5, 3], [8, 3], [9, 4], [12, 4], [13, 5], [16, 5], [17, 6], [20, 6],
  ])('livello %i → +%i', (level, pb) => {
    expect(proficiencyBonus(level)).toBe(pb);
  });

  it('somma i livelli del multiclasse', () => {
    const c = char((c) => {
      c.classes = [{ ...newClass(), level: 3 }, { ...newClass(), level: 2 }];
    });
    expect(totalLevel(c)).toBe(5);
  });

  it('senza classi vale livello 1', () => {
    expect(totalLevel(char((c) => { c.classes = []; }))).toBe(1);
  });
});

describe('tiri salvezza e abilità', () => {
  it('tiro salvezza con e senza competenza', () => {
    const c = char((c) => {
      atLevel(5)(c);
      c.abilities.dex = 14;
    });
    expect(savingThrow(c, 'dex')).toBe(2);
    c.saveProficiencies.dex = true;
    expect(savingThrow(c, 'dex')).toBe(5);
  });

  it('competenza, maestria e bonus extra', () => {
    const c = char((c) => {
      atLevel(5)(c);
      c.abilities.dex = 16;
      c.skills.stealth = { level: 'proficient', bonus: 0 };
      c.skills.acrobatics = { level: 'expertise', bonus: 1 };
    });
    expect(skillBonus(c, 'stealth')).toBe(3 + 3);
    expect(skillBonus(c, 'acrobatics')).toBe(3 + 6 + 1);
    expect(skillBonus(c, 'sleightOfHand')).toBe(3);
  });

  it('factotum aggiunge metà competenza (per difetto) solo senza competenza', () => {
    const c = char((c) => {
      atLevel(5)(c);
      c.jackOfAllTrades = true;
      c.skills.stealth = { level: 'proficient', bonus: 0 };
    });
    expect(skillBonus(c, 'athletics')).toBe(1);
    expect(skillBonus(c, 'stealth')).toBe(3);
  });

  it('percezione passiva', () => {
    const c = char((c) => {
      c.abilities.wis = 14;
      c.skills.perception = { level: 'proficient', bonus: 0 };
    });
    expect(passivePerception(c)).toBe(14);
  });

  it('iniziativa con factotum e bonus', () => {
    const c = char((c) => {
      atLevel(5)(c);
      c.abilities.dex = 14;
      c.jackOfAllTrades = true;
      c.initiativeBonus = 5;
    });
    expect(initiative(c)).toBe(2 + 1 + 5);
  });
});

describe('classe armatura', () => {
  const withArmor = (type: Dnd5eCharacter['armor']['type'], base: number, dex: number) =>
    char((c) => {
      c.armor = { type, base, shield: false, bonus: 0 };
      c.abilities.dex = dex;
      c.abilities.con = 14;
      c.abilities.wis = 16;
    });

  it('nessuna armatura', () => expect(armorClass(withArmor('none', 0, 14))).toBe(12));
  it('leggera', () => expect(armorClass(withArmor('light', 12, 16))).toBe(15));
  it('media limita la DES a +2', () => expect(armorClass(withArmor('medium', 14, 18))).toBe(16));
  it('media con DES bassa', () => expect(armorClass(withArmor('medium', 14, 8))).toBe(13));
  it('pesante ignora la DES', () => expect(armorClass(withArmor('heavy', 18, 8))).toBe(18));
  it('barbaro', () => expect(armorClass(withArmor('unarmoredBarbarian', 0, 14))).toBe(14));
  it('monaco', () => expect(armorClass(withArmor('unarmoredMonk', 0, 14))).toBe(15));
  it('scudo e bonus', () => {
    const c = withArmor('heavy', 16, 10);
    c.armor.shield = true;
    c.armor.bonus = 1;
    expect(armorClass(c)).toBe(19);
  });
});

describe('attacchi', () => {
  const c = char((c) => { c.abilities.str = 16; });

  it('tiro per colpire', () => {
    expect(attackToHit(c, { ...newAttack(), attackBonus: 1 })).toBe(3 + 2 + 1);
    expect(attackToHit(c, { ...newAttack(), proficient: false })).toBe(3);
  });

  it('danno', () => {
    expect(attackDamage(c, { ...newAttack(), damageDice: '1d8' })).toBe('1d8 + 3');
    expect(attackDamage(c, { ...newAttack(), damageDice: '1d8', addModToDamage: false })).toBe('1d8');
    expect(attackDamage(c, { ...newAttack(), damageDice: ' 2d6 ', damageBonus: -4 })).toBe('2d6 - 1');
    expect(attackDamage(c, { ...newAttack(), damageDice: '' })).toBe('3');
  });
});

describe('incantesimi', () => {
  it('CD e attacco', () => {
    const c = char((c) => {
      atLevel(5)(c);
      c.abilities.int = 16;
      c.spellcasting.ability = 'int';
    });
    expect(spellSaveDC(c)).toBe(14);
    expect(spellAttackBonus(c)).toBe(6);
  });

  it('senza caratteristica da incantatore', () => {
    expect(spellSaveDC(createBlank())).toBeNull();
    expect(spellAttackBonus(createBlank())).toBeNull();
  });
});

describe('dadi vita', () => {
  it('totali per tipo con multiclasse', () => {
    const c = char((c) => {
      c.classes = [
        { ...newClass(), level: 3, hitDie: 10 },
        { ...newClass(), level: 2, hitDie: 6 },
        { ...newClass(), level: 1, hitDie: 10 },
      ];
    });
    expect(hitDiceTotals(c)).toEqual({ d6: 2, d8: 0, d10: 4, d12: 0 });
  });
});

describe('peso', () => {
  it('somma oggetti e monete', () => {
    const c = char((c) => {
      c.inventory.items = [
        { ...newItem(), quantity: 2, weightKg: 1.5 },
        { ...newItem(), quantity: 1, weightKg: 0.5 },
      ];
      c.inventory.coins.gp = 60;
      c.inventory.coins.sp = 40;
    });
    expect(totalWeightKg(c)).toBe(4.5);
  });

  it('capacità di carico', () => {
    expect(carryingCapacityKg(char((c) => { c.abilities.str = 15; }))).toBe(112.5);
  });
});

describe('summary', () => {
  it('razza, classi e livello', () => {
    const c = char((c) => {
      c.race = 'Elfo';
      c.classes = [
        { ...newClass(), name: 'Mago', level: 3 },
        { ...newClass(), name: 'Guerriero', level: 2 },
      ];
    });
    expect(summary(c)).toBe('Elfo · Mago 3 / Guerriero 2 — liv. 5');
  });

  it('senza dati', () => {
    expect(summary(createBlank())).toBe('Livello 1');
  });
});
```

- [ ] **Step 2: Esegui il test**

Run: `npm test -- src/systems/dnd5e-2014/rules`
Expected: FAIL, modulo `./rules` non trovato.

- [ ] **Step 3: Implementa rules.ts**

`src/systems/dnd5e-2014/rules.ts`:
```ts
import { hitDieKey, SKILL_ABILITY, type Ability, type Attack, type Coins, type Dnd5eCharacter, type HitDieKey, type Skill } from './model';

const KG_PER_COIN = 0.01;
const KG_PER_STR = 7.5;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function totalLevel(c: Dnd5eCharacter): number {
  return Math.max(1, c.classes.reduce((sum, k) => sum + k.level, 0));
}

export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}

function pb(c: Dnd5eCharacter): number {
  return proficiencyBonus(totalLevel(c));
}

function mod(c: Dnd5eCharacter, a: Ability): number {
  return abilityModifier(c.abilities[a]);
}

function jackBonus(c: Dnd5eCharacter): number {
  return c.jackOfAllTrades ? Math.floor(pb(c) / 2) : 0;
}

export function savingThrow(c: Dnd5eCharacter, a: Ability): number {
  return mod(c, a) + (c.saveProficiencies[a] ? pb(c) : 0);
}

export function skillBonus(c: Dnd5eCharacter, s: Skill): number {
  const { level, bonus } = c.skills[s];
  const prof = level === 'expertise' ? 2 * pb(c) : level === 'proficient' ? pb(c) : jackBonus(c);
  return mod(c, SKILL_ABILITY[s]) + prof + bonus;
}

export function passivePerception(c: Dnd5eCharacter): number {
  return 10 + skillBonus(c, 'perception');
}

export function initiative(c: Dnd5eCharacter): number {
  return mod(c, 'dex') + jackBonus(c) + c.initiativeBonus;
}

export function armorClass(c: Dnd5eCharacter): number {
  const dex = mod(c, 'dex');
  const { type, base, shield, bonus } = c.armor;
  let ac: number;
  switch (type) {
    case 'none':
      ac = 10 + dex;
      break;
    case 'light':
      ac = base + dex;
      break;
    case 'medium':
      ac = base + Math.min(dex, 2);
      break;
    case 'heavy':
      ac = base;
      break;
    case 'unarmoredBarbarian':
      ac = 10 + dex + mod(c, 'con');
      break;
    case 'unarmoredMonk':
      ac = 10 + dex + mod(c, 'wis');
      break;
  }
  return ac + (shield ? 2 : 0) + bonus;
}

export function attackToHit(c: Dnd5eCharacter, a: Attack): number {
  return mod(c, a.ability) + (a.proficient ? pb(c) : 0) + a.attackBonus;
}

export function attackDamage(c: Dnd5eCharacter, a: Attack): string {
  const flat = (a.addModToDamage ? mod(c, a.ability) : 0) + a.damageBonus;
  const dice = a.damageDice.trim();
  if (!dice) return String(flat);
  if (flat === 0) return dice;
  return `${dice} ${flat > 0 ? '+' : '-'} ${Math.abs(flat)}`;
}

export function spellSaveDC(c: Dnd5eCharacter): number | null {
  const a = c.spellcasting.ability;
  return a ? 8 + pb(c) + mod(c, a) : null;
}

export function spellAttackBonus(c: Dnd5eCharacter): number | null {
  const a = c.spellcasting.ability;
  return a ? pb(c) + mod(c, a) : null;
}

export function hitDiceTotals(c: Dnd5eCharacter): Record<HitDieKey, number> {
  const totals: Record<HitDieKey, number> = { d6: 0, d8: 0, d10: 0, d12: 0 };
  for (const k of c.classes) totals[hitDieKey(k.hitDie)] += k.level;
  return totals;
}

export function coinCount(coins: Coins): number {
  return coins.cp + coins.sp + coins.ep + coins.gp + coins.pp;
}

export function totalWeightKg(c: Dnd5eCharacter): number {
  const items = c.inventory.items.reduce((sum, i) => sum + i.quantity * i.weightKg, 0);
  return round2(items + coinCount(c.inventory.coins) * KG_PER_COIN);
}

export function carryingCapacityKg(c: Dnd5eCharacter): number {
  return round2(c.abilities.str * KG_PER_STR);
}

export function summary(c: Dnd5eCharacter): string {
  const classes = c.classes
    .filter((k) => k.name.trim())
    .map((k) => `${k.name.trim()} ${k.level}`)
    .join(' / ');
  const parts = [c.race.trim(), classes].filter(Boolean);
  return parts.length ? `${parts.join(' · ')} — liv. ${totalLevel(c)}` : `Livello ${totalLevel(c)}`;
}
```

- [ ] **Step 4: Esegui il test**

Run: `npm test -- src/systems/dnd5e-2014/rules`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e-2014/rules.ts src/systems/dnd5e-2014/rules.test.ts
git commit -m "feat(dnd5e): add derived stat rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: D&D — azioni (danno, cura, riposi)

**Files:**
- Create: `src/systems/dnd5e-2014/actions.ts`
- Test: `src/systems/dnd5e-2014/actions.test.ts`

**Interfaces:**
- Consumes: `model.ts` (Task 3), `hitDiceTotals`, `totalLevel` da `rules.ts` (Task 4)
- Produces (funzioni pure, restituiscono un nuovo oggetto senza mutare l'input):
  - `applyDamage(c: Dnd5eCharacter, amount: number): Dnd5eCharacter`
  - `applyHealing(c, amount: number): Dnd5eCharacter`
  - `setTempHp(c, value: number): Dnd5eCharacter`
  - `interface ShortRestOptions { spend: Record<HitDieKey, number>; hpRecovered: number }`
  - `shortRest(c, opts: ShortRestOptions): Dnd5eCharacter`
  - `longRest(c): Dnd5eCharacter`

- [ ] **Step 1: Test (fallisce)**

`src/systems/dnd5e-2014/actions.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { applyDamage, applyHealing, longRest, setTempHp, shortRest } from './actions';
import { createBlank, newClass, newFeature, type Dnd5eCharacter } from './model';

function char(mut: (c: Dnd5eCharacter) => void): Dnd5eCharacter {
  const c = createBlank();
  mut(c);
  return c;
}

const noSpend = { d6: 0, d8: 0, d10: 0, d12: 0 };

describe('danno e cura', () => {
  const base = char((c) => { c.hp = { max: 20, current: 20, temp: 5 }; });

  it('il danno scala prima i PF temporanei', () => {
    expect(applyDamage(base, 3).hp).toEqual({ max: 20, current: 20, temp: 2 });
    expect(applyDamage(base, 8).hp).toEqual({ max: 20, current: 17, temp: 0 });
  });

  it('i PF non scendono sotto zero', () => {
    expect(applyDamage(base, 100).hp).toEqual({ max: 20, current: 0, temp: 0 });
  });

  it('non muta i dati originali', () => {
    applyDamage(base, 8);
    expect(base.hp).toEqual({ max: 20, current: 20, temp: 5 });
  });

  it('la cura non supera il massimo e non tocca i temporanei', () => {
    const hurt = char((c) => { c.hp = { max: 20, current: 5, temp: 3 }; });
    expect(applyHealing(hurt, 4).hp).toEqual({ max: 20, current: 9, temp: 3 });
    expect(applyHealing(hurt, 50).hp).toEqual({ max: 20, current: 20, temp: 3 });
  });

  it('valori negativi vengono ignorati', () => {
    expect(applyDamage(base, -5).hp).toEqual(base.hp);
    expect(applyHealing(base, -5).hp).toEqual(base.hp);
  });

  it('i PF temporanei si impostano, non si sommano', () => {
    expect(setTempHp(base, 8).hp.temp).toBe(8);
    expect(setTempHp(base, -1).hp.temp).toBe(0);
  });
});

describe('riposo breve', () => {
  const c = char((c) => {
    c.classes = [{ ...newClass(), level: 5, hitDie: 8 }];
    c.hitDiceUsed.d8 = 1;
    c.hp = { max: 40, current: 10, temp: 0 };
    c.spellcasting.slots[0] = { max: 4, used: 3 };
    c.spellcasting.pact = { slotLevel: 3, max: 2, used: 2 };
    c.features = [
      { ...newFeature(), uses: { max: 1, used: 1, recharge: 'short' } },
      { ...newFeature(), uses: { max: 1, used: 1, recharge: 'long' } },
    ];
  });

  it('spende dadi vita e recupera PF', () => {
    const r = shortRest(c, { spend: { ...noSpend, d8: 2 }, hpRecovered: 12 });
    expect(r.hitDiceUsed.d8).toBe(3);
    expect(r.hp.current).toBe(22);
  });

  it('non spende più dadi di quelli disponibili', () => {
    const r = shortRest(c, { spend: { ...noSpend, d8: 10, d12: 3 }, hpRecovered: 0 });
    expect(r.hitDiceUsed.d8).toBe(5);
    expect(r.hitDiceUsed.d12).toBe(0);
  });

  it('i PF recuperati non superano il massimo', () => {
    expect(shortRest(c, { spend: noSpend, hpRecovered: 999 }).hp.current).toBe(40);
  });

  it('ripristina privilegi a riposo breve e slot del patto, non gli altri', () => {
    const r = shortRest(c, { spend: noSpend, hpRecovered: 0 });
    expect(r.features[0].uses?.used).toBe(0);
    expect(r.features[1].uses?.used).toBe(1);
    expect(r.spellcasting.pact.used).toBe(0);
    expect(r.spellcasting.slots[0].used).toBe(3);
  });
});

describe('riposo lungo', () => {
  const c = char((c) => {
    c.classes = [
      { ...newClass(), level: 3, hitDie: 10 },
      { ...newClass(), level: 2, hitDie: 6 },
    ];
    c.hitDiceUsed = { d6: 2, d8: 0, d10: 3, d12: 0 };
    c.hp = { max: 40, current: 3, temp: 4 };
    c.spellcasting.slots[0] = { max: 4, used: 4 };
    c.spellcasting.slots[2] = { max: 2, used: 1 };
    c.spellcasting.pact = { slotLevel: 1, max: 1, used: 1 };
    c.features = [
      { ...newFeature(), uses: { max: 1, used: 1, recharge: 'short' } },
      { ...newFeature(), uses: { max: 1, used: 1, recharge: 'long' } },
      { ...newFeature(), uses: { max: 1, used: 1, recharge: 'none' } },
      newFeature(),
    ];
    c.deathSaves = { successes: 2, failures: 1 };
    c.exhaustion = 2;
  });

  it('ripristina PF e azzera i temporanei', () => {
    expect(longRest(c).hp).toEqual({ max: 40, current: 40, temp: 0 });
  });

  it('recupera metà dei dadi vita partendo dai più grandi', () => {
    expect(longRest(c).hitDiceUsed).toEqual({ d6: 2, d8: 0, d10: 1, d12: 0 });
  });

  it('recupera almeno un dado vita', () => {
    const lvl1 = char((c) => {
      c.classes = [{ ...newClass(), level: 1, hitDie: 12 }];
      c.hitDiceUsed.d12 = 1;
    });
    expect(longRest(lvl1).hitDiceUsed.d12).toBe(0);
  });

  it('ripristina slot e privilegi breve/lungo', () => {
    const r = longRest(c);
    expect(r.spellcasting.slots.every((s) => s.used === 0)).toBe(true);
    expect(r.spellcasting.pact.used).toBe(0);
    expect(r.features.map((f) => f.uses?.used ?? null)).toEqual([0, 0, 1, null]);
  });

  it('azzera i tiri contro morte e riduce lo sfinimento', () => {
    const r = longRest(c);
    expect(r.deathSaves).toEqual({ successes: 0, failures: 0 });
    expect(r.exhaustion).toBe(1);
    expect(longRest({ ...c, exhaustion: 0 }).exhaustion).toBe(0);
  });
});
```

- [ ] **Step 2: Esegui il test**

Run: `npm test -- src/systems/dnd5e-2014/actions`
Expected: FAIL, modulo `./actions` non trovato.

- [ ] **Step 3: Implementa**

`src/systems/dnd5e-2014/actions.ts`:
```ts
import { HIT_DIE_KEYS, type Dnd5eCharacter, type Feature, type HitDieKey, type Recharge } from './model';
import { hitDiceTotals, totalLevel } from './rules';

export interface ShortRestOptions {
  spend: Record<HitDieKey, number>;
  hpRecovered: number;
}

export function applyDamage(c: Dnd5eCharacter, amount: number): Dnd5eCharacter {
  const dmg = Math.max(0, amount);
  const absorbed = Math.min(c.hp.temp, dmg);
  return {
    ...c,
    hp: { ...c.hp, temp: c.hp.temp - absorbed, current: Math.max(0, c.hp.current - (dmg - absorbed)) },
  };
}

export function applyHealing(c: Dnd5eCharacter, amount: number): Dnd5eCharacter {
  const heal = Math.max(0, amount);
  return { ...c, hp: { ...c.hp, current: Math.min(c.hp.max, c.hp.current + heal) } };
}

export function setTempHp(c: Dnd5eCharacter, value: number): Dnd5eCharacter {
  return { ...c, hp: { ...c.hp, temp: Math.max(0, value) } };
}

function rechargeFeatures(features: Feature[], kinds: Recharge[]): Feature[] {
  return features.map((f) => (f.uses && kinds.includes(f.uses.recharge) ? { ...f, uses: { ...f.uses, used: 0 } } : f));
}

export function shortRest(c: Dnd5eCharacter, opts: ShortRestOptions): Dnd5eCharacter {
  const totals = hitDiceTotals(c);
  const hitDiceUsed = { ...c.hitDiceUsed };
  for (const k of HIT_DIE_KEYS) {
    const available = Math.max(0, totals[k] - hitDiceUsed[k]);
    hitDiceUsed[k] += Math.min(available, Math.max(0, opts.spend[k]));
  }
  return {
    ...applyHealing(c, opts.hpRecovered),
    hitDiceUsed,
    features: rechargeFeatures(c.features, ['short']),
    spellcasting: { ...c.spellcasting, pact: { ...c.spellcasting.pact, used: 0 } },
  };
}

export function longRest(c: Dnd5eCharacter): Dnd5eCharacter {
  let budget = Math.max(1, Math.floor(totalLevel(c) / 2));
  const hitDiceUsed = { ...c.hitDiceUsed };
  for (const k of [...HIT_DIE_KEYS].reverse()) {
    const recovered = Math.min(budget, hitDiceUsed[k]);
    hitDiceUsed[k] -= recovered;
    budget -= recovered;
  }
  return {
    ...c,
    hp: { ...c.hp, current: c.hp.max, temp: 0 },
    hitDiceUsed,
    spellcasting: {
      ...c.spellcasting,
      slots: c.spellcasting.slots.map((s) => ({ ...s, used: 0 })),
      pact: { ...c.spellcasting.pact, used: 0 },
    },
    features: rechargeFeatures(c.features, ['short', 'long']),
    deathSaves: { successes: 0, failures: 0 },
    exhaustion: Math.max(0, c.exhaustion - 1),
  };
}
```

- [ ] **Step 4: Esegui il test**

Run: `npm test -- src/systems/dnd5e-2014/actions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e-2014/actions.ts src/systems/dnd5e-2014/actions.test.ts
git commit -m "feat(dnd5e): add damage, healing and rest actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Componenti UI condivisi

**Files:**
- Create: `src/ui/fields.tsx`, `src/ui/Pips.tsx`, `src/ui/format.ts`
- Test: `src/ui/fields.test.tsx`, `src/ui/Pips.test.tsx`, `src/ui/format.test.ts`

**Interfaces:**
- Consumes: classi CSS del Task 1
- Produces:
  - `NumberInput({ label, value, onChange, min?, max?, integer? = true, className?, hideLabel? })`: input testuale con `inputMode` numerico, bozza locale durante la digitazione, arrotonda per troncamento se `integer`, limita a `min`/`max`, accetta la virgola decimale, non chiama `onChange` con campo vuoto o testo non numerico
  - `TextInput({ label, value, onChange, className?, hideLabel?, placeholder? })`
  - `TextArea({ label, value, onChange, rows? = 4 })`
  - `Checkbox({ label, checked, onChange, ariaLabel?, className? })`
  - `Select<T extends string>({ label, value, options: readonly { value: T; label: string }[], onChange, hideLabel? })`
  - `Section({ title, children, actions? })`
  - `Stat({ label, value, ariaLabel? })`: `<output aria-label={ariaLabel ?? label}>`
  - `Pips({ label, count, max, onChange, hideLabel? })`: `max` caselle; cliccare la casella i-esima spuntata porta il conteggio a i, non spuntata a i+1; con `max > 10` mostra un `NumberInput`
  - `signed(n: number): string` (`+2`, `0` → `+0`, `-1`), `formatNumber(n: number): string` (it-IT, max 2 decimali)

- [ ] **Step 1: Test (falliscono)**

`src/ui/format.test.ts`:
```ts
import { expect, it } from 'vitest';
import { formatNumber, signed } from './format';

it('signed', () => {
  expect(signed(2)).toBe('+2');
  expect(signed(0)).toBe('+0');
  expect(signed(-1)).toBe('-1');
});

it('formatNumber usa la virgola e al massimo 2 decimali', () => {
  expect(formatNumber(112.5)).toBe('112,5');
  expect(formatNumber(3)).toBe('3');
  expect(formatNumber(1.234)).toBe('1,23');
});
```

`src/ui/fields.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox, NumberInput, Select, Stat } from './fields';

function ControlledNumber(props: { min?: number; max?: number; integer?: boolean; onValue: (v: number) => void }) {
  const [v, setV] = useState(10);
  return (
    <NumberInput
      label="Forza"
      value={v}
      min={props.min}
      max={props.max}
      integer={props.integer}
      onChange={(n) => {
        setV(n);
        props.onValue(n);
      }}
    />
  );
}

describe('NumberInput', () => {
  it('permette di svuotare e riscrivere il valore', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledNumber onValue={onValue} />);
    const input = screen.getByLabelText('Forza');
    await user.clear(input);
    expect(input).toHaveValue('');
    expect(onValue).not.toHaveBeenCalled();
    await user.type(input, '15');
    expect(onValue).toHaveBeenLastCalledWith(15);
  });

  it('limita al massimo', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledNumber max={30} onValue={onValue} />);
    const input = screen.getByLabelText('Forza');
    await user.clear(input);
    await user.type(input, '45');
    expect(onValue).toHaveBeenLastCalledWith(30);
    await user.tab();
    expect(input).toHaveValue('30');
  });

  it('accetta la virgola se non intero', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledNumber integer={false} onValue={onValue} />);
    const input = screen.getByLabelText('Forza');
    await user.clear(input);
    await user.type(input, '1,5');
    expect(onValue).toHaveBeenLastCalledWith(1.5);
  });

  it('ignora testo non numerico', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledNumber onValue={onValue} />);
    const input = screen.getByLabelText('Forza');
    await user.clear(input);
    await user.type(input, '-');
    expect(onValue).not.toHaveBeenCalled();
    await user.type(input, '2');
    expect(onValue).toHaveBeenLastCalledWith(-2);
  });
});

describe('altri campi', () => {
  it('Checkbox usa ariaLabel come nome accessibile', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox label="TS" ariaLabel="Competenza tiro salvezza Forza" checked={false} onChange={onChange} />);
    await user.click(screen.getByLabelText('Competenza tiro salvezza Forza'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Select restituisce il valore scelto', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        label="Protezione"
        value="none"
        options={[
          { value: 'none', label: 'Nessuna' },
          { value: 'light', label: 'Leggera' },
        ]}
        onChange={onChange}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Protezione'), 'light');
    expect(onChange).toHaveBeenCalledWith('light');
  });

  it('Stat espone il valore tramite etichetta', () => {
    render(<Stat label="Mod" ariaLabel="Modificatore Forza" value="+3" />);
    expect(screen.getByLabelText('Modificatore Forza')).toHaveTextContent('+3');
  });
});
```

`src/ui/Pips.test.tsx`:
```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Pips } from './Pips';

it('spuntare aumenta, togliere la spunta riduce', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<Pips label="Slot" count={1} max={3} onChange={onChange} />);
  const boxes = within(screen.getByRole('group', { name: 'Slot' })).getAllByRole('checkbox');
  expect(boxes).toHaveLength(3);
  expect(boxes[0]).toBeChecked();
  await user.click(boxes[2]);
  expect(onChange).toHaveBeenLastCalledWith(3);
  await user.click(boxes[0]);
  expect(onChange).toHaveBeenLastCalledWith(0);
});

it('oltre 10 usa un campo numerico', () => {
  render(<Pips label="Utilizzi" count={4} max={20} onChange={() => {}} />);
  expect(screen.getByLabelText('Utilizzi')).toHaveValue('4');
});
```

- [ ] **Step 2: Esegui i test**

Run: `npm test -- src/ui`
Expected: FAIL, moduli non trovati.

- [ ] **Step 3: Implementa**

`src/ui/format.ts`:
```ts
export function signed(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

export function formatNumber(n: number): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: 2 });
}
```

`src/ui/fields.tsx`:
```tsx
import { useState, type ReactNode } from 'react';

function labelClass(hideLabel?: boolean) {
  return hideLabel ? 'visually-hidden' : 'field-label';
}

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  integer?: boolean;
  className?: string;
  hideLabel?: boolean;
}

export function NumberInput({ label, value, onChange, min, max, integer = true, className, hideLabel }: NumberInputProps) {
  // Bozza locale: permette di svuotare il campo o scrivere "-" senza che il valore salti.
  const [draft, setDraft] = useState<string | null>(null);

  function handleChange(text: string) {
    setDraft(text);
    if (text.trim() === '') return;
    const n = Number(text.replace(',', '.'));
    if (!Number.isFinite(n)) return;
    let v = integer ? Math.trunc(n) : n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    onChange(v);
  }

  const inputMode = min !== undefined && min >= 0 ? (integer ? 'numeric' : 'decimal') : 'text';

  return (
    <label className={`field ${className ?? ''}`}>
      <span className={labelClass(hideLabel)}>{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        value={draft ?? String(value)}
        onFocus={() => setDraft(String(value))}
        onBlur={() => setDraft(null)}
        onChange={(e) => handleChange(e.target.value)}
      />
    </label>
  );
}

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  hideLabel?: boolean;
  placeholder?: string;
}

export function TextInput({ label, value, onChange, className, hideLabel, placeholder }: TextInputProps) {
  return (
    <label className={`field ${className ?? ''}`}>
      <span className={labelClass(hideLabel)}>{label}</span>
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function TextArea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  className?: string;
}

export function Checkbox({ label, checked, onChange, ariaLabel, className }: CheckboxProps) {
  return (
    <label className={`check ${className ?? ''}`}>
      <input type="checkbox" aria-label={ariaLabel} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
}

export function Select<T extends string>({ label, value, options, onChange, hideLabel }: SelectProps<T>) {
  return (
    <label className="field">
      <span className={labelClass(hideLabel)}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card section">
      <header className="section-header">
        <h2>{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function Stat({ label, value, ariaLabel }: { label: string; value: string | number; ariaLabel?: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <output className="stat-value" aria-label={ariaLabel ?? label}>
        {value}
      </output>
    </div>
  );
}
```

`src/ui/Pips.tsx`:
```tsx
import { NumberInput } from './fields';

interface PipsProps {
  label: string;
  count: number;
  max: number;
  onChange: (count: number) => void;
  hideLabel?: boolean;
}

const MAX_PIPS = 10;

export function Pips({ label, count, max, onChange, hideLabel }: PipsProps) {
  if (max > MAX_PIPS) {
    return <NumberInput label={label} value={count} min={0} max={max} onChange={onChange} hideLabel={hideLabel} />;
  }
  return (
    <div className="pips-field">
      <span className={hideLabel ? 'visually-hidden' : 'field-label'}>{label}</span>
      <div className="pips" role="group" aria-label={label}>
        {Array.from({ length: max }, (_, i) => (
          <input
            key={i}
            type="checkbox"
            aria-label={`${label} ${i + 1}`}
            checked={i < count}
            onChange={() => onChange(i < count ? i : i + 1)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Esegui i test**

Run: `npm test -- src/ui`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui
git commit -m "feat(ui): add shared form fields, pips and formatters

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Scheda — struttura e tab Principale

**Files:**
- Create: `src/systems/dnd5e-2014/sheet/types.ts`, `src/systems/dnd5e-2014/sheet/listOps.ts`, `src/systems/dnd5e-2014/sheet/testUtils.tsx`, `src/systems/dnd5e-2014/sheet/Sheet.tsx`, `src/systems/dnd5e-2014/sheet/MainTab.tsx`
- Test: `src/systems/dnd5e-2014/sheet/listOps.test.ts`, `src/systems/dnd5e-2014/sheet/MainTab.test.tsx`

**Interfaces:**
- Consumes: `model.ts`, `labels.ts`, `rules.ts`, `src/ui/*`, `SheetProps` da `src/core/types.ts`
- Produces:
  - `interface TabProps { data: Dnd5eCharacter; onChange: (next: Dnd5eCharacter) => void }`
  - `updateById<T extends { id: string }>(list: readonly T[], id: string, patch: Partial<T>): T[]`, `removeById<T extends { id: string }>(list: readonly T[], id: string): T[]`
  - `renderSheet(initial?: Dnd5eCharacter): RenderResult & { data: () => Dnd5eCharacter }` (solo test)
  - `Sheet(props: SheetProps<Dnd5eCharacter>)`: pannelli `role="tabpanel"` con `aria-label` = etichetta tab; barra `role="tablist"` con pulsanti `role="tab"`. Array `TABS` a cui i task 8–11 aggiungono voci.
  - `MainTab(props: TabProps)`; etichette accessibili usate dai test: `Nome personaggio`, `Razza`, `Background`, `Allineamento`, `Punti esperienza`, `Ispirazione`, `Classe`, `Sottoclasse`, `Livello`, `Dado vita`, `Livello totale`, `Bonus competenza`, `<Caratteristica>` (es. `Forza`), `Modificatore <Caratteristica>`, `Competenza tiro salvezza <Caratteristica>`, `Tiro salvezza <Caratteristica>`, `Competenza <Abilità>`, `Bonus extra <Abilità>`, `Bonus <Abilità>`, `Percezione passiva`, `Lingue`, `Strumenti`, `Armi`, `Armature`

- [ ] **Step 1: Test (falliscono)**

`src/systems/dnd5e-2014/sheet/listOps.test.ts`:
```ts
import { expect, it } from 'vitest';
import { removeById, updateById } from './listOps';

const list = [{ id: 'a', n: 1 }, { id: 'b', n: 2 }];

it('updateById aggiorna solo la voce indicata', () => {
  expect(updateById(list, 'b', { n: 5 })).toEqual([{ id: 'a', n: 1 }, { id: 'b', n: 5 }]);
  expect(list[1].n).toBe(2);
});

it('removeById rimuove la voce indicata', () => {
  expect(removeById(list, 'a')).toEqual([{ id: 'b', n: 2 }]);
});
```

`src/systems/dnd5e-2014/sheet/MainTab.test.tsx`:
```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderSheet } from './testUtils';

function panel() {
  return within(screen.getByRole('tabpanel', { name: 'Principale' }));
}

describe('tab Principale', () => {
  it('aggiorna il modificatore quando cambia il punteggio', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    const input = panel().getByLabelText('Forza');
    await user.clear(input);
    await user.type(input, '16');
    expect(panel().getByLabelText('Modificatore Forza')).toHaveTextContent('+3');
    expect(data().abilities.str).toBe(16);
  });

  it('tiro salvezza con competenza', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.click(panel().getByLabelText('Competenza tiro salvezza Destrezza'));
    expect(data().saveProficiencies.dex).toBe(true);
    expect(panel().getByLabelText('Tiro salvezza Destrezza')).toHaveTextContent('+2');
  });

  it('maestria e factotum cambiano i bonus delle abilità', async () => {
    const user = userEvent.setup();
    renderSheet();
    const level = panel().getByLabelText('Livello');
    await user.clear(level);
    await user.type(level, '5');
    expect(panel().getByLabelText('Bonus competenza')).toHaveTextContent('+3');

    await user.selectOptions(panel().getByLabelText('Competenza Furtività'), 'expertise');
    expect(panel().getByLabelText('Bonus Furtività')).toHaveTextContent('+6');

    await user.click(panel().getByLabelText(/Factotum/));
    expect(panel().getByLabelText('Bonus Atletica')).toHaveTextContent('+1');
  });

  it('aggiunge e rimuove classi', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.click(panel().getByRole('button', { name: '+ Classe' }));
    expect(panel().getAllByLabelText('Classe')).toHaveLength(2);
    expect(panel().getByLabelText('Livello totale')).toHaveTextContent('2');
    await user.click(panel().getAllByRole('button', { name: /Rimuovi classe/ })[0]);
    expect(data().classes).toHaveLength(1);
  });

  it('modifica identità', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.type(panel().getByLabelText('Nome personaggio'), 'Lia');
    await user.type(panel().getByLabelText('Razza'), 'Elfo');
    expect(data().name).toBe('Lia');
    expect(data().race).toBe('Elfo');
  });
});
```

- [ ] **Step 2: Esegui i test**

Run: `npm test -- src/systems/dnd5e-2014/sheet`
Expected: FAIL, moduli non trovati.

- [ ] **Step 3: Implementa supporto**

`src/systems/dnd5e-2014/sheet/types.ts`:
```ts
import type { Dnd5eCharacter } from '../model';

export interface TabProps {
  data: Dnd5eCharacter;
  onChange: (next: Dnd5eCharacter) => void;
}
```

`src/systems/dnd5e-2014/sheet/listOps.ts`:
```ts
export function updateById<T extends { id: string }>(list: readonly T[], id: string, patch: Partial<T>): T[] {
  return list.map((x) => (x.id === id ? { ...x, ...patch } : x));
}

export function removeById<T extends { id: string }>(list: readonly T[], id: string): T[] {
  return list.filter((x) => x.id !== id);
}
```

`src/systems/dnd5e-2014/sheet/testUtils.tsx`:
```tsx
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
```

- [ ] **Step 4: Implementa Sheet e MainTab**

`src/systems/dnd5e-2014/sheet/Sheet.tsx`:
```tsx
import { useState, type ComponentType } from 'react';
import type { SheetProps } from '../../../core/types';
import type { Dnd5eCharacter } from '../model';
import { MainTab } from './MainTab';
import type { TabProps } from './types';

const TABS: { id: string; label: string; Component: ComponentType<TabProps> }[] = [
  { id: 'main', label: 'Principale', Component: MainTab },
];

export function Sheet({ data, onChange }: SheetProps<Dnd5eCharacter>) {
  const [active, setActive] = useState(TABS[0].id);
  return (
    <div className="sheet">
      <div className="sheet-panels">
        {TABS.map(({ id, label, Component }) => (
          <div key={id} className="panel" role="tabpanel" aria-label={label} data-active={active === id}>
            <Component data={data} onChange={onChange} />
          </div>
        ))}
      </div>
      <nav className="tabbar" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" className="tab" aria-selected={active === t.id} onClick={() => setActive(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
```

`src/systems/dnd5e-2014/sheet/MainTab.tsx`:
```tsx
import { Checkbox, NumberInput, Section, Select, Stat, TextArea, TextInput } from '../../../ui/fields';
import { signed } from '../../../ui/format';
import { ABILITY_LABEL, PROFICIENCY_OPTIONS, SKILL_LABEL } from '../labels';
import { ABILITIES, HIT_DIE_KEYS, newClass, SKILL_ABILITY, SKILLS, type Dnd5eCharacter, type HitDie, type HitDieKey } from '../model';
import { abilityModifier, passivePerception, proficiencyBonus, savingThrow, skillBonus, totalLevel } from '../rules';
import { removeById, updateById } from './listOps';
import type { TabProps } from './types';

const DIE_OPTIONS = HIT_DIE_KEYS.map((k) => ({ value: k, label: k }));

export function MainTab({ data, onChange }: TabProps) {
  const set = <K extends keyof Dnd5eCharacter>(key: K, value: Dnd5eCharacter[K]) => onChange({ ...data, [key]: value });
  const level = totalLevel(data);
  const other = data.otherProficiencies;

  return (
    <>
      <Section title="Identità">
        <div className="grid-2">
          <TextInput label="Nome personaggio" value={data.name} onChange={(v) => set('name', v)} />
          <TextInput label="Razza" value={data.race} onChange={(v) => set('race', v)} />
          <TextInput label="Background" value={data.background} onChange={(v) => set('background', v)} />
          <TextInput label="Allineamento" value={data.alignment} onChange={(v) => set('alignment', v)} />
          <NumberInput label="Punti esperienza" value={data.xp} min={0} max={9_999_999} onChange={(v) => set('xp', v)} />
          <Checkbox label="Ispirazione" checked={data.inspiration} onChange={(v) => set('inspiration', v)} />
        </div>
      </Section>

      <Section
        title="Classi"
        actions={
          <button type="button" className="btn small" onClick={() => set('classes', [...data.classes, newClass()])}>
            + Classe
          </button>
        }
      >
        {data.classes.map((k) => {
          const patch = (p: Partial<typeof k>) => set('classes', updateById(data.classes, k.id, p));
          return (
            <div className="row" key={k.id}>
              <TextInput label="Classe" value={k.name} onChange={(v) => patch({ name: v })} />
              <TextInput label="Sottoclasse" value={k.subclass} onChange={(v) => patch({ subclass: v })} />
              <NumberInput label="Livello" className="narrow" value={k.level} min={1} max={20} onChange={(v) => patch({ level: v })} />
              <Select<HitDieKey>
                label="Dado vita"
                value={`d${k.hitDie}`}
                options={DIE_OPTIONS}
                onChange={(v) => patch({ hitDie: Number(v.slice(1)) as HitDie })}
              />
              <button
                type="button"
                className="btn small danger"
                aria-label={`Rimuovi classe ${k.name}`}
                onClick={() => set('classes', removeById(data.classes, k.id))}
              >
                ✕
              </button>
            </div>
          );
        })}
        <div className="stats-row">
          <Stat label="Livello totale" value={level} />
          <Stat label="Bonus competenza" value={signed(proficiencyBonus(level))} />
        </div>
      </Section>

      <Section title="Caratteristiche">
        <div className="abilities">
          {ABILITIES.map((a) => {
            const name = ABILITY_LABEL[a].long;
            return (
              <div className="ability" key={a}>
                <NumberInput
                  label={name}
                  value={data.abilities[a]}
                  min={1}
                  max={30}
                  onChange={(v) => set('abilities', { ...data.abilities, [a]: v })}
                />
                <Stat label="Mod" ariaLabel={`Modificatore ${name}`} value={signed(abilityModifier(data.abilities[a]))} />
                <div className="row">
                  <Checkbox
                    label="TS"
                    ariaLabel={`Competenza tiro salvezza ${name}`}
                    checked={data.saveProficiencies[a]}
                    onChange={(v) => set('saveProficiencies', { ...data.saveProficiencies, [a]: v })}
                  />
                  <output aria-label={`Tiro salvezza ${name}`}>{signed(savingThrow(data, a))}</output>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Abilità">
        <Checkbox
          label="Factotum (metà competenza alle prove senza competenza)"
          checked={data.jackOfAllTrades}
          onChange={(v) => set('jackOfAllTrades', v)}
        />
        <ul className="skills">
          {SKILLS.map((s) => {
            const name = SKILL_LABEL[s];
            const entry = data.skills[s];
            return (
              <li className="skill" key={s}>
                <Select
                  hideLabel
                  label={`Competenza ${name}`}
                  value={entry.level}
                  options={PROFICIENCY_OPTIONS}
                  onChange={(v) => set('skills', { ...data.skills, [s]: { ...entry, level: v } })}
                />
                <span className="skill-name">
                  {name} <small className="muted">({ABILITY_LABEL[SKILL_ABILITY[s]].short})</small>
                </span>
                <NumberInput
                  hideLabel
                  label={`Bonus extra ${name}`}
                  value={entry.bonus}
                  min={-20}
                  max={20}
                  onChange={(v) => set('skills', { ...data.skills, [s]: { ...entry, bonus: v } })}
                />
                <output className="skill-value" aria-label={`Bonus ${name}`}>
                  {signed(skillBonus(data, s))}
                </output>
              </li>
            );
          })}
        </ul>
        <div className="stats-row">
          <Stat label="Percezione passiva" value={passivePerception(data)} />
        </div>
      </Section>

      <Section title="Altre competenze">
        <TextArea label="Lingue" rows={2} value={other.languages} onChange={(v) => set('otherProficiencies', { ...other, languages: v })} />
        <TextArea label="Strumenti" rows={2} value={other.tools} onChange={(v) => set('otherProficiencies', { ...other, tools: v })} />
        <TextArea label="Armi" rows={2} value={other.weapons} onChange={(v) => set('otherProficiencies', { ...other, weapons: v })} />
        <TextArea label="Armature" rows={2} value={other.armor} onChange={(v) => set('otherProficiencies', { ...other, armor: v })} />
      </Section>
    </>
  );
}
```

- [ ] **Step 5: Esegui i test e il typecheck**

Run: `npm test -- src/systems/dnd5e-2014/sheet`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e-2014/sheet
git commit -m "feat(dnd5e): add sheet layout and main tab

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Scheda — tab Combattimento

**Files:**
- Create: `src/systems/dnd5e-2014/sheet/CombatTab.tsx`, `src/systems/dnd5e-2014/sheet/AttacksSection.tsx`, `src/systems/dnd5e-2014/sheet/ShortRestForm.tsx`
- Modify: `src/systems/dnd5e-2014/sheet/Sheet.tsx` (aggiunge voce a `TABS`)
- Test: `src/systems/dnd5e-2014/sheet/CombatTab.test.tsx`

**Interfaces:**
- Consumes: `applyDamage`, `applyHealing`, `setTempHp`, `shortRest`, `longRest`, `ShortRestOptions` (Task 5); `armorClass`, `initiative`, `hitDiceTotals`, `attackToHit`, `attackDamage`, `abilityModifier` (Task 4); `ARMOR_OPTIONS`, `ABILITY_OPTIONS` (Task 3); `TabProps`, `updateById`, `removeById` (Task 7); componenti UI (Task 6)
- Produces: `CombatTab(props: TabProps)`, `AttacksSection(props: TabProps)`, `ShortRestForm({ data, onConfirm(opts: ShortRestOptions), onCancel() })`. Etichette usate dai test: `PF attuali`, `PF temporanei`, `Quantità`, pulsanti `Danno`/`Cura`, `PF massimi`, `PF correnti`, `PF temp.`, `Classe Armatura`, `Iniziativa`, `Velocità`, `Protezione`, `CA base armatura`, `Scudo (+2)`, `Bonus CA`, `Bonus iniziativa`, `Velocità (m)`, `Successi TS morte`, `Fallimenti TS morte`, `Sfinimento`, `Dadi vita dX disponibili`, `Usati dX`, pulsanti `Riposo breve`/`Riposo lungo`, `Spendi dX`, `PF recuperati`, `Conferma riposo breve`, `Annulla`, `+ Attacco`, `Nome attacco`, `Tiro per colpire <nome>`, `Danno <nome>`

- [ ] **Step 1: Test (fallisce)**

`src/systems/dnd5e-2014/sheet/CombatTab.test.tsx`:
```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createBlank, newClass } from '../model';
import { renderSheet } from './testUtils';

function panel() {
  return within(screen.getByRole('tabpanel', { name: 'Combattimento' }));
}

function wounded() {
  const c = createBlank();
  c.classes = [{ ...newClass(), level: 3, hitDie: 8 }];
  c.hp = { max: 20, current: 20, temp: 5 };
  return c;
}

describe('tab Combattimento', () => {
  it('il danno scala prima i PF temporanei', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet(wounded());
    const amount = panel().getByLabelText('Quantità');
    await user.clear(amount);
    await user.type(amount, '8');
    await user.click(panel().getByRole('button', { name: 'Danno' }));
    expect(data().hp).toEqual({ max: 20, current: 17, temp: 0 });
    expect(panel().getByLabelText('PF attuali')).toHaveTextContent('17 / 20');
    expect(amount).toHaveValue('0');
  });

  it('la cura non supera il massimo', async () => {
    const user = userEvent.setup();
    const c = wounded();
    c.hp.current = 15;
    const { data } = renderSheet(c);
    const amount = panel().getByLabelText('Quantità');
    await user.clear(amount);
    await user.type(amount, '10');
    await user.click(panel().getByRole('button', { name: 'Cura' }));
    expect(data().hp.current).toBe(20);
  });

  it('riposo breve spende dadi vita e recupera PF', async () => {
    const user = userEvent.setup();
    const c = wounded();
    c.hp.current = 5;
    const { data } = renderSheet(c);
    await user.click(panel().getByRole('button', { name: 'Riposo breve' }));
    const spend = panel().getByLabelText('Spendi d8');
    await user.clear(spend);
    await user.type(spend, '2');
    const hp = panel().getByLabelText('PF recuperati');
    await user.clear(hp);
    await user.type(hp, '9');
    await user.click(panel().getByRole('button', { name: 'Conferma riposo breve' }));
    expect(data().hitDiceUsed.d8).toBe(2);
    expect(data().hp.current).toBe(14);
    expect(panel().getByLabelText('Dadi vita d8 disponibili')).toHaveTextContent('1 / 3');
    expect(panel().queryByLabelText('PF recuperati')).not.toBeInTheDocument();
  });

  it('riposo lungo dopo conferma', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const c = wounded();
    c.hp.current = 1;
    const { data } = renderSheet(c);
    await user.click(panel().getByRole('button', { name: 'Riposo lungo' }));
    expect(data().hp).toEqual({ max: 20, current: 20, temp: 0 });
  });

  it('riposo lungo annullato non cambia nulla', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const c = wounded();
    c.hp.current = 1;
    const { data } = renderSheet(c);
    await user.click(panel().getByRole('button', { name: 'Riposo lungo' }));
    expect(data().hp.current).toBe(1);
  });

  it('CA con armatura media e scudo', async () => {
    const user = userEvent.setup();
    const c = createBlank();
    c.abilities.dex = 18;
    renderSheet(c);
    await user.selectOptions(panel().getByLabelText('Protezione'), 'medium');
    const base = panel().getByLabelText('CA base armatura');
    await user.clear(base);
    await user.type(base, '14');
    await user.click(panel().getByLabelText('Scudo (+2)'));
    expect(panel().getByLabelText('Classe Armatura')).toHaveTextContent('18');
  });

  it('attacco mostra tiro per colpire e danno', async () => {
    const user = userEvent.setup();
    const c = createBlank();
    c.abilities.str = 16;
    renderSheet(c);
    await user.click(panel().getByRole('button', { name: '+ Attacco' }));
    await user.type(panel().getByLabelText('Nome attacco'), 'Spada');
    expect(panel().getByLabelText('Tiro per colpire Spada')).toHaveTextContent('+5');
    expect(panel().getByLabelText('Danno Spada')).toHaveTextContent('1d6 + 3');
  });
});
```

- [ ] **Step 2: Esegui il test**

Run: `npm test -- src/systems/dnd5e-2014/sheet/CombatTab`
Expected: FAIL, nessun tabpanel `Combattimento`.

- [ ] **Step 3: Implementa ShortRestForm**

`src/systems/dnd5e-2014/sheet/ShortRestForm.tsx`:
```tsx
import { useState } from 'react';
import { NumberInput } from '../../../ui/fields';
import { signed } from '../../../ui/format';
import type { ShortRestOptions } from '../actions';
import { HIT_DIE_KEYS, type Dnd5eCharacter, type HitDieKey } from '../model';
import { abilityModifier, hitDiceTotals } from '../rules';

interface Props {
  data: Dnd5eCharacter;
  onConfirm: (opts: ShortRestOptions) => void;
  onCancel: () => void;
}

export function ShortRestForm({ data, onConfirm, onCancel }: Props) {
  const totals = hitDiceTotals(data);
  const [spend, setSpend] = useState<Record<HitDieKey, number>>({ d6: 0, d8: 0, d10: 0, d12: 0 });
  const [hp, setHp] = useState(0);
  const available = HIT_DIE_KEYS.filter((k) => totals[k] - data.hitDiceUsed[k] > 0);

  return (
    <div className="card inset" role="group" aria-label="Riposo breve">
      <p className="muted">
        Tira i dadi vita che spendi e aggiungi a ciascuno il modificatore di Costituzione ({signed(abilityModifier(data.abilities.con))}).
      </p>
      {available.length === 0 && <p>Nessun dado vita disponibile.</p>}
      <div className="row">
        {available.map((k) => (
          <NumberInput
            key={k}
            label={`Spendi ${k}`}
            value={spend[k]}
            min={0}
            max={totals[k] - data.hitDiceUsed[k]}
            onChange={(v) => setSpend({ ...spend, [k]: v })}
          />
        ))}
        <NumberInput label="PF recuperati" value={hp} min={0} max={999} onChange={setHp} />
      </div>
      <div className="row">
        <button type="button" className="btn primary" onClick={() => onConfirm({ spend, hpRecovered: hp })}>
          Conferma riposo breve
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Annulla
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implementa AttacksSection**

`src/systems/dnd5e-2014/sheet/AttacksSection.tsx`:
```tsx
import { Checkbox, NumberInput, Section, Select, TextArea, TextInput } from '../../../ui/fields';
import { signed } from '../../../ui/format';
import { ABILITY_OPTIONS } from '../labels';
import { newAttack, type Attack } from '../model';
import { attackDamage, attackToHit } from '../rules';
import { removeById, updateById } from './listOps';
import type { TabProps } from './types';

export function AttacksSection({ data, onChange }: TabProps) {
  const setAttacks = (attacks: Attack[]) => onChange({ ...data, attacks });

  return (
    <Section
      title="Attacchi"
      actions={
        <button type="button" className="btn small" onClick={() => setAttacks([...data.attacks, newAttack()])}>
          + Attacco
        </button>
      }
    >
      {data.attacks.length === 0 && <p className="muted">Nessun attacco.</p>}
      <ul className="list">
        {data.attacks.map((a) => {
          const patch = (p: Partial<Attack>) => setAttacks(updateById(data.attacks, a.id, p));
          return (
            <li key={a.id} className="list-item">
              <div className="list-summary">
                <strong>{a.name || 'Senza nome'}</strong>
                <span aria-label={`Tiro per colpire ${a.name}`}>{signed(attackToHit(data, a))}</span>
                <span aria-label={`Danno ${a.name}`}>
                  {attackDamage(data, a)} {a.damageType}
                </span>
              </div>
              <details>
                <summary>Modifica</summary>
                <div className="grid-2">
                  <TextInput label="Nome attacco" value={a.name} onChange={(v) => patch({ name: v })} />
                  <Select label="Caratteristica" value={a.ability} options={ABILITY_OPTIONS} onChange={(v) => patch({ ability: v })} />
                  <Checkbox label="Competente" checked={a.proficient} onChange={(v) => patch({ proficient: v })} />
                  <NumberInput label="Bonus al colpire" value={a.attackBonus} min={-20} max={20} onChange={(v) => patch({ attackBonus: v })} />
                  <TextInput label="Dadi danno" placeholder="1d8" value={a.damageDice} onChange={(v) => patch({ damageDice: v })} />
                  <Checkbox label="Aggiungi modificatore al danno" checked={a.addModToDamage} onChange={(v) => patch({ addModToDamage: v })} />
                  <NumberInput label="Bonus danno" value={a.damageBonus} min={-20} max={20} onChange={(v) => patch({ damageBonus: v })} />
                  <TextInput label="Tipo di danno" value={a.damageType} onChange={(v) => patch({ damageType: v })} />
                </div>
                <TextArea label="Note attacco" rows={2} value={a.notes} onChange={(v) => patch({ notes: v })} />
                <button type="button" className="btn small danger" onClick={() => setAttacks(removeById(data.attacks, a.id))}>
                  Rimuovi attacco
                </button>
              </details>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
```

- [ ] **Step 5: Implementa CombatTab**

`src/systems/dnd5e-2014/sheet/CombatTab.tsx`:
```tsx
import { useState } from 'react';
import { Checkbox, NumberInput, Section, Select, Stat } from '../../../ui/fields';
import { formatNumber, signed } from '../../../ui/format';
import { Pips } from '../../../ui/Pips';
import { applyDamage, applyHealing, longRest, setTempHp, shortRest } from '../actions';
import { ARMOR_OPTIONS } from '../labels';
import { HIT_DIE_KEYS, type Dnd5eCharacter } from '../model';
import { armorClass, hitDiceTotals, initiative } from '../rules';
import { AttacksSection } from './AttacksSection';
import { ShortRestForm } from './ShortRestForm';
import type { TabProps } from './types';

const ARMOR_WITH_BASE = new Set(['light', 'medium', 'heavy']);

export function CombatTab({ data, onChange }: TabProps) {
  const set = <K extends keyof Dnd5eCharacter>(key: K, value: Dnd5eCharacter[K]) => onChange({ ...data, [key]: value });
  const [amount, setAmount] = useState(0);
  const [resting, setResting] = useState(false);
  const totals = hitDiceTotals(data);

  function handleLongRest() {
    if (window.confirm('Riposo lungo: ripristinare PF, slot incantesimo, dadi vita e privilegi?')) onChange(longRest(data));
  }

  return (
    <>
      <Section title="Punti ferita">
        <div className="stats-row">
          <Stat label="PF attuali" value={`${data.hp.current} / ${data.hp.max}`} />
          <Stat label="PF temporanei" value={data.hp.temp} />
        </div>
        <div className="row">
          <NumberInput label="Quantità" value={amount} min={0} max={999} onChange={setAmount} />
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              onChange(applyDamage(data, amount));
              setAmount(0);
            }}
          >
            Danno
          </button>
          <button
            type="button"
            className="btn ok"
            onClick={() => {
              onChange(applyHealing(data, amount));
              setAmount(0);
            }}
          >
            Cura
          </button>
        </div>
        <div className="grid-3">
          <NumberInput label="PF massimi" value={data.hp.max} min={0} max={999} onChange={(v) => set('hp', { ...data.hp, max: v })} />
          <NumberInput label="PF correnti" value={data.hp.current} min={0} max={999} onChange={(v) => set('hp', { ...data.hp, current: v })} />
          <NumberInput label="PF temp." value={data.hp.temp} min={0} max={999} onChange={(v) => onChange(setTempHp(data, v))} />
        </div>
      </Section>

      <Section title="Difesa e movimento">
        <div className="stats-row">
          <Stat label="Classe Armatura" value={armorClass(data)} />
          <Stat label="Iniziativa" value={signed(initiative(data))} />
          <Stat label="Velocità" value={`${formatNumber(data.speedMeters)} m`} />
        </div>
        <Select label="Protezione" value={data.armor.type} options={ARMOR_OPTIONS} onChange={(v) => set('armor', { ...data.armor, type: v })} />
        <div className="grid-3">
          {ARMOR_WITH_BASE.has(data.armor.type) && (
            <NumberInput label="CA base armatura" value={data.armor.base} min={0} max={30} onChange={(v) => set('armor', { ...data.armor, base: v })} />
          )}
          <Checkbox label="Scudo (+2)" checked={data.armor.shield} onChange={(v) => set('armor', { ...data.armor, shield: v })} />
          <NumberInput label="Bonus CA" value={data.armor.bonus} min={-10} max={20} onChange={(v) => set('armor', { ...data.armor, bonus: v })} />
          <NumberInput label="Bonus iniziativa" value={data.initiativeBonus} min={-10} max={20} onChange={(v) => set('initiativeBonus', v)} />
          <NumberInput label="Velocità (m)" value={data.speedMeters} min={0} max={999} integer={false} onChange={(v) => set('speedMeters', v)} />
        </div>
      </Section>

      <Section title="Condizioni">
        <div className="row">
          <Pips
            label="Successi TS morte"
            count={data.deathSaves.successes}
            max={3}
            onChange={(v) => set('deathSaves', { ...data.deathSaves, successes: v })}
          />
          <Pips
            label="Fallimenti TS morte"
            count={data.deathSaves.failures}
            max={3}
            onChange={(v) => set('deathSaves', { ...data.deathSaves, failures: v })}
          />
          <NumberInput label="Sfinimento" className="narrow" value={data.exhaustion} min={0} max={6} onChange={(v) => set('exhaustion', v)} />
        </div>
      </Section>

      <Section title="Dadi vita e riposi">
        {HIT_DIE_KEYS.filter((k) => totals[k] > 0).map((k) => (
          <div className="row" key={k}>
            <Stat label={`Disponibili ${k}`} ariaLabel={`Dadi vita ${k} disponibili`} value={`${totals[k] - data.hitDiceUsed[k]} / ${totals[k]}`} />
            <NumberInput
              label={`Usati ${k}`}
              className="narrow"
              value={data.hitDiceUsed[k]}
              min={0}
              max={totals[k]}
              onChange={(v) => set('hitDiceUsed', { ...data.hitDiceUsed, [k]: v })}
            />
          </div>
        ))}
        <div className="row">
          <button type="button" className="btn" onClick={() => setResting(true)}>
            Riposo breve
          </button>
          <button type="button" className="btn" onClick={handleLongRest}>
            Riposo lungo
          </button>
        </div>
        {resting && (
          <ShortRestForm
            data={data}
            onCancel={() => setResting(false)}
            onConfirm={(opts) => {
              onChange(shortRest(data, opts));
              setResting(false);
            }}
          />
        )}
      </Section>

      <AttacksSection data={data} onChange={onChange} />
    </>
  );
}
```

- [ ] **Step 6: Registra il tab in Sheet.tsx**

In `src/systems/dnd5e-2014/sheet/Sheet.tsx` aggiungi l'import e la voce:
```tsx
import { CombatTab } from './CombatTab';
```
```tsx
const TABS: { id: string; label: string; Component: ComponentType<TabProps> }[] = [
  { id: 'main', label: 'Principale', Component: MainTab },
  { id: 'combat', label: 'Combattimento', Component: CombatTab },
];
```

- [ ] **Step 7: Esegui test e typecheck**

Run: `npm test -- src/systems/dnd5e-2014/sheet`
Expected: PASS (anche i test del Task 7).

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 8: Commit**

```bash
git add src/systems/dnd5e-2014/sheet
git commit -m "feat(dnd5e): add combat tab with HP tracker, rests and attacks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Scheda — tab Incantesimi

**Files:**
- Create: `src/systems/dnd5e-2014/sheet/SpellsTab.tsx`
- Modify: `src/systems/dnd5e-2014/sheet/Sheet.tsx`
- Test: `src/systems/dnd5e-2014/sheet/SpellsTab.test.tsx`

**Interfaces:**
- Consumes: `spellSaveDC`, `spellAttackBonus` (Task 4); `newSpell`, `Spell`, `Spellcasting`, `Ability` (Task 3); `ABILITY_OPTIONS`; UI (Task 6); `updateById`, `removeById`, `TabProps` (Task 7)
- Produces: `SpellsTab(props: TabProps)`. Etichette: `Caratteristica da incantatore`, `CD incantesimi`, `Attacco con incantesimi`, `Slot N° livello`, `Slot usati N° livello` (gruppo), `Livello slot patto`, `Slot patto`, `Slot patto usati`, `+ Incantesimo`, `Livello incantesimo`, `Nome incantesimo`, `Preparato`, `Note incantesimo`, `Rimuovi incantesimo`

- [ ] **Step 1: Test (fallisce)**

`src/systems/dnd5e-2014/sheet/SpellsTab.test.tsx`:
```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createBlank } from '../model';
import { renderSheet } from './testUtils';

function panel() {
  return within(screen.getByRole('tabpanel', { name: 'Incantesimi' }));
}

describe('tab Incantesimi', () => {
  it('calcola CD e attacco dalla caratteristica scelta', async () => {
    const user = userEvent.setup();
    const c = createBlank();
    c.abilities.int = 16;
    renderSheet(c);
    expect(panel().getByLabelText('CD incantesimi')).toHaveTextContent('—');
    await user.selectOptions(panel().getByLabelText('Caratteristica da incantatore'), 'int');
    expect(panel().getByLabelText('CD incantesimi')).toHaveTextContent('13');
    expect(panel().getByLabelText('Attacco con incantesimi')).toHaveTextContent('+5');
  });

  it('gestisce gli slot', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    const max = panel().getByLabelText('Slot 1° livello');
    await user.clear(max);
    await user.type(max, '2');
    const boxes = within(panel().getByRole('group', { name: 'Slot usati 1° livello' })).getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    await user.click(boxes[0]);
    expect(data().spellcasting.slots[0]).toEqual({ max: 2, used: 1 });
  });

  it('ridurre il massimo riduce anche gli usati', async () => {
    const user = userEvent.setup();
    const c = createBlank();
    c.spellcasting.slots[0] = { max: 3, used: 3 };
    const { data } = renderSheet(c);
    const max = panel().getByLabelText('Slot 1° livello');
    await user.clear(max);
    await user.type(max, '1');
    expect(data().spellcasting.slots[0]).toEqual({ max: 1, used: 1 });
  });

  it('aggiunge e rimuove incantesimi', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.click(panel().getByRole('button', { name: '+ Incantesimo' }));
    await user.type(panel().getByLabelText('Nome incantesimo'), 'Dardo incantato');
    const level = panel().getByLabelText('Livello incantesimo');
    await user.clear(level);
    await user.type(level, '1');
    await user.click(panel().getByLabelText('Preparato'));
    expect(data().spellcasting.spells[0]).toMatchObject({ name: 'Dardo incantato', level: 1, prepared: true });
    await user.click(panel().getByRole('button', { name: 'Rimuovi incantesimo' }));
    expect(data().spellcasting.spells).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Esegui il test**

Run: `npm test -- src/systems/dnd5e-2014/sheet/SpellsTab`
Expected: FAIL, nessun tabpanel `Incantesimi`.

- [ ] **Step 3: Implementa SpellsTab**

`src/systems/dnd5e-2014/sheet/SpellsTab.tsx`:
```tsx
import { Checkbox, NumberInput, Section, Select, Stat, TextArea, TextInput } from '../../../ui/fields';
import { signed } from '../../../ui/format';
import { Pips } from '../../../ui/Pips';
import { ABILITY_OPTIONS } from '../labels';
import { newSpell, type Ability, type Spell, type Spellcasting } from '../model';
import { spellAttackBonus, spellSaveDC } from '../rules';
import { removeById, updateById } from './listOps';
import type { TabProps } from './types';

const CASTER_OPTIONS: { value: Ability | 'none'; label: string }[] = [{ value: 'none', label: 'Nessuna' }, ...ABILITY_OPTIONS];

export function SpellsTab({ data, onChange }: TabProps) {
  const sc = data.spellcasting;
  const setSc = (patch: Partial<Spellcasting>) => onChange({ ...data, spellcasting: { ...sc, ...patch } });
  const dc = spellSaveDC(data);
  const atk = spellAttackBonus(data);
  // Ordinamento solo per livello (stabile): ordinare per nome sposterebbe la riga mentre si scrive.
  const spells = [...sc.spells].sort((a, b) => a.level - b.level);

  return (
    <>
      <Section title="Incantatore">
        <Select
          label="Caratteristica da incantatore"
          value={sc.ability ?? 'none'}
          options={CASTER_OPTIONS}
          onChange={(v) => setSc({ ability: v === 'none' ? null : v })}
        />
        <div className="stats-row">
          <Stat label="CD incantesimi" value={dc ?? '—'} />
          <Stat label="Attacco con incantesimi" value={atk === null ? '—' : signed(atk)} />
        </div>
      </Section>

      <Section title="Slot incantesimo">
        <ul className="slots">
          {sc.slots.map((slot, i) => (
            <li className="slot-row" key={i}>
              <span className="slot-level">{i + 1}°</span>
              <NumberInput
                hideLabel
                label={`Slot ${i + 1}° livello`}
                className="narrow"
                value={slot.max}
                min={0}
                max={9}
                onChange={(v) => setSc({ slots: sc.slots.map((s, j) => (j === i ? { max: v, used: Math.min(s.used, v) } : s)) })}
              />
              <Pips
                hideLabel
                label={`Slot usati ${i + 1}° livello`}
                count={slot.used}
                max={slot.max}
                onChange={(v) => setSc({ slots: sc.slots.map((s, j) => (j === i ? { ...s, used: v } : s)) })}
              />
            </li>
          ))}
        </ul>
        <h3>Magia del patto</h3>
        <div className="row">
          <NumberInput
            label="Livello slot patto"
            className="narrow"
            value={sc.pact.slotLevel}
            min={1}
            max={5}
            onChange={(v) => setSc({ pact: { ...sc.pact, slotLevel: v } })}
          />
          <NumberInput
            label="Slot patto"
            className="narrow"
            value={sc.pact.max}
            min={0}
            max={4}
            onChange={(v) => setSc({ pact: { ...sc.pact, max: v, used: Math.min(sc.pact.used, v) } })}
          />
          <Pips label="Slot patto usati" count={sc.pact.used} max={sc.pact.max} onChange={(v) => setSc({ pact: { ...sc.pact, used: v } })} />
        </div>
      </Section>

      <Section
        title="Incantesimi"
        actions={
          <button type="button" className="btn small" onClick={() => setSc({ spells: [...sc.spells, newSpell()] })}>
            + Incantesimo
          </button>
        }
      >
        {spells.length === 0 && <p className="muted">Nessun incantesimo.</p>}
        <ul className="list">
          {spells.map((s) => {
            const patch = (p: Partial<Spell>) => setSc({ spells: updateById(sc.spells, s.id, p) });
            return (
              <li key={s.id} className="list-item">
                <div className="row">
                  <NumberInput label="Livello incantesimo" className="narrow" value={s.level} min={0} max={9} onChange={(v) => patch({ level: v })} />
                  <TextInput label="Nome incantesimo" value={s.name} onChange={(v) => patch({ name: v })} />
                  {s.level > 0 && <Checkbox label="Preparato" checked={s.prepared} onChange={(v) => patch({ prepared: v })} />}
                </div>
                <details>
                  <summary>Note</summary>
                  <TextArea label="Note incantesimo" rows={3} value={s.notes} onChange={(v) => patch({ notes: v })} />
                  <button type="button" className="btn small danger" onClick={() => setSc({ spells: removeById(sc.spells, s.id) })}>
                    Rimuovi incantesimo
                  </button>
                </details>
              </li>
            );
          })}
        </ul>
      </Section>
    </>
  );
}
```

- [ ] **Step 4: Registra il tab**

In `Sheet.tsx`: `import { SpellsTab } from './SpellsTab';` e aggiungi a `TABS` dopo `combat`:
```tsx
  { id: 'spells', label: 'Incantesimi', Component: SpellsTab },
```

- [ ] **Step 5: Esegui test e typecheck**

Run: `npm test -- src/systems/dnd5e-2014/sheet`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e-2014/sheet
git commit -m "feat(dnd5e): add spells tab with slots and pact magic

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Scheda — tab Inventario

**Files:**
- Create: `src/systems/dnd5e-2014/sheet/InventoryTab.tsx`
- Modify: `src/systems/dnd5e-2014/sheet/Sheet.tsx`
- Test: `src/systems/dnd5e-2014/sheet/InventoryTab.test.tsx`

**Interfaces:**
- Consumes: `totalWeightKg`, `carryingCapacityKg` (Task 4); `COINS`, `newItem`, `Item`, `Inventory` (Task 3); `COIN_LABEL`; `formatNumber` (Task 6); `updateById`, `removeById`, `TabProps`
- Produces: `InventoryTab(props: TabProps)`. Etichette: `mr`, `ma`, `me`, `mo`, `mp`, `Peso trasportato`, `Capacità di carico`, `+ Oggetto`, `Nome oggetto`, `Quantità`, `Peso (kg)`, `Equipaggiato`, `Note oggetto`, `Rimuovi oggetto`; avviso `role="alert"` se il peso supera la capacità

- [ ] **Step 1: Test (fallisce)**

`src/systems/dnd5e-2014/sheet/InventoryTab.test.tsx`:
```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createBlank } from '../model';
import { renderSheet } from './testUtils';

function panel() {
  return within(screen.getByRole('tabpanel', { name: 'Inventario' }));
}

async function replace(user: ReturnType<typeof userEvent.setup>, el: HTMLElement, text: string) {
  await user.clear(el);
  await user.type(el, text);
}

describe('tab Inventario', () => {
  it('calcola peso di oggetti e monete e capacità', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    expect(panel().getByLabelText('Capacità di carico')).toHaveTextContent('75 kg');

    await user.click(panel().getByRole('button', { name: '+ Oggetto' }));
    await user.type(panel().getByLabelText('Nome oggetto'), 'Corda');
    await replace(user, panel().getByLabelText('Quantità'), '2');
    await replace(user, panel().getByLabelText('Peso (kg)'), '1,5');
    expect(panel().getByLabelText('Peso trasportato')).toHaveTextContent('3 kg');

    await replace(user, panel().getByLabelText('mo'), '100');
    expect(panel().getByLabelText('Peso trasportato')).toHaveTextContent('4 kg');
    expect(data().inventory.coins.gp).toBe(100);
    expect(data().inventory.items[0]).toMatchObject({ name: 'Corda', quantity: 2, weightKg: 1.5 });
  });

  it('avvisa se si supera la capacità di carico', async () => {
    const c = createBlank();
    c.abilities.str = 1;
    c.inventory.coins.gp = 1000;
    renderSheet(c);
    expect(panel().getByRole('alert')).toHaveTextContent(/capacità di carico/);
  });

  it('rimuove un oggetto', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.click(panel().getByRole('button', { name: '+ Oggetto' }));
    await user.click(panel().getByRole('button', { name: 'Rimuovi oggetto' }));
    expect(data().inventory.items).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Esegui il test**

Run: `npm test -- src/systems/dnd5e-2014/sheet/InventoryTab`
Expected: FAIL, nessun tabpanel `Inventario`.

- [ ] **Step 3: Implementa InventoryTab**

`src/systems/dnd5e-2014/sheet/InventoryTab.tsx`:
```tsx
import { Checkbox, NumberInput, Section, Stat, TextArea, TextInput } from '../../../ui/fields';
import { formatNumber } from '../../../ui/format';
import { COIN_LABEL } from '../labels';
import { COINS, newItem, type Inventory, type Item } from '../model';
import { carryingCapacityKg, totalWeightKg } from '../rules';
import { removeById, updateById } from './listOps';
import type { TabProps } from './types';

export function InventoryTab({ data, onChange }: TabProps) {
  const inv = data.inventory;
  const setInv = (patch: Partial<Inventory>) => onChange({ ...data, inventory: { ...inv, ...patch } });
  const weight = totalWeightKg(data);
  const capacity = carryingCapacityKg(data);

  return (
    <>
      <Section title="Monete">
        <div className="coins">
          {COINS.map((k) => (
            <NumberInput
              key={k}
              label={COIN_LABEL[k]}
              value={inv.coins[k]}
              min={0}
              max={9_999_999}
              onChange={(v) => setInv({ coins: { ...inv.coins, [k]: v } })}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Oggetti"
        actions={
          <button type="button" className="btn small" onClick={() => setInv({ items: [...inv.items, newItem()] })}>
            + Oggetto
          </button>
        }
      >
        <div className="stats-row">
          <Stat label="Peso trasportato" value={`${formatNumber(weight)} kg`} />
          <Stat label="Capacità di carico" value={`${formatNumber(capacity)} kg`} />
        </div>
        {weight > capacity && (
          <p className="warning" role="alert">
            Stai trasportando più della tua capacità di carico.
          </p>
        )}
        {inv.items.length === 0 && <p className="muted">Nessun oggetto.</p>}
        <ul className="list">
          {inv.items.map((it) => {
            const patch = (p: Partial<Item>) => setInv({ items: updateById(inv.items, it.id, p) });
            return (
              <li key={it.id} className="list-item">
                <div className="row">
                  <TextInput label="Nome oggetto" value={it.name} onChange={(v) => patch({ name: v })} />
                  <NumberInput label="Quantità" className="narrow" value={it.quantity} min={0} max={99_999} onChange={(v) => patch({ quantity: v })} />
                  <NumberInput
                    label="Peso (kg)"
                    className="narrow"
                    value={it.weightKg}
                    min={0}
                    max={99_999}
                    integer={false}
                    onChange={(v) => patch({ weightKg: v })}
                  />
                  <Checkbox label="Equip." ariaLabel="Equipaggiato" checked={it.equipped} onChange={(v) => patch({ equipped: v })} />
                </div>
                <details>
                  <summary>Note</summary>
                  <TextArea label="Note oggetto" rows={2} value={it.notes} onChange={(v) => patch({ notes: v })} />
                  <button type="button" className="btn small danger" onClick={() => setInv({ items: removeById(inv.items, it.id) })}>
                    Rimuovi oggetto
                  </button>
                </details>
              </li>
            );
          })}
        </ul>
      </Section>
    </>
  );
}
```

- [ ] **Step 4: Registra il tab**

In `Sheet.tsx`: `import { InventoryTab } from './InventoryTab';` e aggiungi a `TABS` dopo `spells`:
```tsx
  { id: 'inventory', label: 'Inventario', Component: InventoryTab },
```

- [ ] **Step 5: Esegui test e typecheck**

Run: `npm test -- src/systems/dnd5e-2014/sheet`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e-2014/sheet
git commit -m "feat(dnd5e): add inventory tab with coins and weight

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Scheda — tab Privilegi e Note

**Files:**
- Create: `src/systems/dnd5e-2014/sheet/FeaturesTab.tsx`, `src/systems/dnd5e-2014/sheet/NotesTab.tsx`
- Modify: `src/systems/dnd5e-2014/sheet/Sheet.tsx`
- Test: `src/systems/dnd5e-2014/sheet/FeaturesTab.test.tsx`, `src/systems/dnd5e-2014/sheet/NotesTab.test.tsx`, `src/systems/dnd5e-2014/sheet/Sheet.test.tsx`

**Interfaces:**
- Consumes: `newFeature`, `Feature` (Task 3); `RECHARGE_LABEL`, `RECHARGE_OPTIONS`; UI (Task 6); `updateById`, `removeById`, `TabProps`
- Produces: `FeaturesTab(props: TabProps)`, `NotesTab(props: TabProps)`; `TABS` completo con 6 voci. Etichette: `+ Privilegio`, `Nome privilegio`, `Fonte`, `Descrizione`, `Utilizzi limitati`, `Utilizzi massimi`, `Ripristino`, `Utilizzi <nome>` (gruppo), `Rimuovi privilegio`; note: `Tratti della personalità`, `Ideali`, `Legami`, `Difetti`, `Note`

- [ ] **Step 1: Test (falliscono)**

`src/systems/dnd5e-2014/sheet/FeaturesTab.test.tsx`:
```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderSheet } from './testUtils';

function panel() {
  return within(screen.getByRole('tabpanel', { name: 'Privilegi' }));
}

describe('tab Privilegi', () => {
  it('aggiunge un privilegio con utilizzi limitati', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.click(panel().getByRole('button', { name: '+ Privilegio' }));
    await user.type(panel().getByLabelText('Nome privilegio'), 'Secondo fiato');
    await user.click(panel().getByLabelText('Utilizzi limitati'));
    await user.selectOptions(panel().getByLabelText('Ripristino'), 'short');
    const boxes = within(panel().getByRole('group', { name: 'Utilizzi Secondo fiato' })).getAllByRole('checkbox');
    expect(boxes).toHaveLength(1);
    await user.click(boxes[0]);
    expect(data().features[0]).toMatchObject({ name: 'Secondo fiato', uses: { max: 1, used: 1, recharge: 'short' } });
  });

  it('togliere utilizzi limitati imposta uses a null', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.click(panel().getByRole('button', { name: '+ Privilegio' }));
    await user.click(panel().getByLabelText('Utilizzi limitati'));
    await user.click(panel().getByLabelText('Utilizzi limitati'));
    expect(data().features[0].uses).toBeNull();
  });

  it('rimuove un privilegio', async () => {
    const user = userEvent.setup();
    const { data } = renderSheet();
    await user.click(panel().getByRole('button', { name: '+ Privilegio' }));
    await user.click(panel().getByRole('button', { name: 'Rimuovi privilegio' }));
    expect(data().features).toHaveLength(0);
  });
});
```

`src/systems/dnd5e-2014/sheet/NotesTab.test.tsx`:
```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { renderSheet } from './testUtils';

it('salva le note', async () => {
  const user = userEvent.setup();
  const { data } = renderSheet();
  const panel = within(screen.getByRole('tabpanel', { name: 'Note' }));
  await user.type(panel.getByLabelText('Ideali'), 'Libertà');
  await user.type(panel.getByLabelText('Note'), 'Deve 10 mo a Bob');
  expect(data().notes.ideals).toBe('Libertà');
  expect(data().notes.free).toBe('Deve 10 mo a Bob');
});
```

`src/systems/dnd5e-2014/sheet/Sheet.test.tsx`:
```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { renderSheet } from './testUtils';

it('mostra 6 tab e cambia quello attivo', async () => {
  const user = userEvent.setup();
  renderSheet();
  const tabs = screen.getAllByRole('tab');
  expect(tabs.map((t) => t.textContent)).toEqual(['Principale', 'Combattimento', 'Incantesimi', 'Inventario', 'Privilegi', 'Note']);
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  await user.click(screen.getByRole('tab', { name: 'Note' }));
  expect(screen.getByRole('tab', { name: 'Note' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel', { name: 'Note' })).toHaveAttribute('data-active', 'true');
  expect(screen.getByRole('tabpanel', { name: 'Principale' })).toHaveAttribute('data-active', 'false');
});
```

- [ ] **Step 2: Esegui i test**

Run: `npm test -- src/systems/dnd5e-2014/sheet`
Expected: FAIL, tabpanel `Privilegi` e `Note` mancanti.

- [ ] **Step 3: Implementa FeaturesTab e NotesTab**

`src/systems/dnd5e-2014/sheet/FeaturesTab.tsx`:
```tsx
import { Checkbox, NumberInput, Section, Select, TextArea, TextInput } from '../../../ui/fields';
import { Pips } from '../../../ui/Pips';
import { RECHARGE_LABEL, RECHARGE_OPTIONS } from '../labels';
import { newFeature, type Feature } from '../model';
import { removeById, updateById } from './listOps';
import type { TabProps } from './types';

export function FeaturesTab({ data, onChange }: TabProps) {
  const setFeatures = (features: Feature[]) => onChange({ ...data, features });

  return (
    <Section
      title="Privilegi e tratti"
      actions={
        <button type="button" className="btn small" onClick={() => setFeatures([...data.features, newFeature()])}>
          + Privilegio
        </button>
      }
    >
      {data.features.length === 0 && <p className="muted">Nessun privilegio.</p>}
      <ul className="list">
        {data.features.map((f) => {
          const patch = (p: Partial<Feature>) => setFeatures(updateById(data.features, f.id, p));
          const uses = f.uses;
          return (
            <li key={f.id} className="list-item">
              <div className="row">
                <TextInput label="Nome privilegio" value={f.name} onChange={(v) => patch({ name: v })} />
                <TextInput label="Fonte" placeholder="Classe, razza, talento…" value={f.source} onChange={(v) => patch({ source: v })} />
              </div>
              {uses && (
                <div className="row">
                  <Pips label={`Utilizzi ${f.name}`} count={uses.used} max={uses.max} onChange={(v) => patch({ uses: { ...uses, used: v } })} />
                  <span className="muted">{RECHARGE_LABEL[uses.recharge]}</span>
                </div>
              )}
              <details>
                <summary>Dettagli</summary>
                <TextArea label="Descrizione" value={f.description} onChange={(v) => patch({ description: v })} />
                <Checkbox
                  label="Utilizzi limitati"
                  checked={uses !== null}
                  onChange={(v) => patch({ uses: v ? { max: 1, used: 0, recharge: 'long' } : null })}
                />
                {uses && (
                  <div className="grid-2">
                    <NumberInput
                      label="Utilizzi massimi"
                      value={uses.max}
                      min={0}
                      max={99}
                      onChange={(v) => patch({ uses: { ...uses, max: v, used: Math.min(uses.used, v) } })}
                    />
                    <Select label="Ripristino" value={uses.recharge} options={RECHARGE_OPTIONS} onChange={(v) => patch({ uses: { ...uses, recharge: v } })} />
                  </div>
                )}
                <button type="button" className="btn small danger" onClick={() => setFeatures(removeById(data.features, f.id))}>
                  Rimuovi privilegio
                </button>
              </details>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
```

`src/systems/dnd5e-2014/sheet/NotesTab.tsx`:
```tsx
import { Section, TextArea } from '../../../ui/fields';
import type { Dnd5eCharacter } from '../model';
import type { TabProps } from './types';

export function NotesTab({ data, onChange }: TabProps) {
  const setNote = (key: keyof Dnd5eCharacter['notes'], value: string) => onChange({ ...data, notes: { ...data.notes, [key]: value } });

  return (
    <>
      <Section title="Personalità">
        <TextArea label="Tratti della personalità" rows={3} value={data.notes.traits} onChange={(v) => setNote('traits', v)} />
        <TextArea label="Ideali" rows={2} value={data.notes.ideals} onChange={(v) => setNote('ideals', v)} />
        <TextArea label="Legami" rows={2} value={data.notes.bonds} onChange={(v) => setNote('bonds', v)} />
        <TextArea label="Difetti" rows={2} value={data.notes.flaws} onChange={(v) => setNote('flaws', v)} />
      </Section>
      <Section title="Note">
        <TextArea label="Note" rows={10} value={data.notes.free} onChange={(v) => setNote('free', v)} />
      </Section>
    </>
  );
}
```

- [ ] **Step 4: Completa TABS**

In `Sheet.tsx` aggiungi gli import e le ultime due voci; `TABS` finale:
```tsx
import { FeaturesTab } from './FeaturesTab';
import { NotesTab } from './NotesTab';
```
```tsx
const TABS: { id: string; label: string; Component: ComponentType<TabProps> }[] = [
  { id: 'main', label: 'Principale', Component: MainTab },
  { id: 'combat', label: 'Combattimento', Component: CombatTab },
  { id: 'spells', label: 'Incantesimi', Component: SpellsTab },
  { id: 'inventory', label: 'Inventario', Component: InventoryTab },
  { id: 'features', label: 'Privilegi', Component: FeaturesTab },
  { id: 'notes', label: 'Note', Component: NotesTab },
];
```

- [ ] **Step 5: Esegui test e typecheck**

Run: `npm test -- src/systems/dnd5e-2014/sheet`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e-2014/sheet
git commit -m "feat(dnd5e): add features and notes tabs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 12: Modulo D&D — migrazione, validazione, registrazione

**Files:**
- Create: `src/systems/dnd5e-2014/migrate.ts`, `src/systems/dnd5e-2014/index.ts`, `src/systems/index.ts`
- Modify: `src/main.tsx`
- Test: `src/systems/dnd5e-2014/index.test.ts`

**Interfaces:**
- Consumes: `GameSystem` (Task 2), `registry` (Task 2), `createBlank`, `dnd5eSchema`, `Dnd5eCharacter` (Task 3), `summary` (Task 4), `Sheet` (Task 7–11)
- Produces:
  - `SCHEMA_VERSION = 1`, `migrate(data: unknown, fromVersion: number): unknown`
  - `dnd5e: GameSystem<Dnd5eCharacter>` con id `'dnd5e-2014'`, nome `'D&D 5e (2014)'`
  - `src/systems/index.ts`: side effect che registra `dnd5e` in `registry`; importato da `main.tsx` e dai test dell'app

- [ ] **Step 1: Test (fallisce)**

`src/systems/dnd5e-2014/index.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { registry } from '../../core/registry';
import '../index';
import { dnd5e } from '.';
import { newClass } from './model';

describe('modulo dnd5e', () => {
  it('ha id, nome e versione', () => {
    expect(dnd5e.id).toBe('dnd5e-2014');
    expect(dnd5e.name).toBe('D&D 5e (2014)');
    expect(dnd5e.schemaVersion).toBe(1);
  });

  it('è registrato nel registro globale', () => {
    expect(registry.get('dnd5e-2014')).toBe(dnd5e);
  });

  it('valida un personaggio vuoto anche dopo JSON', () => {
    const blank = dnd5e.createBlank();
    expect(dnd5e.validate(JSON.parse(JSON.stringify(blank)))).toEqual(blank);
  });

  it('validate lancia errore su dati non validi', () => {
    expect(() => dnd5e.validate({})).toThrow();
  });

  it('migrate lascia invariati i dati v1', () => {
    const blank = dnd5e.createBlank();
    expect(dnd5e.migrate(blank, 1)).toBe(blank);
  });

  it('migrate rifiuta versioni più recenti o non valide', () => {
    expect(() => dnd5e.migrate({}, 2)).toThrow(/più recente/);
    expect(() => dnd5e.migrate({}, 0)).toThrow(/non valida/);
  });

  it('getName, withName e summary', () => {
    const c = dnd5e.withName(dnd5e.createBlank(), 'Lia');
    expect(dnd5e.getName(c)).toBe('Lia');
    c.race = 'Elfo';
    c.classes = [{ ...newClass(), name: 'Mago', level: 5 }];
    expect(dnd5e.summary(c)).toBe('Elfo · Mago 5 — liv. 5');
  });
});
```

- [ ] **Step 2: Esegui il test**

Run: `npm test -- src/systems/dnd5e-2014/index`
Expected: FAIL, moduli non trovati.

- [ ] **Step 3: Implementa**

`src/systems/dnd5e-2014/migrate.ts`:
```ts
export const SCHEMA_VERSION = 1;

/**
 * Porta i dati salvati alla versione corrente.
 * Quando lo schema cambia: incrementa SCHEMA_VERSION e aggiungi un passo
 * `if (fromVersion < N) current = vPrecedenteToVN(current);` in ordine crescente.
 */
export function migrate(data: unknown, fromVersion: number): unknown {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) {
    throw new Error(`Versione dei dati non valida: ${fromVersion}`);
  }
  if (fromVersion > SCHEMA_VERSION) {
    throw new Error(`Dati creati con una versione più recente dell'app (v${fromVersion}). Aggiorna l'app.`);
  }
  return data;
}
```

`src/systems/dnd5e-2014/index.ts`:
```ts
import { z } from 'zod';
import type { GameSystem } from '../../core/types';
import { migrate, SCHEMA_VERSION } from './migrate';
import { createBlank, dnd5eSchema, type Dnd5eCharacter } from './model';
import { summary } from './rules';
import { Sheet } from './sheet/Sheet';

export const dnd5e: GameSystem<Dnd5eCharacter> = {
  id: 'dnd5e-2014',
  name: 'D&D 5e (2014)',
  schemaVersion: SCHEMA_VERSION,
  createBlank,
  migrate,
  validate(data) {
    const result = dnd5eSchema.safeParse(data);
    if (!result.success) throw new Error(z.prettifyError(result.error));
    return result.data;
  },
  getName: (d) => d.name,
  withName: (d, name) => ({ ...d, name }),
  summary,
  Sheet,
};
```

`src/systems/index.ts`:
```ts
import { registry } from '../core/registry';
import { dnd5e } from './dnd5e-2014';

registry.register(dnd5e);
```

In `src/main.tsx` aggiungi, subito dopo gli import di React:
```tsx
import './systems';
```

- [ ] **Step 4: Esegui test e typecheck**

Run: `npm test -- src/systems`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add src/systems src/main.tsx
git commit -m "feat(dnd5e): expose D&D 5e 2014 game system module

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Database e repository

**Files:**
- Create: `src/core/db.ts`, `src/core/repository.ts`
- Test: `src/core/repository.test.ts`

**Interfaces:**
- Consumes: `CharacterRecord`, `GameSystem` (Task 2), `newId` (Task 2), `loadCharacter` (Task 2), `testSystem` (Task 2, solo test)
- Produces:
  - `class VaultDB extends Dexie { characters: EntityTable<CharacterRecord, 'id'> }`, `db: VaultDB` (database `characters-vault`, indici `id, updatedAt`)
  - `listCharacters(): Promise<CharacterRecord[]>` (ordine `updatedAt` decrescente)
  - `getCharacter(id: string): Promise<CharacterRecord | undefined>`
  - `createCharacter<T>(system: GameSystem<T>, name: string, now?: Date): Promise<CharacterRecord>`
  - `saveCharacterData<T>(id: string, system: GameSystem<T>, data: T, now?: Date): Promise<void>` (lancia errore se l'id non esiste)
  - `deleteCharacter(id: string): Promise<void>`
  - `duplicateCharacter(id: string, now?: Date): Promise<CharacterRecord>` (nome `"<nome> (copia)"`)
  - `putCharacters(records: CharacterRecord[]): Promise<void>`
  - `existingIds(): Promise<Set<string>>`

- [ ] **Step 1: Test (fallisce)**

`src/core/repository.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { registry } from './registry';
import {
  createCharacter,
  deleteCharacter,
  duplicateCharacter,
  existingIds,
  getCharacter,
  listCharacters,
  putCharacters,
  saveCharacterData,
} from './repository';
import { testSystem } from './testSystem';
import type { CharacterRecord } from './types';

registry.register(testSystem);

const t = (s: string) => new Date(`2026-01-0${s}T00:00:00.000Z`);

beforeEach(async () => {
  await db.characters.clear();
});

describe('repository', () => {
  it('crea un personaggio', async () => {
    const r = await createCharacter(testSystem, '  Ada  ', t('2'));
    expect(r).toMatchObject({
      systemId: 'test',
      schemaVersion: 2,
      name: 'Ada',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      data: { name: 'Ada', hp: 1 },
    });
    expect(await getCharacter(r.id)).toEqual(r);
  });

  it('elenca per ultima modifica, più recente prima', async () => {
    const a = await createCharacter(testSystem, 'A', t('1'));
    const b = await createCharacter(testSystem, 'B', t('2'));
    expect((await listCharacters()).map((r) => r.id)).toEqual([b.id, a.id]);
  });

  it('salva i dati aggiornando nome e data', async () => {
    const r = await createCharacter(testSystem, 'Ada', t('1'));
    await saveCharacterData(r.id, testSystem, { name: 'Bea', hp: 5 }, t('3'));
    expect(await getCharacter(r.id)).toMatchObject({
      name: 'Bea',
      updatedAt: '2026-01-03T00:00:00.000Z',
      data: { name: 'Bea', hp: 5 },
    });
  });

  it('salvare un id inesistente lancia errore', async () => {
    await expect(saveCharacterData('nope', testSystem, { name: 'X', hp: 1 })).rejects.toThrow();
  });

  it('duplica un personaggio', async () => {
    const r = await createCharacter(testSystem, 'Ada', t('1'));
    const copy = await duplicateCharacter(r.id, t('4'));
    expect(copy.id).not.toBe(r.id);
    expect(copy).toMatchObject({ name: 'Ada (copia)', data: { name: 'Ada (copia)', hp: 1 }, createdAt: '2026-01-04T00:00:00.000Z' });
    expect(await listCharacters()).toHaveLength(2);
  });

  it('duplica anche record non caricabili copiando i dati grezzi', async () => {
    const alien: CharacterRecord = {
      id: 'x',
      systemId: 'boh',
      schemaVersion: 1,
      name: 'Alieno',
      createdAt: t('1').toISOString(),
      updatedAt: t('1').toISOString(),
      data: { qualcosa: 1 },
    };
    await putCharacters([alien]);
    const copy = await duplicateCharacter('x');
    expect(copy).toMatchObject({ name: 'Alieno (copia)', systemId: 'boh', data: { qualcosa: 1 } });
  });

  it('elimina e restituisce gli id esistenti', async () => {
    const a = await createCharacter(testSystem, 'A');
    const b = await createCharacter(testSystem, 'B');
    await deleteCharacter(a.id);
    expect(await existingIds()).toEqual(new Set([b.id]));
  });
});
```

- [ ] **Step 2: Esegui il test**

Run: `npm test -- src/core/repository`
Expected: FAIL, moduli `./db` e `./repository` non trovati.

- [ ] **Step 3: Implementa**

`src/core/db.ts`:
```ts
import Dexie, { type EntityTable } from 'dexie';
import type { CharacterRecord } from './types';

export class VaultDB extends Dexie {
  characters!: EntityTable<CharacterRecord, 'id'>;

  constructor(name = 'characters-vault') {
    super(name);
    this.version(1).stores({ characters: 'id, updatedAt' });
  }
}

export const db = new VaultDB();
```

`src/core/repository.ts`:
```ts
import { db } from './db';
import { newId } from './id';
import { loadCharacter } from './load';
import type { CharacterRecord, GameSystem } from './types';

export function listCharacters(): Promise<CharacterRecord[]> {
  return db.characters.orderBy('updatedAt').reverse().toArray();
}

export function getCharacter(id: string): Promise<CharacterRecord | undefined> {
  return db.characters.get(id);
}

export async function createCharacter<T>(system: GameSystem<T>, name: string, now = new Date()): Promise<CharacterRecord> {
  const data = system.withName(system.createBlank(), name.trim());
  const ts = now.toISOString();
  const record: CharacterRecord = {
    id: newId(),
    systemId: system.id,
    schemaVersion: system.schemaVersion,
    name: system.getName(data),
    createdAt: ts,
    updatedAt: ts,
    data,
  };
  await db.characters.add(record);
  return record;
}

export async function saveCharacterData<T>(id: string, system: GameSystem<T>, data: T, now = new Date()): Promise<void> {
  const updated = await db.characters.update(id, {
    data,
    name: system.getName(data),
    schemaVersion: system.schemaVersion,
    updatedAt: now.toISOString(),
  });
  if (updated === 0) throw new Error(`Personaggio non trovato: ${id}`);
}

export async function deleteCharacter(id: string): Promise<void> {
  await db.characters.delete(id);
}

export async function duplicateCharacter(id: string, now = new Date()): Promise<CharacterRecord> {
  const source = await db.characters.get(id);
  if (!source) throw new Error(`Personaggio non trovato: ${id}`);
  const name = `${source.name} (copia)`;
  const loaded = loadCharacter(source);
  const ts = now.toISOString();
  const copy: CharacterRecord =
    loaded.status === 'ok'
      ? { ...source, data: loaded.system.withName(loaded.data, name), schemaVersion: loaded.system.schemaVersion }
      : { ...source, data: JSON.parse(JSON.stringify(source.data)) };
  Object.assign(copy, { id: newId(), name, createdAt: ts, updatedAt: ts });
  await db.characters.add(copy);
  return copy;
}

export async function putCharacters(records: CharacterRecord[]): Promise<void> {
  await db.characters.bulkPut(records);
}

export async function existingIds(): Promise<Set<string>> {
  return new Set(await db.characters.toCollection().primaryKeys());
}
```

- [ ] **Step 4: Esegui il test**

Run: `npm test -- src/core`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core
git commit -m "feat(core): add IndexedDB storage and character repository

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Esporta/importa

**Files:**
- Create: `src/core/importExport.ts`
- Test: `src/core/importExport.test.ts`

**Interfaces:**
- Consumes: `registry`, `Registry` (Task 2), `newId` (Task 2), `CharacterRecord` (Task 2), `testSystem` (solo test)
- Produces:
  - `EXPORT_FORMAT = 'characters-vault'`, `EXPORT_VERSION = 1`
  - `interface ExportFile { format: 'characters-vault'; version: number; exportedAt: string; characters: CharacterRecord[] }`
  - `class ImportError extends Error` (errore a livello di file; il messaggio è mostrabile all'utente)
  - `buildExportFile(records: CharacterRecord[], now?: Date): ExportFile`
  - `serializeExport(file: ExportFile): string`
  - `exportFileName(records: CharacterRecord[], now?: Date): string`
  - `interface ImportIssue { name: string; error: string }`, `interface ParsedImport { records: CharacterRecord[]; issues: ImportIssue[] }`
  - `parseImportFile(text: string, reg?: Registry): ParsedImport` (record restituiti già migrati e validati, con `schemaVersion` corrente)
  - `splitConflicts(records: CharacterRecord[], existing: ReadonlySet<string>): { fresh: CharacterRecord[]; conflicting: CharacterRecord[] }`
  - `asCopy(record: CharacterRecord, now?: Date): CharacterRecord`

- [ ] **Step 1: Test (fallisce)**

`src/core/importExport.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  asCopy,
  buildExportFile,
  exportFileName,
  ImportError,
  parseImportFile,
  serializeExport,
  splitConflicts,
} from './importExport';
import { createRegistry } from './registry';
import { testSystem } from './testSystem';
import type { CharacterRecord } from './types';

const reg = createRegistry();
reg.register(testSystem);
const now = new Date('2026-09-27T10:00:00.000Z');

function rec(patch: Partial<CharacterRecord> = {}): CharacterRecord {
  return {
    id: 'r1',
    systemId: 'test',
    schemaVersion: 2,
    name: 'Ada',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    data: { name: 'Ada', hp: 3 },
    ...patch,
  };
}

function fileWith(characters: unknown[]): string {
  return JSON.stringify({ format: 'characters-vault', version: 1, exportedAt: now.toISOString(), characters });
}

describe('export', () => {
  it('costruisce il file', () => {
    expect(buildExportFile([rec()], now)).toEqual({
      format: 'characters-vault',
      version: 1,
      exportedAt: '2026-09-27T10:00:00.000Z',
      characters: [rec()],
    });
  });

  it('nome file per un personaggio', () => {
    expect(exportFileName([rec({ name: 'Ada: la "grande"' })], now)).toBe('Ada-la-grande.json');
    expect(exportFileName([rec({ name: '  ' })], now)).toBe('personaggio.json');
  });

  it('nome file per il backup', () => {
    expect(exportFileName([rec(), rec({ id: 'r2' })], now)).toBe('characters-vault-backup-2026-09-27.json');
  });
});

describe('import', () => {
  it('andata e ritorno', () => {
    const text = serializeExport(buildExportFile([rec()], now));
    expect(parseImportFile(text, reg)).toEqual({ records: [rec()], issues: [] });
  });

  it('JSON non valido', () => {
    expect(() => parseImportFile('{non json', reg)).toThrow(ImportError);
  });

  it('formato sconosciuto', () => {
    expect(() => parseImportFile('{"foo":1}', reg)).toThrow(/non è un export/);
  });

  it('versione del file più recente', () => {
    const text = JSON.stringify({ format: 'characters-vault', version: 2, exportedAt: '', characters: [] });
    expect(() => parseImportFile(text, reg)).toThrow(/non supportata/);
  });

  it('migra i record vecchi', () => {
    const { records } = parseImportFile(fileWith([rec({ schemaVersion: 1, data: { name: 'Ada' } })]), reg);
    expect(records[0]).toMatchObject({ schemaVersion: 2, data: { name: 'Ada', hp: 1 } });
  });

  it('scarta i record non validi mantenendo quelli validi', () => {
    const { records, issues } = parseImportFile(
      fileWith([
        rec(),
        rec({ id: 'r2', name: 'Rotto', data: { name: 5 } }),
        rec({ id: 'r3', name: 'Alieno', systemId: 'boh' }),
        { foo: 1 },
      ]),
      reg,
    );
    expect(records.map((r) => r.id)).toEqual(['r1']);
    expect(issues.map((i) => i.name)).toEqual(['Rotto', 'Alieno', 'Personaggio #4']);
    expect(issues[1].error).toContain('boh');
  });
});

describe('conflitti', () => {
  it('separa nuovi ed esistenti', () => {
    const a = rec({ id: 'a' });
    const b = rec({ id: 'b' });
    expect(splitConflicts([a, b], new Set(['b']))).toEqual({ fresh: [a], conflicting: [b] });
  });

  it('asCopy crea un nuovo id e nuove date', () => {
    const copy = asCopy(rec(), now);
    expect(copy.id).not.toBe('r1');
    expect(copy).toMatchObject({ name: 'Ada', createdAt: now.toISOString(), updatedAt: now.toISOString() });
  });
});
```

- [ ] **Step 2: Esegui il test**

Run: `npm test -- src/core/importExport`
Expected: FAIL, modulo non trovato.

- [ ] **Step 3: Implementa**

`src/core/importExport.ts`:
```ts
import { z } from 'zod';
import { newId } from './id';
import { registry as defaultRegistry, type Registry } from './registry';
import type { CharacterRecord } from './types';

export const EXPORT_FORMAT = 'characters-vault';
export const EXPORT_VERSION = 1;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  characters: CharacterRecord[];
}

/** Errore che riguarda il file intero; il messaggio è pensato per l'utente. */
export class ImportError extends Error {}

export interface ImportIssue {
  name: string;
  error: string;
}

export interface ParsedImport {
  records: CharacterRecord[];
  issues: ImportIssue[];
}

const fileSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.number().int(),
  exportedAt: z.string(),
  characters: z.array(z.unknown()),
});

const recordSchema = z.object({
  id: z.string().min(1),
  systemId: z.string(),
  schemaVersion: z.number().int(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  data: z.unknown(),
});

export function buildExportFile(records: CharacterRecord[], now = new Date()): ExportFile {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: now.toISOString(), characters: records };
}

export function serializeExport(file: ExportFile): string {
  return JSON.stringify(file, null, 2);
}

export function exportFileName(records: CharacterRecord[], now = new Date()): string {
  if (records.length === 1) {
    const base = records[0].name
      .replace(/[\\/:*?"<>|]+/g, '')
      .trim()
      .replace(/\s+/g, '-');
    return `${base || 'personaggio'}.json`;
  }
  return `characters-vault-backup-${now.toISOString().slice(0, 10)}.json`;
}

export function parseImportFile(text: string, reg: Registry = defaultRegistry): ParsedImport {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ImportError('Il file non è un JSON valido.');
  }
  const file = fileSchema.safeParse(json);
  if (!file.success) throw new ImportError('Il file non è un export di Characters Vault.');
  if (file.data.version > EXPORT_VERSION) {
    throw new ImportError(`Versione del file (${file.data.version}) non supportata: aggiorna l'app.`);
  }

  const records: CharacterRecord[] = [];
  const issues: ImportIssue[] = [];
  file.data.characters.forEach((raw, i) => {
    const parsed = recordSchema.safeParse(raw);
    if (!parsed.success) {
      issues.push({ name: `Personaggio #${i + 1}`, error: 'Struttura del record non valida.' });
      return;
    }
    const r = parsed.data;
    const system = reg.get(r.systemId);
    if (!system) {
      issues.push({ name: r.name, error: `Sistema di gioco sconosciuto: ${r.systemId}` });
      return;
    }
    try {
      const data = system.validate(system.migrate(r.data, r.schemaVersion));
      records.push({ ...r, data, schemaVersion: system.schemaVersion, name: system.getName(data) });
    } catch (e) {
      issues.push({ name: r.name, error: e instanceof Error ? e.message : String(e) });
    }
  });
  return { records, issues };
}

export function splitConflicts(records: CharacterRecord[], existing: ReadonlySet<string>) {
  return {
    fresh: records.filter((r) => !existing.has(r.id)),
    conflicting: records.filter((r) => existing.has(r.id)),
  };
}

export function asCopy(record: CharacterRecord, now = new Date()): CharacterRecord {
  const ts = now.toISOString();
  return { ...record, id: newId(), createdAt: ts, updatedAt: ts };
}
```

- [ ] **Step 4: Esegui il test**

Run: `npm test -- src/core/importExport`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/importExport.ts src/core/importExport.test.ts
git commit -m "feat(core): add JSON export/import with validation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Storage persistente e condivisione file

**Files:**
- Create: `src/core/storage.ts`, `src/core/fileShare.ts`
- Test: `src/core/storage.test.ts`, `src/core/fileShare.test.ts`

**Interfaces:**
- Consumes: niente
- Produces:
  - `requestPersistence(): Promise<boolean>` (false se l'API manca o fallisce)
  - `getLastBackup(): Date | null`, `setLastBackup(date?: Date): void` (chiave `localStorage` `characters-vault:lastBackup`)
  - `daysSince(date: Date, now?: Date): number`
  - `shareOrDownload(fileName: string, text: string): Promise<void>`: su dispositivi touch (`pointer: coarse`) con Web Share file usa `navigator.share`; altrimenti download via link
  - `readFileText(file: Blob): Promise<string>`

- [ ] **Step 1: Test (falliscono)**

`src/core/storage.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { daysSince, getLastBackup, requestPersistence, setLastBackup } from './storage';

function stubStorage(value: unknown) {
  Object.defineProperty(navigator, 'storage', { value, configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'storage');
});

describe('requestPersistence', () => {
  it('false se l’API non esiste', async () => {
    stubStorage(undefined);
    expect(await requestPersistence()).toBe(false);
  });

  it('true se già persistente, senza richiederlo', async () => {
    const persist = vi.fn();
    stubStorage({ persisted: vi.fn().mockResolvedValue(true), persist });
    expect(await requestPersistence()).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it('richiede la persistenza e restituisce la risposta', async () => {
    stubStorage({ persisted: vi.fn().mockResolvedValue(false), persist: vi.fn().mockResolvedValue(false) });
    expect(await requestPersistence()).toBe(false);
  });
});

describe('ultimo backup', () => {
  beforeEach(() => localStorage.clear());

  it('null se mai fatto', () => {
    expect(getLastBackup()).toBeNull();
  });

  it('salva e rilegge la data', () => {
    setLastBackup(new Date('2026-09-20T12:00:00.000Z'));
    expect(getLastBackup()?.toISOString()).toBe('2026-09-20T12:00:00.000Z');
  });

  it('ignora valori corrotti', () => {
    localStorage.setItem('characters-vault:lastBackup', 'boh');
    expect(getLastBackup()).toBeNull();
  });

  it('giorni trascorsi', () => {
    expect(daysSince(new Date('2026-09-17T12:00:00Z'), new Date('2026-09-27T11:00:00Z'))).toBe(9);
    expect(daysSince(new Date('2026-09-28T00:00:00Z'), new Date('2026-09-27T00:00:00Z'))).toBe(0);
  });
});
```

`src/core/fileShare.test.ts`:
```ts
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileText, shareOrDownload } from './fileShare';

beforeAll(() => {
  // jsdom non implementa gli object URL.
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:test', configurable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true });
});

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia');
  Reflect.deleteProperty(navigator, 'canShare');
  Reflect.deleteProperty(navigator, 'share');
});

describe('shareOrDownload', () => {
  it('su desktop scarica il file', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await shareOrDownload('ada.json', '{}');
    expect(click).toHaveBeenCalledTimes(1);
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('ada.json');
    expect(anchor.href).toBe('blob:test');
  });

  it('su mobile usa il menu di condivisione', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: true }), configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    await shareOrDownload('ada.json', '{}');
    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0].files[0].name).toBe('ada.json');
    expect(click).not.toHaveBeenCalled();
  });

  it('se l’utente annulla la condivisione non scarica', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: true }), configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(new DOMException('annullato', 'AbortError')),
      configurable: true,
    });
    await shareOrDownload('ada.json', '{}');
    expect(click).not.toHaveBeenCalled();
  });
});

it('readFileText legge il contenuto', async () => {
  expect(await readFileText(new Blob(['ciao']))).toBe('ciao');
});
```

- [ ] **Step 2: Esegui i test**

Run: `npm test -- src/core/storage src/core/fileShare`
Expected: FAIL, moduli non trovati.

- [ ] **Step 3: Implementa**

`src/core/storage.ts`:
```ts
const LAST_BACKUP_KEY = 'characters-vault:lastBackup';
const DAY_MS = 86_400_000;

/** Chiede al browser di non cancellare i dati in caso di poco spazio. */
export async function requestPersistence(): Promise<boolean> {
  const storage = navigator.storage;
  if (!storage?.persist) return false;
  try {
    if (await storage.persisted()) return true;
    return await storage.persist();
  } catch {
    return false;
  }
}

export function getLastBackup(): Date | null {
  try {
    const value = localStorage.getItem(LAST_BACKUP_KEY);
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export function setLastBackup(date = new Date()): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, date.toISOString());
  } catch {
    // localStorage non disponibile (es. navigazione privata): il promemoria non è critico.
  }
}

export function daysSince(date: Date, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
}
```

`src/core/fileShare.ts`:
```ts
function isTouchDevice(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

/** Su telefono apre il menu di condivisione; altrove scarica il file. */
export async function shareOrDownload(fileName: string, text: string): Promise<void> {
  const file = new File([text], fileName, { type: 'application/json' });

  if (isTouchDevice() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      // Condivisione fallita per altri motivi: si ripiega sul download.
    }
  }

  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Lettura del file non riuscita.'));
    reader.readAsText(file);
  });
}
```

- [ ] **Step 4: Esegui i test**

Run: `npm test -- src/core`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/storage.ts src/core/storage.test.ts src/core/fileShare.ts src/core/fileShare.test.ts
git commit -m "feat(core): add persistent storage request and file share/download

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Routing e salvataggio automatico

**Files:**
- Create: `src/app/route.ts`, `src/app/useAutosave.ts`
- Test: `src/app/route.test.ts`, `src/app/useAutosave.test.ts`

**Interfaces:**
- Consumes: niente
- Produces:
  - `type Route = { name: 'list' } | { name: 'sheet'; id: string }`
  - `parseHash(hash: string): Route`, `routeToHash(route: Route): string`, `navigate(route: Route): void`, `useRoute(): Route`
  - `type SaveStatus = 'idle' | 'pending' | 'saved' | 'error'`
  - `useAutosave<T>(value: T, save: (value: T) => Promise<void>, delay?: number): SaveStatus`: non salva al primo render; salva dopo `delay` ms (default 500) dall'ultima modifica; salva subito alla chiusura della pagina (`pagehide`) e allo smontaggio se c'è una modifica in sospeso

- [ ] **Step 1: Test (falliscono)**

`src/app/route.test.ts`:
```ts
import { expect, it } from 'vitest';
import { parseHash, routeToHash } from './route';

it('interpreta gli hash', () => {
  expect(parseHash('')).toEqual({ name: 'list' });
  expect(parseHash('#/')).toEqual({ name: 'list' });
  expect(parseHash('#/c/abc-123')).toEqual({ name: 'sheet', id: 'abc-123' });
  expect(parseHash('#/c/')).toEqual({ name: 'list' });
  expect(parseHash('#/boh')).toEqual({ name: 'list' });
});

it('costruisce gli hash', () => {
  expect(routeToHash({ name: 'list' })).toBe('#/');
  expect(routeToHash({ name: 'sheet', id: 'a b' })).toBe('#/c/a%20b');
  expect(parseHash(routeToHash({ name: 'sheet', id: 'a b' }))).toEqual({ name: 'sheet', id: 'a b' });
});
```

`src/app/useAutosave.test.ts`:
```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutosave } from './useAutosave';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(save: (v: number) => Promise<void>) {
  return renderHook(({ value }) => useAutosave(value, save, 500), { initialProps: { value: 1 } });
}

describe('useAutosave', () => {
  it('non salva al primo render', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = setup(save);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(save).not.toHaveBeenCalled();
    expect(result.current).toBe('idle');
  });

  it('salva dopo il ritardo', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = setup(save);
    rerender({ value: 2 });
    expect(result.current).toBe('pending');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(499);
    });
    expect(save).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(save).toHaveBeenCalledExactlyOnceWith(2);
    expect(result.current).toBe('saved');
  });

  it('raggruppa modifiche ravvicinate', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender } = setup(save);
    rerender({ value: 2 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    rerender({ value: 3 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(save).toHaveBeenCalledExactlyOnceWith(3);
  });

  it('salva subito allo smontaggio se c’è una modifica in sospeso', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender, unmount } = setup(save);
    rerender({ value: 2 });
    unmount();
    expect(save).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('salva alla chiusura della pagina', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender } = setup(save);
    rerender({ value: 2 });
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(save).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('segnala errore se il salvataggio fallisce', async () => {
    const save = vi.fn().mockRejectedValue(new Error('disco pieno'));
    const { result, rerender } = setup(save);
    rerender({ value: 2 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current).toBe('error');
  });
});
```

- [ ] **Step 2: Esegui i test**

Run: `npm test -- src/app`
Expected: FAIL, moduli non trovati.

- [ ] **Step 3: Implementa**

`src/app/route.ts`:
```ts
import { useEffect, useState } from 'react';

export type Route = { name: 'list' } | { name: 'sheet'; id: string };

export function parseHash(hash: string): Route {
  const match = /^#\/c\/([^/]+)$/.exec(hash);
  return match ? { name: 'sheet', id: decodeURIComponent(match[1]) } : { name: 'list' };
}

export function routeToHash(route: Route): string {
  return route.name === 'sheet' ? `#/c/${encodeURIComponent(route.id)}` : '#/';
}

export function navigate(route: Route): void {
  window.location.hash = routeToHash(route);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
```

`src/app/useAutosave.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saved' | 'error';

export function useAutosave<T>(value: T, save: (value: T) => Promise<void>, delay = 500): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const latest = useRef({ value, save });
  latest.current = { value, save };
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isFirstRender = useRef(true);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (!pending.current) return;
    pending.current = false;
    try {
      await latest.current.save(latest.current.value);
      setStatus('saved');
    } catch {
      // Il prossimo cambiamento ritenta il salvataggio.
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    pending.current = true;
    setStatus('pending');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), delay);
  }, [value, delay, flush]);

  useEffect(() => {
    const onPageHide = () => void flush();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      void flush();
    };
  }, [flush]);

  return status;
}
```

- [ ] **Step 4: Esegui i test**

Run: `npm test -- src/app`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app
git commit -m "feat(app): add hash routing and debounced autosave hook

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Lista personaggi, host scheda, App

**Files:**
- Create: `src/app/CharacterList.tsx`, `src/app/SheetHost.tsx`
- Modify: `src/App.tsx` (sostituisce il segnaposto del Task 1), `src/App.test.tsx`
- Test: `src/app/CharacterList.test.tsx`, `src/app/SheetHost.test.tsx`

**Interfaces:**
- Consumes: `db` (Task 13), `listCharacters`, `getCharacter`, `createCharacter`, `saveCharacterData`, `deleteCharacter`, `duplicateCharacter`, `putCharacters`, `existingIds` (Task 13); `loadCharacter` (Task 2); `registry` (Task 2); `buildExportFile`, `serializeExport`, `exportFileName`, `parseImportFile`, `splitConflicts`, `asCopy`, `ImportError` (Task 14); `shareOrDownload`, `readFileText`, `requestPersistence`, `getLastBackup`, `setLastBackup`, `daysSince` (Task 15); `useRoute`, `navigate`, `routeToHash`, `useAutosave` (Task 16)
- Produces:
  - `CharacterList({ persisted }: { persisted: boolean | null })`: form `Nuovo personaggio` (campo `Nome`, select `Sistema`, pulsante `Crea`); pulsanti `Importa`, `Backup completo`; input file con `data-testid="import-input"`; per ogni record: nome (link se apribile), sottotitolo (`<sistema> · <summary>` | `Sistema sconosciuto: <id>` | `Scheda danneggiata`), pulsanti `Esporta`, `Duplica` (solo se apribile), `Elimina`; messaggi in `role="status"`; avviso `role="alert"` se `persisted === false`
  - `SheetHost({ id }: { id: string })`: stati `Caricamento…`, `Personaggio non trovato.`, errore `role="alert"` `Impossibile aprire la scheda: …`; header con link `← Lista`, nome, stato salvataggio (`Salvataggio…`, `Salvato`, `Errore di salvataggio`)
  - `App` (default export)

- [ ] **Step 1: Test (falliscono)**

`src/app/CharacterList.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../core/db';
import { buildExportFile } from '../core/importExport';
import { createCharacter, putCharacters } from '../core/repository';
import '../systems';
import { dnd5e } from '../systems/dnd5e-2014';
import { CharacterList } from './CharacterList';

beforeEach(async () => {
  await db.characters.clear();
  localStorage.clear();
  window.location.hash = '';
});

function row(name: string) {
  return screen.getByText(name).closest('li') as HTMLElement;
}

describe('CharacterList', () => {
  it('crea un personaggio e apre la scheda', async () => {
    const user = userEvent.setup();
    render(<CharacterList persisted={true} />);
    await user.type(screen.getByLabelText('Nome'), 'Thorin');
    await user.click(screen.getByRole('button', { name: 'Crea' }));
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/c\/.+/));
    const all = await db.characters.toArray();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ name: 'Thorin', systemId: 'dnd5e-2014' });
  });

  it('mostra i personaggi con sistema e riepilogo', async () => {
    await createCharacter(dnd5e, 'Lia');
    render(<CharacterList persisted={true} />);
    expect(await screen.findByText('Lia')).toBeInTheDocument();
    expect(within(row('Lia')).getByText('D&D 5e (2014) · Livello 1')).toBeInTheDocument();
    expect(screen.getByText('Nessun backup eseguito.')).toBeInTheDocument();
  });

  it('elimina dopo conferma', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await createCharacter(dnd5e, 'Lia');
    render(<CharacterList persisted={true} />);
    await screen.findByText('Lia');
    await user.click(within(row('Lia')).getByRole('button', { name: 'Elimina' }));
    await waitFor(async () => expect(await db.characters.count()).toBe(0));
  });

  it('non elimina se annullato', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await createCharacter(dnd5e, 'Lia');
    render(<CharacterList persisted={true} />);
    await screen.findByText('Lia');
    await user.click(within(row('Lia')).getByRole('button', { name: 'Elimina' }));
    expect(await db.characters.count()).toBe(1);
  });

  it('duplica', async () => {
    const user = userEvent.setup();
    await createCharacter(dnd5e, 'Lia');
    render(<CharacterList persisted={true} />);
    await screen.findByText('Lia');
    await user.click(within(row('Lia')).getByRole('button', { name: 'Duplica' }));
    expect(await screen.findByText('Lia (copia)')).toBeInTheDocument();
  });

  it('segnala schede danneggiate e sistemi sconosciuti', async () => {
    const ts = new Date().toISOString();
    await putCharacters([
      { id: 'bad', systemId: 'dnd5e-2014', schemaVersion: 1, name: 'Rotto', createdAt: ts, updatedAt: ts, data: { foo: 1 } },
      { id: 'alien', systemId: 'boh', schemaVersion: 1, name: 'Alieno', createdAt: ts, updatedAt: ts, data: {} },
    ]);
    render(<CharacterList persisted={true} />);
    await screen.findByText('Rotto');
    expect(within(row('Rotto')).getByText('Scheda danneggiata')).toBeInTheDocument();
    expect(within(row('Rotto')).queryByRole('button', { name: 'Duplica' })).not.toBeInTheDocument();
    expect(within(row('Alieno')).getByText('Sistema sconosciuto: boh')).toBeInTheDocument();
  });

  it('importa un file', async () => {
    const ts = new Date().toISOString();
    const data = dnd5e.withName(dnd5e.createBlank(), 'Importato');
    const text = JSON.stringify(
      buildExportFile([{ id: 'imp', systemId: 'dnd5e-2014', schemaVersion: 1, name: 'Importato', createdAt: ts, updatedAt: ts, data }]),
    );
    render(<CharacterList persisted={true} />);
    fireEvent.change(screen.getByTestId('import-input'), {
      target: { files: [new File([text], 'imp.json', { type: 'application/json' })] },
    });
    expect(await screen.findByText('Importato')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Importati 1 personaggi.');
  });

  it('segnala file non validi', async () => {
    render(<CharacterList persisted={true} />);
    fireEvent.change(screen.getByTestId('import-input'), {
      target: { files: [new File(['non json'], 'x.json')] },
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Il file non è un JSON valido.');
  });

  it('avvisa se lo storage non è persistente', () => {
    render(<CharacterList persisted={false} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/backup/);
  });
});
```

`src/app/SheetHost.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it } from 'vitest';
import { db } from '../core/db';
import { createCharacter, getCharacter, putCharacters } from '../core/repository';
import '../systems';
import { dnd5e } from '../systems/dnd5e-2014';
import { SheetHost } from './SheetHost';

beforeEach(async () => {
  await db.characters.clear();
});

it('carica la scheda e salva automaticamente', async () => {
  const user = userEvent.setup();
  const rec = await createCharacter(dnd5e, 'Thorin');
  render(<SheetHost id={rec.id} />);
  const name = await screen.findByLabelText('Nome personaggio');
  expect(name).toHaveValue('Thorin');
  await user.type(name, ' Scudodiquercia');
  expect(await screen.findByText('Salvato', {}, { timeout: 2000 })).toBeInTheDocument();
  expect((await getCharacter(rec.id))?.name).toBe('Thorin Scudodiquercia');
});

it('personaggio inesistente', async () => {
  render(<SheetHost id="nope" />);
  expect(await screen.findByText('Personaggio non trovato.')).toBeInTheDocument();
});

it('scheda danneggiata', async () => {
  const ts = new Date().toISOString();
  await putCharacters([{ id: 'bad', systemId: 'dnd5e-2014', schemaVersion: 1, name: 'Rotto', createdAt: ts, updatedAt: ts, data: {} }]);
  render(<SheetHost id="bad" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Impossibile aprire la scheda');
});
```

Aggiorna `src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from './App';

it('mostra la lista personaggi e avvisa se lo storage non è persistente', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Characters Vault' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Nuovo personaggio' })).toBeInTheDocument();
  // jsdom non espone navigator.storage.persist → persistenza non garantita.
  expect(await screen.findByRole('alert')).toBeInTheDocument();
});
```

- [ ] **Step 2: Esegui i test**

Run: `npm test -- src/app src/App`
Expected: FAIL, `CharacterList` e `SheetHost` non trovati; il test di App fallisce sull'heading `Nuovo personaggio`.

- [ ] **Step 3: Implementa CharacterList**

`src/app/CharacterList.tsx`:
```tsx
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
        <h1>Characters Vault</h1>
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
```

- [ ] **Step 4: Implementa SheetHost**

`src/app/SheetHost.tsx`:
```tsx
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
  const Sheet = system.Sheet;

  return (
    <div className="sheet-host">
      <header className="sheet-header">
        <a href="#/" className="btn small">
          ← Lista
        </a>
        <span className="sheet-title">{system.getName(data) || 'Senza nome'}</span>
        <span className={`save-status ${status}`} role="status">
          {SAVE_LABEL[status]}
        </span>
      </header>
      <Sheet data={data} onChange={setData} />
    </div>
  );
}
```

- [ ] **Step 5: Sostituisci App.tsx**

`src/App.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { CharacterList } from './app/CharacterList';
import { useRoute } from './app/route';
import { SheetHost } from './app/SheetHost';
import { requestPersistence } from './core/storage';

export default function App() {
  const route = useRoute();
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    void requestPersistence().then(setPersisted);
  }, []);

  return route.name === 'sheet' ? <SheetHost key={route.id} id={route.id} /> : <CharacterList persisted={persisted} />;
}
```

- [ ] **Step 6: Esegui tutti i test e il typecheck**

Run: `npm test`
Expected: PASS (tutti i file di test).

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 7: Prova manuale nel browser**

Run: `npm run dev`
Verifica su `http://localhost:5173`:
1. Crea "Thorin" → si apre la scheda.
2. Cambia FOR a 16: il modificatore diventa +3. L'header mostra "Salvato".
3. Ricarica la pagina: i dati restano.
4. Torna alla lista, clicca Esporta: parte il download di `Thorin.json`.
5. Elimina Thorin e importa `Thorin.json`: ricompare.
6. Restringi la finestra sotto 1024px: compare la barra dei tab in basso.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat(app): add character list, sheet host with autosave and app shell

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: PWA, icone, deploy, README

**Files:**
- Create: `public/icon.svg`, `.github/workflows/deploy.yml`, `README.md`
- Create (generati): `public/favicon.ico`, `public/pwa-64x64.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png`
- Modify: `vite.config.ts`, `index.html`, `package.json`

**Interfaces:**
- Consumes: build del Task 1–17
- Produces: `dist/` con `manifest.webmanifest` e `sw.js`; workflow GitHub Pages; script npm `icons`

- [ ] **Step 1: Icona sorgente**

`public/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#121418"/>
  <polygon points="256,72 415,164 415,348 256,440 97,348 97,164" fill="none" stroke="#d4a842" stroke-width="28" stroke-linejoin="round"/>
  <polygon points="256,150 350,316 162,316" fill="#d4a842"/>
</svg>
```

- [ ] **Step 2: Script e generazione icone**

In `package.json`, dentro `scripts`, aggiungi:
```json
    "icons": "pwa-assets-generator --preset minimal-2023 public/icon.svg"
```

Run: `npm run icons`
Expected: in `public/` compaiono `favicon.ico`, `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`.

- [ ] **Step 3: Configura vite-plugin-pwa**

`vite.config.ts`:
```ts
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Characters Vault',
        short_name: 'Characters Vault',
        description: 'Schede per giochi di ruolo, anche offline.',
        lang: 'it',
        theme_color: '#121418',
        background_color: '#121418',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
});
```

In `index.html`, dentro `<head>` dopo il meta `theme-color`, aggiungi:
```html
    <link rel="icon" href="./favicon.ico" sizes="48x48" />
    <link rel="icon" href="./icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="./apple-touch-icon-180x180.png" />
```

- [ ] **Step 4: Verifica build PWA**

Run: `npm test`
Expected: PASS (il plugin PWA non deve rompere i test).

Run: `npm run build`
Expected: build completata; l'output elenca `dist/sw.js` e `dist/manifest.webmanifest`.

Run: `npm run preview`
Apri l'URL mostrato (di solito `http://localhost:4173`). In DevTools → Application verifica: il manifest è valido con le icone, il service worker è attivo, e con "Offline" spuntato l'app si ricarica e funziona.

- [ ] **Step 5: Workflow GitHub Pages**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy su GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 6: README**

`README.md`:
````markdown
# Characters Vault

Schede per giochi di ruolo. Funziona offline su telefono e PC, senza server: i dati restano nel browser del dispositivo.

Sistema supportato: **D&D 5e (2014)**.

## Sviluppo

```bash
npm install
npm run dev        # http://localhost:5173
npm run dev:lan    # raggiungibile dal telefono sulla stessa rete (senza service worker: serve https)
npm test
npm run build      # output in dist/
npm run preview    # prova la build, service worker incluso
```

## Pubblicazione (GitHub Pages)

1. Crea un repository su GitHub e fai push del branch `main`.
2. Nel repository: Settings → Pages → Source: **GitHub Actions**.
3. Ogni push su `main` esegue test e build e pubblica il sito (workflow `.github/workflows/deploy.yml`).

## Installazione

- **Android (Chrome):** apri il sito → menu ⋮ → *Installa app*.
- **iPhone (Safari):** apri il sito → Condividi → *Aggiungi alla schermata Home*.
- **PC (Chrome/Edge):** icona di installazione nella barra degli indirizzi.

## Dati e backup

- I personaggi sono salvati in IndexedDB, sul dispositivo. Non vengono sincronizzati.
- Per spostarli su un altro dispositivo: **Esporta** (un personaggio) o **Backup completo**, poi **Importa** sull'altro.
- Il browser può cancellare i dati di siti poco usati, soprattutto su iPhone se l'app non è installata. Installa l'app e fai backup regolari: la lista mostra da quanti giorni non lo fai.

## Aggiungere un sistema di gioco

1. Crea `src/systems/<id>/` con un oggetto che implementa `GameSystem<T>` (`src/core/types.ts`).
2. Registralo in `src/systems/index.ts`.
3. Per cambiare lo schema dei dati di un sistema esistente: incrementa `schemaVersion` e aggiungi il passo di migrazione in `migrate.ts`.
````

- [ ] **Step 7: Verifica finale**

Run: `npm test`
Expected: PASS, tutti i test.

Run: `npm run build`
Expected: nessun errore.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: make app an installable offline PWA with GitHub Pages deploy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
