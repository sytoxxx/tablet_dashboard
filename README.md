# Coffee Morning Dashboard

Minimaler Morgen-Tablet-Dashboard (deutsch) für ein wandmontiertes Android-Tablet neben der Kaffeemaschine.

**Profile:** Levi, Birgit, Heidi

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- AppData v3 in LocalStorage (`coffee-morning-data-v2` key, validated/migrated)

## Lokal starten

```bash
cp .env.example .env.local   # optional: OPENAI_API_KEY für echte Vision-Analyse
npm install
npm run build
npm run start
```

Server: Port **43127** → [http://127.0.0.1:43127](http://127.0.0.1:43127)

Dev: `npm run dev` (gleicher Port).

## Admin

`/einstellungen` — Personen, Pläne (Wocheneditor), Aufgaben, Bus, Kalender, Kaffee, Import/Export, KI, System. Getrennt vom Morning-Home.

## KI

- Route: `/api/plan/analyze` (Keys nur Backend/env)
- Ohne `OPENAI_API_KEY`: Mock
- Flow: Foto → Analyse → Draft → Edit → Konflikte → Confirm → Save (nie auto-replace)
- Offline: gespeicherte Daten + Banner „Offline – zuletzt gespeicherte Daten“; KI graceful deaktiviert

## Phasen

1–4: Home, Datenmodell, Plan-KI, Tageslogik  
5: Admin-CRUD, Wocheneditor, Konflikte, Backup/Import, Offline, Display-Prefs  
6: Premium Tablet UX — personenspezifische Morning-Layouts, relative Zeiten, Kiosk-Polish  
7: Bus (Verbund Steiermark / VAO / optional WL) + Open-Meteo Wetter (Kapfenberg) + Arbeits-Vorlauf  
8: Real-world ready — Live/Test/Offline, visibility-aware Polling, Landscape  
9: Intelligent Daily / Smart Morning Engine — `getMorningOverview`, Mitnehmen-Regeln, Bus Echtzeit/Fahrplan, Summary für Jarvis  
10: TRIAS-Integration vorbereitet — Parser/Fixtures, ENV-Fallback Testdaten, Admin Status (Zugang ausstehend)  
11: Jarvis — `askJarvis()` auf Morning Overview, `/jarvis` UI, AI-Formulierung optional  
12: School Jarvis Integration Contract — `SchoolJarvisDailySummary`, Stub-API, Validierung (keine echte Verbindung)
13: Echte School-Jarvis-Integration — Server-to-server, Cache, Levi-Karte, Handoff (keine Rohdaten-Spiegelung)
14: School Jarvis Contract-Endpoint — `GET /api/integrations/coffee/daily-summary` (Bearer), siehe `school-jarvis/`
14-E2E: Live-Integrationstest CM ↔ SJ — `docs/phase-14-e2e-integration.md`
Work-Travel: Birgit/Heidi arbeitszeitbasierte Busplanung — `docs/work-travel-planning.md`
15: Personal Morning Timeline + Evening Prep Foundation — `docs/phase-15-morning-timeline.md`
16: Personal Leave Reminder — ein leiser Ton ~3 Min. vor Losgehen — `docs/phase-16-leave-reminder.md`

Details: `school-jarvis/docs/phase-14-coffee-morning-contract.md`
