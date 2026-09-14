# Phase 8 — Real-world ready

## Ziel

Coffee Morning ist für den täglichen Tablet-Betrieb vorbereitet:
stabile Bus-/Wetter-Aktualisierung, klare Admin-Sichtbarkeit Live vs. Testdaten,
Offline-First, Landscape-Tablet-Layouts — ohne Birgit-UX zu verkomplizieren.

## Architektur

```
Dashboard (Levi / Birgit / Heidi)
  → useBusLive (60s, pausiert wenn Tab unsichtbar)
  → useWeatherLive (15min, pausiert wenn unsichtbar)
  → /api/bus/departures | /api/weather
       → createBusProvider (ein Provider, kein Fan-out)
          Steiermark TRIAS → VAO → Wiener Linien → local/mock
```

Admin:
- `/einstellungen/bus` — Personen-Konfiguration + **Bus-Verbindung**-Status
- `/einstellungen/system` — Region, Wetterstandort, bevorzugter Bus-Provider
- Zugang: Long-Press auf Home (kein versehentlicher Einstieg)

## Bus-Provider

| Env | Zweck |
|-----|--------|
| `BUS_PROVIDER=auto` | Auto-Reihenfolge |
| `VERBUND_STEIERMARK_TRIAS_URL` | TRIAS-Endpoint (Antrag: ogdtrias@verbundlinie.at) |
| `VERBUND_STEIERMARK_REQUESTOR_REF` | optional |
| `VAO_API_KEY` + `VAO_BASE_URL` | VAO START |
| `WEATHER_PROVIDER=open-meteo` | Wetter ohne Key |

Ohne TRIAS/VAO: **Testdaten** (`isTestData: true`), nie als Live.

Mit TRIAS: Live möglich, sobald echte StopPointRefs im Admin gesetzt sind.
Timeouts: 8s AbortController. Fehler → lokaler Fallback, App bleibt stabil.

## Datenfluss Person → Bus

1. `transitPrefs.enabled` — aktiv/inaktiv  
2. Start (`busStop`) + Ziel (`destinationStop` / Hint)  
3. gewünschte Ankunft **oder** Arbeits-/Schulbeginn  
4. Vorlaufzeit + optionale Linie  
5. `selectRelevantDeparture` → Dashboard  

Region-`preferredBusProvider` greift, wenn Person auf `auto` steht.

## Offline

- Cache der letzten erfolgreichen Antwort
- Dezenter Hinweis: „Daten zuletzt aktualisiert vor X Min.“
- Keine Provider-/API-Begriffe auf Birgit
- Ohne Cache: „Keine Busdaten verfügbar“

## Intervalle

| Daten | Intervall | Sichtbarkeit |
|-------|-----------|--------------|
| Bus | 60s | pausiert wenn `document.hidden` |
| Wetter | 15min | pausiert wenn hidden |
| Uhr | 1s | LiveClock |
| Tageslogik | ~30s (DevTime) | Fokus Heute/Morgen aus Wanduhr |

## Admin Bus-Status

● Live · ● Testdaten · ● Offline  
+ Provider, TRIAS/VAO konfiguriert?, letzter Abruf, Fehlerhinweis  
Nur Admin — nie Morning-Dashboard.

## Tablet / Kiosk

- Landscape-Tablet-Klassen (`landscape-tablet:`)
- Große Touchflächen, wenig Scrollen auf Levi
- Birgit bleibt: Bus-Zeit + „Du kommst rechtzeitig an.“ + Wetter + Arbeit
- Heidi: gleiche einfache Struktur, etwas mehr Tageskontext

## Was ohne TRIAS funktioniert

Lokale `[TEST]`-Fahrpläne, intelligente Auswahl, Wetter Open-Meteo,
Offline-Cache, Admin-Konfiguration, Status „Testdaten“.

## Was mit TRIAS funktioniert

Live-Abfahrten, Haltestellen-Suche, Status „Live“ (wenn URL gesetzt).

## Tests

`npm test` — Selection, Provider-Fallback, Relative Day/Mitternacht, Status-Snapshot.
