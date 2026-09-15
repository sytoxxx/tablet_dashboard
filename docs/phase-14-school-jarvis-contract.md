# Phase 14 — School Jarvis Coffee Morning Contract

Siehe die kanonische Dokumentation in der School-Jarvis-App:

[`school-jarvis/docs/phase-14-coffee-morning-contract.md`](../school-jarvis/docs/phase-14-coffee-morning-contract.md)

Kurz:

- Endpoint: `GET /api/integrations/coffee/daily-summary`
- Auth: Bearer `COFFEE_MORNING_API_TOKEN`
- Coffee Morning setzt denselben Wert als `SCHOOL_JARVIS_API_TOKEN` und `SCHOOL_JARVIS_SUMMARY_PATH=/api/integrations/coffee/daily-summary`
- Default Learning-Source ist leer → `available: false` (keine Fake-Produktivdaten)
