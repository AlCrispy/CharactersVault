# Characters Vault — Design

Data: 2026-09-27
Stato: approvato in brainstorming, in attesa di revisione spec

## Obiettivo

Applicazione per gestire schede di giochi di ruolo, usabile su telefono e PC, senza server.
Primo sistema supportato: **D&D 5e (regole 2014)**. Architettura predisposta per aggiungere altri sistemi come moduli.

## Vincoli e decisioni

| Tema | Decisione |
|---|---|
| Piattaforma | PWA installabile (telefono + PC), funziona offline. Niente Electron (non gira su mobile). Impacchettamento futuro con Capacitor/Tauri possibile senza riscrittura. |
| Dati | Solo locali, IndexedDB. Nessun backend. |
| Sincronizzazione | Nessuna. Trasferimento tra dispositivi e backup solo tramite esporta/importa file JSON. |
| Hosting | Hosting statico (es. GitHub Pages). Serve solo i file dell'app, i dati non transitano. |
| Automazione scheda | Calcoli automatici base. Incantesimi, oggetti, privilegi inseriti a mano. Nessun contenuto SRD integrato. |
| Multi-sistema | Nucleo generico + moduli di sistema con contratto comune. |
| Extra v1 | Gestione riposi, monete e peso. |
| Esclusi v1 | Tiradadi, tema chiaro, lingue diverse dall'italiano, contenuti SRD, sync cloud. |
| Lingua UI | Solo italiano. |
| Tema | Solo scuro. |
| Unità di peso | kg (convenzione manuale italiano 2014). |

## Stack

- React + TypeScript
- Vite + `vite-plugin-pwa` (service worker, manifest, offline)
- Dexie (IndexedDB)
- Zustand (stato applicazione)
- zod (validazione dati importati/caricati)
- Vitest + React Testing Library
- CSS con variabili (custom properties), niente framework CSS
- Router basato su hash (compatibile con hosting statico)

## Architettura

```
src/
  core/
    types.ts          contratto GameSystem, tipo CharacterRecord
    db.ts             Dexie, tabella characters
    registry.ts       registro sistemi disponibili
    importExport.ts   serializzazione file, parsing, validazione
    storage.ts        richiesta storage persistente, data ultimo backup
  app/
    CharacterList     lista personaggi: crea, apri, duplica, elimina, importa, backup
    SheetHost         carica record, risolve modulo, monta Sheet, salvataggio automatico
  systems/
    dnd5e-2014/
      model.ts        tipi e schema zod dei dati inseriti
      rules.ts        funzioni pure per valori derivati e riposi
      rules.test.ts
      migrate.ts      migrazioni schema
      sheet/          componenti React della scheda
      index.ts        esporta GameSystem
```

Regola di dipendenza: `core` non importa da `app` né da `systems`. `systems/*` importa solo da `core` e da componenti UI condivisi. `app` usa `core` e il registro, mai un modulo di sistema direttamente.

### Contratto di un modulo

```ts
interface GameSystem<T> {
  id: string;                               // "dnd5e-2014"
  name: string;                             // "D&D 5e (2014)"
  schemaVersion: number;
  createBlank(): T;
  migrate(data: unknown, fromVersion: number): unknown; // porta i dati a schemaVersion
  validate(data: unknown): T;               // zod parse, lancia errore se non valido
  summary(data: T): string;                 // es. "Elfo Mago liv. 5"
  Sheet: React.FC<{ data: T; onChange(next: T): void }>;
}
```

Caricamento di un record: `migrate(data, record.schemaVersion)` → `validate(...)` → `Sheet`.

### Record salvato

```ts
interface CharacterRecord {
  id: string;            // UUID
  systemId: string;
  schemaVersion: number;
  name: string;          // duplicato dal modulo per la lista
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
  data: unknown;         // tipizzato dal modulo
}
```

### Principio dati

Si salvano solo i valori inseriti dall'utente. I valori derivati (modificatori, abilità, CA, CD, peso...) sono ricalcolati da `rules.ts` a ogni render e mai salvati.

