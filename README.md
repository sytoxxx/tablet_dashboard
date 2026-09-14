# Coffee Morning Dashboard

Minimaler Morgen-Tablet-Dashboard (deutsch) für ein wandmontiertes Android-Tablet neben der Kaffeemaschine.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Mock-Daten in `src/data/`

## Lokal starten

```bash
npm install
npm run dev -- --port 43127
```

Dann öffnen: [http://127.0.0.1:43127](http://127.0.0.1:43127)

## Routen

| Route | Inhalt |
| --- | --- |
| `/` | Home — „Guten Morgen“ + Profilwahl |
| `/person/[id]` | Tagesübersicht (`levi`, `schwiegermutter`, `heidi`) |
| `/kaffee` | Kaffee-Stubs (Espresso, Cappuccino, Latte) |

## Phase 1

Nur Mock-Daten und UI-Schalen. Spätere Phasen: Datenlayer, Plan-Upload/OCR, Wetter/Bus/Kalender, Jarvis, Kiosk, Smart Home.
