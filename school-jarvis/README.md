# School Jarvis

Getrennte Lern-/Schul-App. Phase 14 stellt den **Coffee Morning Integration Contract** bereit.

Coffee Morning bleibt eine eigene Anwendung und greift **nicht** auf interne School-Jarvis-Tabellen zu.

## Lokal

```bash
cd school-jarvis
cp .env.example .env.local
npm install
npm run dev
```

Port **43191** → [http://127.0.0.1:43191](http://127.0.0.1:43191)

## Integration Endpoint

`GET /api/integrations/coffee/daily-summary`  
Auth: Bearer `COFFEE_MORNING_API_TOKEN`  
Docs: `docs/phase-14-coffee-morning-contract.md`

## Qualität

```bash
npm test
npm run lint
npm run build
```
