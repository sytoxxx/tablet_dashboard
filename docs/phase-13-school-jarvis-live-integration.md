# Phase 13 — Echte School-Jarvis-Integration

Coffee Morning und School Jarvis bleiben **zwei getrennte Anwendungen**. Phase 13 verbindet den Phase-12-Contract über eine **serverseitige** Integration.

## Architektur

```
Coffee Morning Browser
  → GET /api/integrations/coffee/school-summary  (Coffee Morning)
    → Authorization: Bearer SCHOOL_JARVIS_API_TOKEN
    → School Jarvis Integration API
      → School Jarvis Daten/Logik
```

- Kein direkter Browser-Aufruf zu School Jarvis
- Keine Tokens / Service-Role-Keys im Client
- Keine doppelte Lernlogik, keine doppelte Speicherung von School-Rohdaten

## Server-to-server Verbindung

| Modul | Rolle |
|-------|--------|
| `src/server/school-jarvis/config.ts` | ENV lesen, Allowed Persons, Handoff-URL |
| `src/server/school-jarvis/remote.ts` | HTTP GET + Auth-Header + Timeout |
| `src/server/school-jarvis/cache.ts` | Kurzzeit-Cache **nur** für `SchoolJarvisDailySummary` |
| `src/lib/integrations/school-jarvis/client.ts` | Orchestrierung: Gate → Cache → Remote → Validierung |
| `src/app/api/integrations/coffee/school-summary/route.ts` | Browser-facing API |

## ENV

In `.env.local` (Platzhalter in `.env.example`):

| Variable | Pflicht | Bedeutung |
|----------|---------|-----------|
| `SCHOOL_JARVIS_BASE_URL` | ja* | Basis-URL von School Jarvis |
| `SCHOOL_JARVIS_API_TOKEN` | ja* | Bearer-Token (nur Server) |
| `SCHOOL_JARVIS_SUMMARY_PATH` | nein | Default `/api/integrations/coffee/school-summary` |
| `SCHOOL_JARVIS_HANDOFF_URL` | nein | Template mit `{target}` `{personId}` `{focusDate}` |
| `SCHOOL_JARVIS_ALLOWED_PERSONS` | nein | Default `levi` |
| `SCHOOL_JARVIS_TIMEOUT_MS` | nein | Default `4000` |
| `SCHOOL_JARVIS_CACHE_TTL_MS` | nein | Default `90000` |

\*Ohne BASE_URL **und** TOKEN → Integration unavailable, **keine Fake-Daten**, Karte bleibt weg.

## Auth

Einfacher persönlicher Integrationsmechanismus:

1. Coffee Morning Server liest `SCHOOL_JARVIS_API_TOKEN`
2. Outbound-Request: `Authorization: Bearer …` + `X-Coffee-Morning-Person: levi`
3. School Jarvis prüft Token und liefert nur Summary-Felder
4. Browser sieht nur die validierte Summary (+ optionale `handoffUrl`)

Keine Enterprise-Auth, keine Credentials in Git.

## Summary & Validierung

Antwort von School Jarvis wird strikt gegen `SchoolJarvisDailySummary` validiert.

Zusätzlich:

- `personId` muss zur angefragten Person passen (kein Fremddaten-Leak)
- `available: false` → Karte ausblenden
- ungültige Payload → loggen, unavailable, keine Anzeige

## Cache

- In-Memory, Key `personId:focusDate`
- TTL konfigurierbar
- **Nur** die kleine Summary
- **Nicht** gecacht: Dokumente, Fehler, Lernhistorie, Karteikarten-Inhalte

Bei Miss/Ablauf → erneuter School-Jarvis-Call.

## Dashboard-Karte (Levi)

- Komponente: `SchoolJarvisSection`
- Nur im `LeviMorningDashboard`
- Hook: `useSchoolJarvisLive("levi")` → Coffee-API (nicht School Jarvis direkt)
- Birgit / Heidi: UI-Gate + Server-403/unavailable, **kein** Remote-Call

Anzeige nur bei valider `available`-Summary. Keine technischen Fehlertexte auf dem Morning-Dashboard.

## „Jetzt lernen“ Handoff

Action bleibt opaque:

```json
{ "label": "Jetzt lernen", "target": "recommended-learning" }
```

Coffee Morning Server löst `handoffUrl` aus `SCHOOL_JARVIS_HANDOFF_URL` (oder Default `{BASE}/learn?target=…`).  
Klick öffnet School Jarvis — **keine** Lernsession in Coffee Morning.

## Fehlerverhalten

| Situation | Ergebnis |
|-----------|----------|
| ENV fehlt | 503 unavailable, Karte weg |
| Timeout / 5xx / 404 | unavailable, Karte weg |
| Auth 401/403 | unavailable (keine Token-Details an UI) |
| Ungültige Payload | log + unavailable |
| Person nicht erlaubt | 403 / unavailable, kein Remote-Call |

Coffee Morning (Bus, Wetter, Morning Engine, …) läuft unverändert weiter.

## Multi-User später

- `SCHOOL_JARVIS_ALLOWED_PERSONS=levi,heidi,…`
- UI-Gate (`isSchoolJarvisUiPerson`) parallel erweitern
- Mapping Coffee-Person ↔ School-Jarvis-User bleibt Aufgabe von School Jarvis / Token-Scope

## Was du konfigurieren musst

1. School Jarvis Integration-Endpoint bereitstellen (Contract Phase 12)
2. Token erzeugen und in Coffee Morning `.env.local` setzen
3. Optional `SCHOOL_JARVIS_HANDOFF_URL` auf die echte Learn-URL setzen
4. Dev-Server neu starten

## Offene Punkte

- Shared identity / Supabase später (weiterhin getrennte Apps)
- Längerer Cache / stale-while-revalidate
- Deep-Link-Protokoll feiner abstimmen mit School Jarvis
- UI-Person-Gate dynamisch aus Server-Config spiegeln (ohne Secrets)
