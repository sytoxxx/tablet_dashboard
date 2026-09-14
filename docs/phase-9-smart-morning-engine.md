# Phase 9 — Smart Morning Engine

## Ziel

Coffee Morning erstellt aus vorhandenen Daten automatisch einen sinnvollen persönlichen Morgenplan.

- Bestehende Bus-/Wetter-/Plan-Architektur
- Keine neue Bus-API
- Keine hardcodierten Live-Haltestellen
- TRIAS: bis Zugangsdaten nur **Testdaten**
- Birgit bleibt extrem einfach
- Keine Sprachsteuerung, keine neue Datenbank

## Daily Overview

Zentrale Funktion:

```ts
getMorningOverview(personId, date, options?) → MorningOverview
buildMorningSummary(overview) → string
```

Pfad: `src/lib/morning/overview.ts`

Felder u. a.:

| Feld | Inhalt |
|------|--------|
| `greeting` | Tageszeit + Name |
| `nextActivity` | Als Nächstes |
| `itemsToTake` | Mitnehmen (dedupliziert) |
| `bus` | Verbindung + Status + Timing-Quelle |
| `weather` | Kurz + Kleidungstipp |
| `appointments` | Heute, ohne Vergangene |
| `importantTasks` | Nur wichtige offene |
| `coffee` | Levi |
| `importantHint` | Birgit/Heidi |
| `summary` | Jarvis-Text |
| `visibility` / `priorityOrder` | UI-Steuerung |

Die UI enthält möglichst keine Business-Logik mehr.

## Datenfluss

```
Person + wall clock
  → buildDayIntelligence (Plan, Fokus heute/morgen)
  → useBusLive / useWeatherLive (optional overlay)
  → getMorningOverview
       ├ resolveNextActivity
       ├ buildBringItems (+ Regeln)
       ├ resolveBusMorning
       ├ weather tip
       └ buildMorningSummary
  → Levi / Birgit / Heidi Dashboard (nur Darstellung)
```

## Prioritäten

### Levi

1. Uhr · 2. Als Nächstes · 3. Mitnehmen · 4. Bus · 5. Wetter · 6. Termine · 7. Wichtig · 8. Kaffee

### Birgit

1. Arbeit · 2. Dein Bus · 3. Wetter · 4. wichtiger Hinweis  

Keine Termine-Karte, kein Mitnehmen, kein Kaffee-Strip, kein Provider-Jargon.

### Heidi

1. Arbeit/Plan · 2. Bus · 3. Wetter · 4. Termine / wichtige Information  

## Als Nächstes

`src/lib/morning/next-activity.ts`

1. Laufender / nächster Unterricht bzw. Schicht  
2. Sonst nächster Termin  
3. Sonst „Heute nichts geplant“  

Status: `läuft gerade` · `in X Min.` · `um HH:MM` · `erledigt`

## Mitnehmen

Regelbasiert (`bring-rules.ts` + `bring.ts`):

- Sport → Sportsachen  
- Mathematik → Mathematik-Unterlagen  
- Schultag → Schulsachen (+ Laptop bei Informatik)  
- Explizite `bringItems` gewinnen mit  
- Deduplizierung inkl. Synonyme  

## Busintegration

Engine **erfindet keine** Fahrzeiten/Verspätungen.

Sie konsumiert `BusInfo` aus `selectRelevantDeparture` / `useBusLive`:

| Signal | Bedeutung |
|--------|-----------|
| `realtimeDeparture` / `isRealtime` | Echtzeit > Fahrplan |
| `scheduledDeparture` | Fahrplan |
| `delayMinutes` | nur wenn Provider liefert |
| `cancelled` | Ausfall |
| `arrivesInTime` | passt zur Arbeit/Schule? |
| `isTestData` / `source: local` | Testdaten |

Status der Engine: `on_time` · `too_late` · `delayed` · `cancelled` · `none` · `unknown`

Wichtig: **Kein automatisches „pünktlich“** nur weil ein Bus gewählt wurde.  
Ohne Echtzeit: Fahrplan nutzen und als „Nach Fahrplan“ / „Testdaten“ markieren (Levi).

## Wetter

Kurze Tips via `clothingRecommendation` — keine langen Berichte.

## Morning Summary / Jarvis

`buildMorningSummary(overview)` erzeugt einen strukturierten deutschen Text.

Später: TTS / Rückfragen auf Overview-Felder.  
**Noch keine Sprachsteuerung.**

## Tests

`src/lib/morning/overview.test.ts` · `src/lib/bus/select.test.ts`

u. a. Schultag, Arbeitstag, leer, Termine, Mitnehmen, Bus pünktlich/verspätet/ausgefallen/kein Bus, Wetter, Tasks, Tageswechsel, Levi/Birgit/Heidi.

## Dateien

- `src/lib/morning/*`
- `src/lib/bus/select.ts`
- `src/lib/types.ts` (`BusInfo` erweitert)
- Person-Dashboards + `bus-section.tsx`
- `docs/phase-9-smart-morning-engine.md`

Siehe auch: `docs/phase-9-intelligent-daily.md` (Vorgänger-Doku derselben Phase).
