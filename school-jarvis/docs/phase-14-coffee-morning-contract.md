# School Jarvis — Coffee Morning Integration (Phase 14)

School Jarvis und Coffee Morning bleiben **zwei getrennte Anwendungen**.  
School Jarvis ist Eigentümer aller Schul-/Lerndaten und stellt Coffee Morning nur einen kleinen Daily-Summary-Contract bereit.

## Endpoint

```http
GET /api/integrations/coffee/daily-summary?personId=levi&focusDate=YYYY-MM-DD
Authorization: Bearer <COFFEE_MORNING_API_TOKEN>
```

**Response:** `SchoolJarvisDailySummary` (JSON), aligned with Coffee Morning Phase 12/13:

```ts
{
  available: boolean
  personId: "levi" | "birgit" | "heidi"
  focusDate: string // YYYY-MM-DD
  nextExam: { subject, date, daysUntil } | null
  today: { recommendedStudyMinutes, recommendation } | null
  learning: { weakTopics: string[], dueFlashcards: number } | null
  action: { label: "Jetzt lernen", target: "recommended-learning" } | null
}
```

Hinweis: `learning.weakTopics` ist ein **String-Array** (Topic-Labels), wie von Coffee Morning erwartet — nicht eine Zahl.

## Auth

- Serverseitig: `Authorization: Bearer …`
- Secret nur in ENV: `COFFEE_MORNING_API_TOKEN`
- Token wird nicht geloggt und nie an den Browser gegeben
- Fehlendes/falsches Token → **401**
- Token in School Jarvis nicht konfiguriert → **503** `{ available: false }`

## ENV

| Variable | Pflicht | Default | Bedeutung |
|----------|---------|---------|-----------|
| `COFFEE_MORNING_API_TOKEN` | ja | — | Shared Bearer-Secret mit Coffee Morning (`SCHOOL_JARVIS_API_TOKEN`) |
| `COFFEE_MORNING_PERSON_ID` | nein | `levi` | Welche Coffee-Person bedient wird |

## Datenquellen (aktueller Stand)

In diesem Repo existierte zuvor **kein** vollständiges School-Jarvis-Lernmodell (keine Prüfungen-/Karteikarten-/Fehler-Persistenz).

Phase 14 führt deshalb ein schlankes `LearningDataSource`-Interface ein:

| Signal | Ableitung |
|--------|-----------|
| `nextExam` | frühester Exam-Eintrag mit `date >= focusDate` |
| `dueFlashcards` | Anzahl Karten mit `dueDate <= focusDate` |
| `weakTopics` | Distinct Topic-Labels aus bestehenden Fehler-/Learning-Signalen |
| `today` | Gespeicherte Empfehlung für `focusDate`, sonst konservativer Fallback **nur** wenn reale Signale (fällige Karten / schwache Themen) existieren |

**Default-Source:** leer (`EmptyLearningDataSource`) → `{ available: false, … null }` — **keine Fake-Produktivdaten**.

Später: echte School-Jarvis-Persistenz hinter dasselbe Interface hängen (ohne Contract-Änderung).

## Fehlerfälle

| Fall | HTTP | Body |
|------|------|------|
| Token fehlt/falsch | 401 | `{ error: "unauthorized" }` |
| Token-ENV fehlt | 503 | `{ available: false }` |
| Store leer / keine Signale | 200 | Summary mit `available: false` |
| Store temporär down | 200 | Summary mit `available: false` |
| Andere Person als Integration-Person | 200 | `available: false` (keine Fremddaten) |

## Coffee Morning Nutzung

Coffee Morning (Phase 13) ruft serverseitig auf:

```
SCHOOL_JARVIS_BASE_URL=http://127.0.0.1:43191
SCHOOL_JARVIS_API_TOKEN=<gleicher Wert wie COFFEE_MORNING_API_TOKEN>
SCHOOL_JARVIS_SUMMARY_PATH=/api/integrations/coffee/daily-summary
```

Browser → Coffee Morning API → School Jarvis (Bearer) → nur Summary.

## Lokal starten

```bash
cd school-jarvis
cp .env.example .env.local
# COFFEE_MORNING_API_TOKEN setzen
npm install
npm run dev   # Port 43191
```

## Tests

```bash
cd school-jarvis && npm test && npm run lint && npm run build
```
