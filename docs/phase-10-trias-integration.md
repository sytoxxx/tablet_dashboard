# Phase 10 — Echte TRIAS-Integration

## Status Zugang

Offizieller TRIAS-OGD-Endpunkt von der Verbund Linie:

`http://ogdtrias.verbundlinie.at:8183/stv/trias`

- `BUS_PROVIDER=auto` belassen
- Noch keine produktiven StopPointRefs für Heidi/Birgit gesetzt
- Connectivity-Probe: `src/server/bus/trias/connectivity.ts` (serverseitig, Timeout, keine XML-/Secret-Logs)
- Ohne StopPointRef → weiterhin `isTestData: true` / lokale Testdaten

## Benötigte ENV

```bash
BUS_PROVIDER=auto
VERBUND_STEIERMARK_TRIAS_URL=http://ogdtrias.verbundlinie.at:8183/stv/trias
VERBUND_STEIERMARK_REQUESTOR_REF= # optional, Default OpenService
```

`.env.local` nicht committen (steht in `.gitignore`).

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

Bei `BUS_PROVIDER=auto` und gesetzter `VERBUND_STEIERMARK_TRIAS_URL`: zuerst TRIAS `LocationInformationRequest`.

Steiermark-Antworten nutzen oft `trias:`-Namespaces und `LocationName` als Ort (ohne `LocalityName`). Der Parser akzeptiert beides und erfindet keine IDs.

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

Admin: Einstellungen → Bus (`StopSearchField`) oder `node scripts/probe-trias-stops.mjs` (nur strukturiertes JSON).

Ohne Zugang: keine erfundenen Treffer, manuelle Admin-Eingabe.

## TripRequest (noch nicht produktiv)

Experimentell bestätigt am OGD-Endpunkt (`scripts/probe-trias-routes.mjs`):

- TimedLeg / ContinuousLeg (Fußweg) / Umstiege
- Heidi Europaplatz → Apfelmoar Einkaufszentrum: Linie 1 direkt
- Birgit: kein TRIAS-POI „Pflegeverband“; Altersheimgasse nur Zwischenhalt

Siehe `docs/trias-route-research-heidi-birgit.md`. **Nicht** in Provider/Dashboard verdrahtet.

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

`src/server/bus/trias/connectivity.test.ts` — HTTP-Vertrag + Probe:

- offizieller Endpoint, `Content-Type: text/xml`, `IncludeRealtimeData=true`
- keine Secrets / kein volles XML in Log-Summaries
- Timeout- und 401/403-Fälle
- Live-Probe gegen den echten Endpunkt (nur strukturiertes Ergebnis)

## Dateien

- `src/server/bus/trias/*` (inkl. `http.ts`, `connectivity.ts`)
- `src/server/bus/verbund-steiermark.ts` / `-search.ts`
- `src/server/bus/types.ts`, `status.ts`
- `src/lib/bus/select.ts`, `src/lib/types.ts`
- `src/hooks/use-bus-live.ts`
- `src/app/api/bus/departures/route.ts`
- `docs/phase-10-trias-integration.md`