## Modulo D&D 5e 2014

### Dati inseriti

- **Identità:** nome, razza, background, allineamento, PE, ispirazione (booleano)
- **Classi:** lista `{ classe, sottoclasse, livello, dadoVita: 6|8|10|12 }` (multiclasse supportato)
- **Caratteristiche:** FOR, DES, COS, INT, SAG, CAR (1–30)
- **Competenze:**
  - tiri salvezza: competente sì/no per caratteristica
  - abilità (18): `nessuna | competente | maestria`, bonus extra numerico
  - flag Factotum (Jack of All Trades)
  - lingue, strumenti, armi, armature: testo libero
- **CA:** `tipo: nessuna | leggera | media | pesante | senzaArmaturaBarbaro | senzaArmaturaMonaco`, base armatura, scudo (sì/no), bonus extra
- **Iniziativa:** bonus extra
- **Velocità:** valore inserito (metri)
- **HP:** massimi (inseriti), attuali, temporanei; tiri contro morte (successi 0–3, fallimenti 0–3); sfinimento (0–6)
- **Dadi vita usati:** per tipo di dado
- **Attacchi:** lista `{ nome, caratteristica, competente, bonusAttacco, dadiDanno (testo, es. "1d8"), aggiungiModAlDanno, bonusDanno, tipoDanno, note }`
- **Incantesimi:**
  - caratteristica da incantatore (o nessuna)
  - slot livelli 1–9: `{ max, usati }` inseriti a mano
  - slot del patto: `{ livelloSlot, max, usati }`
  - lista `{ nome, livello 0–9, preparato, note }`
- **Privilegi:** lista `{ nome, fonte, descrizione, utilizzi?: { max, usati, ripristino: breve | lungo | nessuno } }`
- **Inventario:** lista `{ nome, quantità, pesoUnitarioKg, equipaggiato, note }`; monete `{ mr, ma, me, mo, mp }`
- **Note:** tratti, ideali, legami, difetti, note libere

### Valori calcolati (`rules.ts`)

- `livelloTotale = Σ livelli classi` (minimo 1)
- `mod(p) = ⌊(p − 10) / 2⌋`
- `bonusCompetenza = 2 + ⌊(livelloTotale − 1) / 4⌋`
- Tiro salvezza = mod + (competente ? BC : 0)
- Abilità = mod caratteristica associata + { nessuna: Factotum ? ⌊BC/2⌋ : 0, competente: BC, maestria: 2×BC } + bonus extra
- Percezione passiva = 10 + abilità Percezione
- Iniziativa = mod DES + (Factotum ? ⌊BC/2⌋ : 0) + bonus extra
- CA:
  - nessuna: 10 + mod DES
  - leggera: base + mod DES
  - media: base + min(mod DES, 2)
  - pesante: base
  - senzaArmaturaBarbaro: 10 + mod DES + mod COS
  - senzaArmaturaMonaco: 10 + mod DES + mod SAG
  - + 2 se scudo, + bonus extra
- Attacco: bonus colpire = mod + (competente ? BC : 0) + bonusAttacco; danno = dadiDanno + (aggiungiModAlDanno ? mod : 0) + bonusDanno
- Incantesimi: CD = 8 + BC + mod; attacco = BC + mod
- Dadi vita totali per tipo = Σ livelli delle classi con quel dado
- Peso: Σ(quantità × pesoUnitarioKg) + (totale monete / 50) × 0,5 kg
- Capacità di carico = FOR × 7,5 kg

### Riposi

- **Riposo breve:** dialogo in cui l'utente sceglie quanti dadi vita spendere per tipo (non oltre i disponibili) e inserisce gli HP recuperati (tiro fatto a mano). Effetti: HP attuali += recuperati (max HP massimi), dadi vita usati aggiornati, privilegi con ripristino `breve` a usati = 0, slot del patto usati = 0.
- **Riposo lungo:** HP attuali = massimi, temporanei = 0; recupero dadi vita spesi fino a max(1, ⌊livelloTotale / 2⌋) totali, distribuiti partendo dai dadi più grandi; tutti gli slot (inclusi patto) usati = 0; privilegi `breve` e `lungo` usati = 0; tiri contro morte azzerati; sfinimento − 1 (min 0).

