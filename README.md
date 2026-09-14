# Coffee Morning Dashboard

Minimaler Morgen-Tablet-Dashboard (deutsch) für ein wandmontiertes Android-Tablet neben der Kaffeemaschine.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Mock-Daten in `src/data/` (Personen getrennt unter `src/data/persons/`)

## Lokal starten

```bash
npm install
npm run dev
```

Dev-Server: Port **43127** → [http://127.0.0.1:43127](http://127.0.0.1:43127)

## Routen

| Route | Inhalt |
| --- | --- |
| `/` | Home — „Guten Morgen“ + Profilwahl (Levi, Birgit, Heidi) |
| `/person/levi` | Schule: Stundenplan, nächstes Fach, Bus, Wetter, To-dos |
| `/person/birgit` | Schicht: Beginn/Ende, Bus, Wetter, Kalender |
| `/person/heidi` | Persönlicher Tag |
| `/kaffee` | Espresso / Cappuccino / Latte + funktionierender Timer |

## Phase 1

Mock-Daten und UI. Später: Datenlayer, Plan-Upload/OCR, Wetter/Bus/Kalender live, Jarvis, Kiosk, Smart Home.
