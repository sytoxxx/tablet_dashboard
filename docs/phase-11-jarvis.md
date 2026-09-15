# Phase 11 — Jarvis

## Ziel

Jarvis ist die persönliche Assistenzschicht auf der **bestehenden** Morning Overview.

Keine eigene Tages-/Bus-/Wetterlogik. Wahrheit:

```ts
getMorningOverview(personId, date)
overview.summary
```

## askJarvis()

```ts
askJarvis(personId, question, now?, options?) → JarvisResponse
```

Pfad: `src/lib/jarvis/ask.ts`

Ablauf:

1. Intent aus Frage (`classifyJarvisIntent`)
2. `getMorningOverview` (oder übergebenes Overview)
3. `factsFromOverview` → strukturierte Fakten
4. Deterministische Antwort
5. Optional (Server): OpenAI-Formulierung **nur** aus diesen Fakten

## Datenfluss

```
UI /jarvis  oder  zukünftig: Mic → STT
    ↓ question (Text)
askJarvis / POST /api/jarvis/ask
    ↓
getMorningOverview(personId, now, { person, live? })
    ↓
JarvisFacts + deterministicAnswer
    ↓ optional OPENAI_API_KEY
phraseJarvisWithOpenAi(facts only)
    ↓
answer (UI / zukünftig TTS)
```

## Unterstützte Fragen

- Was steht heute an?
- Was muss ich mitnehmen?
- Wann muss ich los?
- Welcher Bus kommt als nächstes?
- Wie wird das Wetter?
- Was habe ich als Nächstes?
- Was ist heute wichtig?
- Wie sieht mein Morgen aus?

Unbekannt / leer → ehrlicher Hinweis, keine erfundenen Fakten.

## Bus-Antworten

| Situation | Beispiel |
|-----------|----------|
| Passend | „Dein nächster passender Bus fährt um 07:32.“ |
| Verspätung | „… voraussichtlich um 07:41. Er hat 9 Minuten Verspätung.“ |
| Ausfall | „Der Bus um 07:32 fällt aus. …“ |
| Testdaten | „… Aktuell sind das Testdaten.“ |

Testdaten werden **nie** als Live bezeichnet.

## AI / Fallback

| Zustand | Verhalten |
|---------|-----------|
| Kein `OPENAI_API_KEY` | nur deterministisch |
| Key + Netz OK | optionale Formulierung |
| Key/Netz Fehler | deterministischer Fallback |

Prompt-Regel: nur `JarvisFacts` + `deterministicAnswer` — keine erfundenen Zeiten.

Env (optional):

```
OPENAI_API_KEY=
OPENAI_JARVIS_MODEL=gpt-4o-mini
```

Nur serverseitig. Nie im Client.

## UI

`/jarvis` — saubere Tablet-Fläche, Personenwahl Levi/Birgit/Heidi, Vorschläge, große Antwort.

Keine Dashboard-Redesigns.

## Offline

- Client ruft zuerst lokal `askJarvis` auf
- API-Fehler → lokale Antwort bleibt
- Fehlende Bus/Wetterdaten → Overview-Offline/Testlogik

## Voice-ready (noch nicht gebaut)

```
Mikrofon → Speech-to-Text → askJarvis(personId, text)
  → answer → Text-to-Speech
```

`JarvisAskInput.question` ist bereits der Text-Einstieg. Kein Mic/STT/TTS in Phase 11.

## Sicherheit

- Key nur in `/api/jarvis/ask`
- Keine Secrets in Responses
- `.env.local` nicht committen

## Tests

`src/lib/jarvis/ask.test.ts` — Intents, Personen, Bus delay/cancel/test, Wetter, leer/unbekannt, AI-Wrapper.

## Dateien

- `src/lib/jarvis/*`
- `src/server/jarvis/phrase.ts`
- `src/app/api/jarvis/ask/route.ts`
- `src/app/jarvis/page.tsx`
- `src/components/jarvis/jarvis-panel.tsx`
- `docs/phase-11-jarvis.md`