Entrambi implementati come funzioni pure `(data, opzioni) → data` in `rules.ts`.

### Danno e cura

- Danno: scala prima HP temporanei, poi attuali (min 0).
- Cura: HP attuali += valore (max HP massimi). Non tocca temporanei.
- HP temporanei: impostati, non sommati (regola 5e).

## Interfaccia

- **Mobile first.** Schermo stretto: barra in basso con sezioni Principale, Combattimento, Incantesimi, Inventario, Privilegi, Note. Schermo largo (≥ 1024px): sezioni in griglia multi-colonna.
- **Principale:** caratteristiche, tiri salvezza, abilità, percezione passiva, bonus competenza, identità, classi.
- **Combattimento:** HP con campo danno/cura e pulsanti −/+, temporanei, CA, iniziativa, velocità, tiri contro morte, sfinimento, dadi vita, attacchi, pulsanti riposo breve/lungo.
- **Incantesimi:** caratteristica, CD, attacco, slot (spunte), lista incantesimi.
- **Inventario:** oggetti, monete, peso totale / capacità di carico.
- **Privilegi:** lista con contatori utilizzi.
- **Note:** campi testuali.
- **Salvataggio automatico** con debounce ~500 ms. Indicatore discreto "salvato".
- **Lista personaggi** (pagina iniziale): crea (scelta sistema), apri, duplica, elimina (con conferma), importa, esporta, backup completo. Mostra "ultimo backup: N giorni fa".
- Tema scuro unico, testi in italiano.

## Persistenza, esporta/importa

- **Formato file:**
  ```json
  { "format": "characters-vault", "version": 1, "exportedAt": "ISO", "characters": [CharacterRecord] }
  ```
- **Esporta singolo:** `<nome>.json`. **Backup completo:** `characters-vault-backup-YYYY-MM-DD.json`. Su dispositivi che supportano Web Share API con file, si usa il menu condivisione; altrimenti download.
- La data dell'ultimo backup completo è salvata in locale.
- **Importa:** parse JSON → controllo `format`/`version` → per ogni record: sistema presente nel registro → `migrate` → `validate`. Se l'ID esiste: chiede sovrascrivi o crea copia (nuovo ID). Record non validi scartati con elenco degli errori; quelli validi importati.
- **Storage persistente:** all'avvio `navigator.storage.persist()`. Se negato, avviso visibile nella lista.

## Gestione errori

- File importato non valido: messaggio chiaro, database invariato.
- Record nel database non validabile: mostrato nella lista come "danneggiato", con opzione esporta dati grezzi ed elimina. Non viene aperto nella scheda.
- Sistema non presente nel registro: record mostrato come "sistema sconosciuto", esportabile.
- Errore di scrittura IndexedDB: avviso non bloccante, ritentato al successivo salvataggio.

## Test

- Vitest su `rules.ts`: ogni formula; casi limite (punteggi 1 e 30, livello 1/5/9/13/17/20, multiclasse, maestria + Factotum, armatura media con DES alta, difesa senza armatura); riposi breve e lungo (recupero dadi vita con multiclasse, arrotondamenti); danno con temporanei.
- Test su `migrate` e `validate` del modulo.
- Test su `importExport`: andata e ritorno, formato errato, versione sconosciuta, record parzialmente invalidi, conflitto ID.
- React Testing Library: danno/cura, riposo lungo, salvataggio automatico.
- Verifica manuale su telefono reale dopo pubblicazione.

## Fuori scope v1

Tiradadi, tema chiaro, altre lingue, contenuti SRD, sincronizzazione cloud, altri sistemi di gioco (solo predisposizione), regola variante ingombro.
