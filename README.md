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
