# Coffee Morning Dashboard

Minimaler Morgen-Tablet-Dashboard (deutsch) für ein wandmontiertes Android-Tablet neben der Kaffeemaschine.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Zentrale Mock-Daten + LocalStorage-Adapter (`src/data/`)

## Lokal starten

```bash
cp .env.example .env.local   # optional: OPENAI_API_KEY für echte Vision-Analyse
npm install
npm run build
npm run start
```

Server: Port **43127** → [http://127.0.0.1:43127](http://127.0.0.1:43127)

Ohne `OPENAI_API_KEY` liefert `/api/plan/analyze` eine realistische **Mock-Analyse**.

## Routen

| Route | Inhalt |
| --- | --- |
| `/` | Home — Guten Morgen + Levi / Birgit / Heidi |
| `/person/[id]` | Tagesansicht |
| `/kaffee` | Timer |
| `/einstellungen` | Admin |
| `/plan-aktualisieren` | Upload → Analyse → Bestätigen |
| `/api/plan/analyze` | Plan-KI (Mock oder OpenAI) |

## Phasen

1. MVP UI + Timer  
2. Datenlayer, Wochentag, LocalStorage, Admin  
3. Plan-OCR / KI mit Confirm-before-save  
4. Intelligentes Tages-Dashboard (Day-Flow, Abend→Morgen, Wetter-Provider, Mini-Kalender)

Dev-Zeit-Simulator: `http://127.0.0.1:43127/person/levi?devTime=1`
