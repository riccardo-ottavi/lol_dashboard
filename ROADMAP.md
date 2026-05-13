# 🎮 LoL Dashboard — Roadmap

> Dashboard per il confronto statistiche tra gruppi di amici su League of Legends.
> Spunta le checkbox man mano che avanzi.

---

## Fase 0 — Setup & fondamenta `1–2 giorni`

- [x] **Struttura monorepo** — Cartelle `client/`, `server/`, `shared/` con TypeScript configurato in tutti e tre
- [x] **Schema MySQL iniziale** — Tabelle `users`, `groups`, `group_members`, `summoners`
- [x] **Configurazione ambiente** — ESLint, Prettier, variabili d'ambiente (`.env`), `.gitignore`

---

## Fase 1 — Autenticazione `3–5 giorni`

- [ ] **OAuth Discord (backend)** — Flusso OAuth2, generazione JWT, salvataggio utente su DB
- [ ] **Middleware autenticazione** — Verifica JWT su ogni route protetta
- [ ] **Pagina login + routing frontend** — Landing page, protected routes con React Router, gestione token lato client

---

## Fase 2 — Integrazione Riot API `4–6 giorni`

> ⚠️ La API key di Riot deve essere richiesta prima di questa fase. Nel frattempo, mocka le risposte con dati finti per sviluppare il frontend in anticipo.

- [ ] **Wrapper Riot API (backend)** — Ricerca summoner per nome, recupero PUUID, rank attuale, ultimi match — con rispetto del rate limit (20 req/s, 100 req/2min)
- [ ] **Sistema di cache** — Tabella `cache_meta`, logica di invalidazione con TTL ~5 minuti per non sprecare chiamate API
- [ ] **Collegamento account Riot** — Pagina profilo dove l'utente inserisce summoner name + regione dopo il login Discord

---

## Fase 3 — Gruppi & gestione amici `3–4 giorni`

- [ ] **CRUD gruppi (backend)** — Crea gruppo, genera invite code univoco, entra nel gruppo tramite codice, lista membri
- [ ] **Tabelle DB aggiuntive** — `matches`, `match_participants`, aggiornamento schema
- [ ] **UI gestione gruppo** — Crea / entra con invite link, condividi codice, lista membri con rank attuale

---

## Fase 4 — Dashboard & statistiche `6–8 giorni`

> Questa è la parte principale dell'app. Puoi iniziarla in parallelo alla Fase 2 usando dati mockati.

- [ ] **Endpoint statistiche gruppo** — Overview confronto tra tutti i membri: winrate, KDA medio, rank, LP
- [ ] **Leaderboard interna** — Classifica del gruppo su più metriche (winrate, KDA, LP guadagnati nell'ultima settimana)
- [ ] **Storico match** — Lista ultimi game con filtri per modalità, campione, risultato
- [ ] **Match detail** — Dettaglio singola partita con stats di ogni partecipante del gruppo
- [ ] **Profilo giocatore** — Stats personali, champion pool, andamento del rank nel tempo

---

## Fase 5 — Polish & deploy `3–5 giorni`

> Serve una versione pubblica e funzionante per sottomettere la richiesta di Production key a Riot.

- [ ] **Responsive & UX** — Mobile-first, loading skeleton, gestione errori e stati vuoti
- [ ] **Sicurezza & rate limit** — Helmet, CORS, throttle sulle route pubbliche, validazione input con Zod
- [ ] **Deploy** — Frontend su Vercel/Netlify, backend su Railway/Render, DB su istanza MySQL managed
- [ ] **Applicazione Production key Riot** — Descrizione progetto, link alla demo deployata, submit per review

---

## Note tecniche

### Stack
| Layer | Tecnologia |
|---|---|
| Frontend | React + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | MySQL |
| Auth | Discord OAuth2 + JWT |
| Dati partite | Riot Games API |

### Regole Riot da rispettare
- La API key non deve mai essere esposta lato client
- Nessun sistema alternativo di ranking globale (MMR, ELO calculator)
- Nessuna monetizzazione o accesso esclusivo a pagamento
- La leaderboard interna al gruppo è permessa — è confronto tra amici, non ranking pubblico
- Per la Production key serve una demo pubblica funzionante

### Schema DB (tabelle principali)
```
users              → id, discord_id, username, avatar, created_at
groups             → id, name, invite_code, owner_id, created_at
group_members      → group_id, user_id, joined_at
summoners          → id, user_id, summoner_name, puuid, region, rank, tier, lp
matches            → id, match_id (Riot), region, game_mode, duration, played_at
match_participants → match_id, summoner_id, champion, kills, deaths, assists, win
cache_meta         → summoner_id, last_fetched_at
```
