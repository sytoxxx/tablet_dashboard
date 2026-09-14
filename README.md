# Coffee Morning Dashboard

Minimaler Morgen-Tablet-Dashboard (deutsch) für ein wandmontiertes Android-Tablet neben der Kaffeemaschine.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Zentrale Mock-Daten + LocalStorage-Adapter (`src/data/`)

## Lokal starten

```bash
npm install
npm run build
npm run start
```

Server: Port **43127** → [http://127.0.0.1:43127](http://127.0.0.1:43127)

Dev: `npm run dev` (gleicher Port).

## Routen

| Route | Inhalt |
| --- | --- |
| `/` | Home — nur Guten Morgen + Levi / Birgit / Heidi |
| `/person/[id]` | Tagesansicht (weekday + live clock) |
| `/kaffee` | Timer |
| `/einstellungen` | Admin-Hub |
| `/plan-aktualisieren` | Upload-Vorschau (kein OCR) |

## Phasen

1. MVP UI + Timer
2. Datenlayer, Wochentag, LocalStorage, Admin, Upload-Stub
3. Plan-OCR mit Confirm-before-save (später)
