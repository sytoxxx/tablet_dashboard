# Arbeitsplan-Import (Birgit, Heidi)

Zwei Wege, **ein** Speicherpfad: beide erzeugen einen `PlanAnalysisResult` → gemeinsame Vorschau (`plan-preview-editor.tsx`) → `applyPlanDraft` (`src/lib/plan-analysis/apply.ts`) → `person.schedule.entries` (LocalStorage `coffee-morning-data-v2`). Dashboard, Wochenleiste, freie Tage, morgige Dienste, Profil-Auto-Auswahl, Busplanung und Abendansicht lesen ausschließlich diese Einträge.

Einstieg: Einstellungen → KI → Person (Birgit/Heidi) → Arbeitsplan → „Mit ChatGPT importieren“ (Standard) oder „Foto oder PDF“.

## A) Mit ChatGPT importieren (kein KI-Aufruf)

- Parser: `src/lib/plan-analysis/text-import.ts` (deterministisch), UI: `src/components/plan/plan-text-import.tsx`, Anweisung: `text-import-prompt.ts` (Button „ChatGPT-Anweisung kopieren“).
- Format: Kopf `Person: …` / `Monat: Oktober 2026`, dann je Tag eine Zeile `TT.MM.JJJJ | 06:00-12:00 | Arbeit`, `… | Frei`, `Urlaub`, `Krankenstand`, `Unklar`, `22:00-06:00 | Nachtdienst`.
- Erkannt: Datum als `01.10.2026`, `1.10.26`, `2026-10-01`, `1. Oktober 2026`, `Do 01.10.2026`, `01.10.` (Jahr aus Kopf oder Rückfrage), `1 |` (Monat aus Kopf oder Rückfrage); Zeiten `06:00-12:00`, `6:00 – 12:00`, `6-12 Uhr`, `06.00 bis 12.00`, `0600-1200`; Markdown-Tabellen, Aufzählungszeichen, `**fett**`, Windows-Zeilenenden.
- Regeln: keine erfundenen Zeiten/Daten/Personen; **keine Zeile wird still übersprungen** (Fehlerzeile mit Nummer + Korrekturfeld + „Zeile entfernen“); reine Fließtextzeilen ohne Ziffern werden als Hinweis gelistet; fehlende Person → Auswahl; fehlendes Jahr/Monat → gezielte Frage; fehlende Kalendertage des Monats → Warnung; `Unklar`, unbekannte Kürzel, Stunden ohne Minuten („6-12“), Nacht-Zeiten ohne Wort „Nachtdienst“, Wochentag ≠ Datum, Datum außerhalb des Monats, doppelte Tage → „⚠ geprüft“ nötig vor dem Speichern.
- Bereits gespeicherter Monat: Tag-für-Tag-Vergleich (`compareWorkEntries`): neu / unverändert / geändert. Nur **geänderte** Tage verlangen eine Entscheidung („Bestehendes behalten“ / „Neuen übernehmen“, auch „Alle …“); nichts ist vorausgewählt, Speichern bleibt gesperrt, bis alle entschieden sind. Andere Monate und nicht genannte Tage bleiben unberührt.

## B) Foto/PDF

Unverändert die bestehende zweistufige Erkennung (`src/server/ai/*`, `/api/plan/analyze`, Foto-Qualitätsprüfung). In diesem Schritt nur ergänzt: Auswahl der Eingabeart, Tagesübersicht in der Vorschau. **Die Erkennungsqualität wurde nicht neu gemessen** (kein `OPENAI_API_KEY` in der Testumgebung).

## Tests

`text-import.test.ts` (Parser), `text-import-integration.test.ts` (Text → Speichern → Dashboard-Logik/Wochenleiste/Abendansicht/Profilwahl/Busplanung/Vergleich), Browser-Durchlauf siehe Abschlussbericht.
