# Phase 9 — Intelligent Daily Morning

## Ziel

Die App versteht morgens automatisch: **Was ist heute für diese Person wichtig?**

Sie kombiniert vorhandene Daten (Schule/Arbeit, Bus, Wetter, Kalender, Aufgaben, Mitnehmen, Kaffee) zu einer strukturierten Tagesübersicht — ohne neue Fake-APIs und ohne neue Parallelarchitektur.

## Daily-Overview-Datenmodell

Zentrale Funktion:

```ts
getMorningOverview(personId, date, options?) → MorningOverview
```

Pfad: `src/lib/morning/overview.ts`

Wichtige Felder:

| Feld | Bedeutung |
|------|-----------|
| `greeting` | Tageszeit + Name |
| `nextActivity` | Als Nächstes (Unterricht / Termin / leer) |
| `itemsToTake` | Mitnehmen-Liste (dedupliziert) |
| `bus` | Bus + Status (`on_time` / `too_late` / `none`) |
| `weather` | Wetter + kurzer Kleidungstipp |
| `appointments` | Relevante Termine heute (ohne Vergangene) |
| `importantTasks` | Nur `important && !done` |
| `coffee` | Levi: „Dein Kaffee ist bereit.“ |
| `summary` | Textbriefing für späteres Jarvis |
| `visibility` | Welche Bereiche die UI zeigen soll |
| `priorityOrder` | Personen-Prioritätsliste |

UI berechnet keine Business-Logik — sie rendert das Overview.

## Prioritätslogik

### Levi

1. Uhrzeit  
2. Als Nächstes  
3. Mitnehmen  
4. Bus  
5. Wetter  
6. Termine  
7. Wichtig  
8. Kaffee  

### Birgit (extrem einfach)

1. Arbeit  
2. Bus  
3. Wetter  
4. optionaler Hinweis  

Kein Kaffee, keine Aufgabenliste, kein aufgeblähtes Mitnehmen.

### Heidi

Ähnlich Birgit, etwas mehr Kontext (Plan, Mitnehmen, Termine wenn vorhanden).

## „Als Nächstes“

`src/lib/morning/next-activity.ts`

1. Laufender / nächster Unterricht bzw. Schicht / Block  
2. Sonst nächster Termin  
3. Sonst „Heute nichts geplant“  

Status-Labels: `läuft gerade` · `in X Min.` · `um HH:MM` · `erledigt`

Tageswechsel: ab `DAY_CONFIG.eveningTomorrowHour` (18:00) Fokus auf morgen — über bestehendes `resolveFocusMoment`.

## Mitnehmen-Logik

`src/lib/day/bring.ts` + `src/lib/morning/bring-rules.ts`

- Defaults der Person  
- Explizite `bringItems` an Stunden/Schichten  
- Regelbasiert aus Fachnamen (z. B. Mathematik → Mathematik-Unterlagen, Sport → Sportsachen)  
- Schultag → zusätzlich Schulsachen  
- Deduplizierung inkl. Synonyme (`Sportzeug` ≡ `Sportsachen`)  

Leerer Tag: „Heute nichts Besonderes mitnehmen“ — Karte wird ausgeblendet wenn leer.

## Bus-Integration

Bestehendes `selectRelevantDeparture` / `useBusLive` bleibt.

Overview mappt auf:

| Status | UI |
|--------|-----|
| `on_time` | „Du kommst rechtzeitig an.“ |
| `too_late` | „Bus reicht nicht“ |
| `none` | „Kein passender Bus“ |

Birgit sieht weiterhin nur einfache Bus-Sprache — keine Provider-/API-Begriffe.

## Wetter-Integration

`clothingRecommendation` liefert kurze Tipps:

- Regen → Jacke / Regenschirm  
- starker Regen → Regenjacke  
- kalt → warme Jacke  
- heiß → leichte Kleidung  
- Schnee → warme Kleidung  

Keine langen Wettertexte.

## Smartes Ausblenden

`visibility.*` steuert leere Bereiche:

- keine Termine → Termine aus  
- nichts Mitnehmen → Mitnehmen aus  
- keine wichtigen Tasks → Wichtig aus  

Dashboard bleibt ruhig.

## Kaffee

Keine neue Timer-Architektur. Levi bekommt einen kompakten Strip (`CoffeeMorningStrip`) mit Link zu `/kaffee` und der bestehenden `CoffeeTimer`-Seite.

## Morning-Summary (Jarvis-ready)

`buildMorningSummary` / `overview.summary` — strukturierter deutscher Text, z. B.:

> Guten Morgen, Levi. Du hast um 08:15 Mathematik. Du brauchst … Der nächste passende Bus fährt um …. Es sind 14 Grad …

Noch **keine** Sprachsteuerung.

## Personenunterschiede (Kurz)

| | Levi | Birgit | Heidi |
|--|------|--------|-------|
| Detailtiefe | hoch | minimal | mittel |
| Kaffee | ja | nein | nein |
| Tasks | wichtige | nein | nein |
| Mitnehmen | wenn nötig | nein | wenn nötig |

## Spätere Jarvis-Erweiterungen

- `summary` vorlesen (TTS)  
- Rückfragen („Was muss ich mitnehmen?“) → Overview-Felder  
- Optional AI nur als Ergänzung der Regel-Mitnehmen-Liste  
- Shared Coffee-Timer-State über Tabs (sessionStorage), falls gewünscht  

## Qualität

- TypeScript  
- Vitest: `src/lib/morning/overview.test.ts` (+ bestehende Bus-/Day-Tests)  
- Lint / Build  

## Dateien (Kern)

- `src/lib/morning/overview.ts`  
- `src/lib/morning/types.ts`  
- `src/lib/morning/next-activity.ts`  
- `src/lib/morning/bring-rules.ts`  
- `src/lib/morning/bus-status.ts`  
- `src/lib/morning/summary.ts`  
- `src/lib/day/bring.ts`  
- `src/lib/weather/clothing.ts`  
- `src/components/person-dashboard.tsx`  
- `src/components/person/levi-morning-dashboard.tsx`  
- `src/components/person/simple-morning-dashboard.tsx`  
- `src/components/person/coffee-morning-strip.tsx`  
