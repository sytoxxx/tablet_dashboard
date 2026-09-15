# Phase 12 — School Jarvis Integration Contract

Coffee Morning und School Jarvis bleiben **zwei getrennte Anwendungen**. Diese Phase definiert ausschließlich den stabilen Integrationsvertrag für spätere School-Jarvis-Daten.

**Noch nicht enthalten:**

- direkte Supabase-Verbindung
- Datenbanktabellen-Änderungen
- Authentifizierung zwischen den Apps
- echter Cross-App-Request
- Änderungen an der Morning Engine
- neue School-Jarvis-Features

## Verantwortlichkeiten

| System | Verantwortung |
|--------|----------------|
| **Coffee Morning** | Persönliches Daily Dashboard: Morgen, Bus, Wetter, Kaffee, Termine, Tagesfokus. School-Jarvis-Daten nur **anzeigen**. |
| **School Jarvis** | Schule, Lernen, Prüfungen, Lernfortschritt, Fehler, Karteikarten, Lernempfehlungen, Dokumente, Lernhistorie. |

Coffee Morning darf aus School-Jarvis-Daten **keine eigene Lernlogik** berechnen und **nichts doppelt speichern**.

## Single Source of Truth

School Jarvis bleibt allein verantwortlich für:

- Prüfungen
- Lernfortschritt
- Fehler
- Karteikarten
- Empfehlungen
- Lernhistorie

Coffee Morning konsumiert nur die fertige `SchoolJarvisDailySummary`. Keine lokale Ableitung von „was lernen?“ oder Session-Erzeugung.

## SchoolJarvisDailySummary

Kleines TypeScript-Modell (`src/lib/integrations/school-jarvis/types.ts`):

```ts
type SchoolJarvisDailySummary = {
  available: boolean;
  personId: "levi" | "birgit" | "heidi";
  focusDate: string; // YYYY-MM-DD
  nextExam: {
    subject: string;
    date: string; // YYYY-MM-DD
    daysUntil: number;
  } | null;
  today: {
    recommendedStudyMinutes: number;
    recommendation: string;
  } | null;
  learning: {
    weakTopics: string[];
    dueFlashcards: number;
  } | null;
  action: {
    label: string;
    target: string; // opaque, z. B. "recommended-learning"
  } | null;
};
```

Null-Blöcke bedeuten „nicht vorhanden“, nicht „Fehler“.

## API Contract

Geplanter Endpunkt:

```http
GET /api/integrations/coffee/school-summary?personId=levi&focusDate=2026-09-14
```

**Antwort-Envelope** (`SchoolJarvisSummaryResponse`):

```ts
// Erfolg
{ ok: true, source: "school-jarvis" | "stub", summary: SchoolJarvisDailySummary }

// Nicht verfügbar / ungültig — keine Fake-Daten
{
  ok: false,
  unavailable: true,
  message: "School Jarvis momentan nicht verfügbar.",
  summary: null
}
```

In Coffee Morning existiert derzeit nur ein **Stub**:

- Route: `src/app/api/integrations/coffee/school-summary/route.ts` → HTTP 503 + Envelope
- Client: `fetchSchoolJarvisDailySummary()` → immer unavailable
- Validierung: `validateSchoolJarvisDailySummary()` / `acceptSchoolJarvisPayload()`
- Beispiele: `exampleFullSummary`, `exampleNoExam`, …

## „Jetzt lernen“ Action

Neutrales Action-Format:

```json
{
  "label": "Jetzt lernen",
  "target": "recommended-learning"
}
```

Coffee Morning kennt nur `label` + opaque `target`. Wie die Lernsession intern entsteht, entscheidet später ausschließlich School Jarvis (`recommended-learning` → passende Session).

## Fehler / Nicht verfügbar

Wenn School Jarvis nicht erreichbar ist oder die Payload ungültig ist:

- Coffee Morning bleibt stabil.
- Keine Fake-Lern-/Prüfungsdaten (`summary: null`).
- UI-Hinweis: **„School Jarvis momentan nicht verfügbar.“**
- Karte nur zeigen, wenn `shouldShowSchoolJarvisCard(response)` → `ok && summary.available`.

## Geplantes Sicherheitsmodell (Design only)

```
Coffee Morning (authentifizierter User/Session)
  → authentifizierter Request
  → School Jarvis Integration API
  → nur erlaubte Summary-Daten (SchoolJarvisDailySummary)
  → keine Service-Role-Keys im Client
```

Noch **keine** echte Auth-Implementierung. Geplant:

- serverseitiger Aufruf von Coffee Morning → School Jarvis
- scoped Integration-Token oder User-gebundenes Token
- Least Privilege: nur Daily-Summary-Felder
- keine Supabase Service-Role im Browser

## Spätere Supabase-Integration

Wenn beide Apps denselben Identity-/Datenraum nutzen:

1. School Jarvis schreibt/liest Lern- und Prüfungsdaten in **seinen** Tabellen.
2. School Jarvis stellt die Integration API bereit (oder eine View/Function nur für Summary).
3. Coffee Morning ruft nur die Summary-API auf und cached ggf. kurzzeitig **nur die Summary**, nicht Rohdaten.
4. Keine doppelte Persistenz von Prüfungen, Karten oder Fehlern in Coffee Morning.

## Implementierte Dateien (Phase 12)

| Datei | Rolle |
|-------|--------|
| `src/lib/integrations/school-jarvis/types.ts` | Vertragstypen |
| `src/lib/integrations/school-jarvis/validate.ts` | Payload-Validierung |
| `src/lib/integrations/school-jarvis/examples.ts` | Beispiel-Payloads |
| `src/lib/integrations/school-jarvis/client.ts` | Stub-Client + Accept-Hilfe |
| `src/lib/integrations/school-jarvis/index.ts` | Public exports |
| `src/app/api/integrations/coffee/school-summary/route.ts` | Stub-Route |
| `src/lib/integrations/school-jarvis/school-jarvis-contract.test.ts` | Contract-Tests |

## Offene Punkte (später)

- Echter HTTP-Client zu School Jarvis
- Auth zwischen den Apps
- UI-Karte im Dashboard (nur anzeigen, keine Lernlogik)
- Deep-Link / Handoff für `action.target`
- Kurzer Summary-Cache ohne Rohdaten-Spiegelung
