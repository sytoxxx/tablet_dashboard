# Phase 14 E2E — Coffee Morning ↔ School Jarvis

Kurzer End-to-End-Lauf (ohne neue Features). Branch: `cursor/school-jarvis-phase14-e2e-c828`.

## Setup

| App | Port | ENV |
|-----|------|-----|
| School Jarvis | **43191** | `COFFEE_MORNING_API_TOKEN` + `COFFEE_MORNING_PERSON_ID=levi` |
| Coffee Morning | **43127** | `SCHOOL_JARVIS_BASE_URL=http://127.0.0.1:43191`, `SCHOOL_JARVIS_API_TOKEN` (gleicher Secret), `SCHOOL_JARVIS_SUMMARY_PATH=/api/integrations/coffee/daily-summary` |

Beide `.env.local` (nicht in Git) mit demselben Test-Secret.

## Geprüfte Fälle

| Check | Ergebnis |
|-------|----------|
| SJ gültiger Bearer → `GET …/daily-summary` | **200**, Contract-Keys, `available: false` (leere Learning-Source) |
| SJ ohne Token | **401** `{ error: "unauthorized" }` |
| SJ falscher Token | **401** |
| CM Server-API → SJ (S2S) | SJ-Log: **200** auf `daily-summary`; CM: **503** Envelope `unavailable`, `summary: null` (keine Fake-Schuldaten) |
| CM Pages `/`, `/person/levi|birgit|heidi` | **200**, kein Crash |
| Client-HTML enthält Secret / `SCHOOL_JARVIS_API_TOKEN` / Fake-Exam „Elektrotechnik“ | **nein** |
| Server-Logs (CM + SJ) enthalten Secret / `Bearer <token>` | **nein** |

## Interpretation `available: false`

Ohne Lernpersistenz liefert School Jarvis bewusst `available: false`.  
Coffee Morning mappt das auf die Browser-Envelope `unavailable` und zeigt **keine** School-Jarvis-Karte — korrekt, kein Fake-Fallback.

## Lokal wiederholen

```bash
# Terminal A
cd school-jarvis && cp .env.example .env.local   # Token setzen
npm run dev   # :43191

# Terminal B
# .env.local: gleicher Token als SCHOOL_JARVIS_API_TOKEN, BASE_URL :43191
npm run dev   # :43127

curl -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:43191/api/integrations/coffee/daily-summary?personId=levi"

curl "http://127.0.0.1:43127/api/integrations/coffee/school-summary?personId=levi"
```
