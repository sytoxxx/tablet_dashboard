# Vercel deployment (Coffee Morning)

Prepare the Next.js App Router project for a **free Vercel** deploy from GitHub.
This document does **not** perform the deploy — configure the project in the Vercel UI when ready.

## Compatibility notes

- Next.js 16 (App Router) + Node.js serverless Route Handlers (`export const runtime = "nodejs"`).
- No persistent filesystem writes; app data stays in the browser (`localStorage`).
- Private gate: HttpOnly session cookie + server-side access code check.
- Live Verbund Steiermark TRIAS is fetched **only on the server** at request time (no bus dumps in the repo).
- TRIAS OGD uses HTTP on port 8183 — Vercel serverless must be allowed to egress to that host/port.

## Connect GitHub → Vercel

1. Push a feature branch (e.g. `cursor/vercel-private-access-c828`) to `sytoxxx/tablet_dashboard`.
2. In Vercel: Import the GitHub repo.
3. Framework preset: **Next.js** (auto-detected).
4. Root directory: repository root (not `school-jarvis/`).
5. Build command: `npm run build` · Output: Next default.
6. Do **not** merge to `main` until you intentionally promote.

## Environment variables (Vercel Project Settings)

Never commit `.env` or `.env.local`. Set values only in Vercel (Production / Preview as needed).

### Secrets (server-only — never `NEXT_PUBLIC_*`)

| Name | Required | Purpose |
|------|----------|---------|
| `COFFEE_MORNING_ACCESS_CODE` | **Yes** for private access | Tablet Zugangscode (checked only on the server) |
| `COFFEE_MORNING_SESSION_SECRET` | Recommended | HMAC key for session cookies (if unset, derived from the access code) |
| `OPENAI_API_KEY` | Optional | Vision / Jarvis phrasing |
| `VAO_API_KEY` | Optional | VAO START key |
| `SCHOOL_JARVIS_API_TOKEN` | Optional | School Jarvis server-to-server token |

### Public / non-secret configuration (still server-only unless prefixed `NEXT_PUBLIC_`)

| Name | Notes |
|------|-------|
| `VERBUND_STEIERMARK_TRIAS_URL` | Official OGD URL may be documented in `.env.example` |
| `VERBUND_STEIERMARK_REQUESTOR_REF` | Usually `OpenService`; treat as private if the provider issued a custom value |
| `BUS_PROVIDER` | e.g. `auto` |
| `VAO_BASE_URL` | Provider-issued base URL |
| `WEATHER_PROVIDER` | e.g. `open-meteo` |
| `OPENAI_PLAN_MODEL` / `OPENAI_JARVIS_MODEL` | Model ids |
| `SCHOOL_JARVIS_BASE_URL` / `SCHOOL_JARVIS_*` | Integration knobs (token stays secret) |

### Do not put in Git or client bundles

- Real access codes, API keys, tokens
- Live TRIAS response dumps
- `.env` / `.env.local`

## Auth model

1. Browser opens the site → middleware redirects to `/zugang` without a valid session.
2. User submits Zugangscode → `POST /api/auth/login` verifies **server-side** → HttpOnly cookie (`cm_session`, `SameSite=Lax`, `Secure` in production, ~30 days).
3. Home shows **Wer bist du?** (Levi / Birgit / Heidi) — person choice is separate from device access.
4. Private APIs (`/api/bus/*`, `/api/jarvis/*`, `/api/integrations/*`, `/api/weather`, `/api/plan/*`) return **401** without a session.

## Local development

```bash
cp .env.example .env.local
# set COFFEE_MORNING_ACCESS_CODE=… (your private code)
# set VERBUND_STEIERMARK_TRIAS_URL=… (see .env.example)
npm install
npm run dev
```

Open [http://127.0.0.1:43127/zugang](http://127.0.0.1:43127/zugang).

## Checklist before first Vercel deploy

- [ ] GitHub branch pushed (no secrets in tree)
- [ ] All required env vars set in Vercel
- [ ] `COFFEE_MORNING_ACCESS_CODE` set to a strong private value
- [ ] Smoke: unauthenticated `/api/bus/departures` → 401
- [ ] Smoke: login → person picker → Heidi/Birgit live bus after auth
