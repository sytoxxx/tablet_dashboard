# Phase 15 — Personal morning timeline + evening prep foundation

## Morning timeline

Service: `src/lib/morning/timeline.ts` → `buildMorningTimeline`

States are **derived** from each person’s `TravelPlan` (leave / prep / arrival), never hard-coded clocks:

| State | Meaning |
|-------|---------|
| `relaxed` | Before preparation start |
| `prepare_soft` | Langsam fertig werden |
| `prepare_now` | Jetzt fertig machen (midpoint prep→leave) |
| `leave_now` | Jetzt losgehen |
| `en_route` | Should already be on the way |
| `late` / `arrived` | Past arrival window |

Wired into `getMorningOverview` as `timeline` + `visibility.timeline`.

## Persons

| Person | Travel mode | Timeline source |
|--------|-------------|-----------------|
| Levi | `walking` → HTL | Shared planner, **no bus** |
| Birgit | `bus` + work shift | Latest on-time connection |
| Heidi | `bus` + own shift/prefs | Same planner, own times |

## Evening prep foundation

Service: `src/lib/evening/prep.ts` → `buildEveningPrep`

- Title: **Für morgen vorbereiten**
- Bag / weather / morning leave from real data
- Outfit / shoes / perfume: **unavailable** until wardrobe exists (no invention)
- Future types: `WardrobeItem`, `WardrobeCatalog` (scanner not implemented)

Shown when evening tomorrow-focus is active (`DAY_CONFIG.eveningTomorrowHour`).

## Design foundation

`.morning-shell.daypart-evening` — calmer evening palette (not a full dark-mode product switch).

## Tests

`src/lib/morning/timeline.test.ts` — Levi states, no bus, Birgit≠Heidi, multi-day, delay, no-connection, evening prep, overview wiring.
