# Phase 10 — Echte TRIAS-Integration

## Status Zugang

TRIAS-Zugang wurde bei der Verbund Linie angefragt (`ogdtrias@verbundlinie.at`).  
**Zugangsdaten liegen noch nicht vor.**

Deshalb:

- Keine erfundenen URLs, RequestorRefs oder StopPointRefs
- Ohne ENV → `isTestData: true`, nie als Live
- Parser/Requests sind spezifikationsbasiert vorbereitet und mit Fixtures getestet

## Benötigte ENV

```bash
BUS_PROVIDER=auto
VERBUND_STEIERMARK_TRIAS_URL=     # von Verbund Linie nach Vereinbarung
VERBUND_STEIERMARK_REQUESTOR_REF= # optional, Default OpenService
```

Platzhalter nur in `.env.example`. Niemals `.env.local` committen.

## TRIAS Provider

`VerbundSteiermarkBusProvider` (`src/server/bus/verbund-steiermark.ts`)

| Fall | Verhalten |
|------|-----------|
| URL fehlt | lokale Testdaten, `isTestData` |
| StopPointRef fehlt | lokale Testdaten |
| HTTP/Timeout/leere Antwort | Fallback Testdaten + Warning |
| Erfolg | `source: live`, geparste Abfahrten |

Requests (FAQ-konform):

- `StopEventRequest` mit `<Params>` (nicht `StopEventParam`)
- `LocationInformationRequest` für Haltestellensuche
- `IncludeRealtimeData: true`
- Timeout 8s

Parser: `src/server/bus/trias/parse-stop-events.ts`  
Dokumentierte Felder (VDV 431 / Mentz TRIAS 1.2):

- `TimetabledTime` → planned
- `EstimatedTime` → realtime (wenn vorhanden: **Echtzeit > Fahrplan**)
- `Service/Cancelled`, `NotServicedStop` → cancelled
- Delay = Differenz Estimated − Timetabled (nur wenn beide vorhanden)

Status-Normalisierung: `PLANNED | REALTIME | DELAYED | CANCELLED | UNKNOWN`

## Haltestellensuche

`GET /api/bus/stops?q=…`

Wenn TRIAS konfiguriert: `LocationInformationRequest` →

```json
{
  "id": "<originale StopPointRef>",
  "name": "…",
  "locality": "…",
  "latitude": 47.44,
  "longitude": 15.29,
  "provider": "verbund-steiermark"
}
```

Ohne Zugang: keine erfundenen Treffer, manuelle Admin-Eingabe.

## Abfahrten & Morning Engine

`selectRelevantDeparture` (Phase 9):

1. Ausgefallene Verbindungen überspringen  
2. Effektive Zeit = Realtime falls vorhanden  
3. Sonst Fahrplan, als schedule/test markiert  
4. Lead-Time vs. Ankunft/Schicht → rechtzeitig / zu spät  

`getMorningOverview` konsumiert weiterhin `BusInfo` (Abfahrt, Delay, Cancel, isTestData).

## Cache / Offline

Client (`use-bus-live`):

- Bei Fehler/Offline: letzte gültige Daten behalten
- Nested `BusInfo.source` → `"cache"`, `isRealtime: false`, `isTestData: true`
- Veraltete Daten **nicht** als Live ausgeben
- `fetchedAt` + Datenalter in UI/Admin

## Admin Status

`GET /api/bus/status` → Live / Testdaten / Offline  

Felder: Provider, TRIAS/VAO konfiguriert?, letzter Abruf, `dataAgeLabel`, Fehlerhinweis.  
Keine Secrets.

## Einrichtung nach Zugang

1. URL (+ optional RequestorRef) in `.env.local` setzen  
2. Server neu starten  
3. Admin → Bus: Status sollte „Live“ (fähig) zeigen  
4. Haltestellen suchen, **echte** StopPointRefs speichern  
5. Pro Person: Start, Ziel, Ankunft, Vorlauf, Linie prüfen  
6. Optional: eine echte Response als Fixture ergänzen (TODO im Parser)

## Tests

`src/server/bus/trias/parse.test.ts` — Fixtures ohne Credentials:

- geplante / Echtzeit / Delay / Cancel / NotServiced  
- nächste Verbindung nach Ausfall  
- Realtime macht Lead-Time zu spät  
- Location-Parse inkl. Geo  
- fehlende ENV → Testdaten  

## Dateien

- `src/server/bus/trias/*`
- `src/server/bus/verbund-steiermark.ts` / `-search.ts`
- `src/server/bus/types.ts`, `status.ts`
- `src/lib/bus/select.ts`, `src/lib/types.ts`
- `src/hooks/use-bus-live.ts`
- `src/app/api/bus/departures/route.ts`
- `docs/phase-10-trias-integration.md`
