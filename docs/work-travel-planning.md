# Work-travel planning (Birgit & Heidi)

Intelligent morning bus planning driven by each person’s **work schedule**, not by “next bus”.

## Scope

| Person | Behavior |
|--------|----------|
| **Birgit** | Work shifts → latest on-time bus → leave-home + preparation |
| **Heidi** | Own work shifts + own walk/prep/buffer prefs |
| **Levi** | Unchanged — school walk to HTL Kapfenberg, **no** work-travel bus planner |

## Selection rule

Choose the **latest** connection where:

`arrivalAtStop + stopToWorkMinutes + safetyBufferMinutes ≤ workStart`

Also exclude cancelled services; prefer realtime departure times over timetable.

If none fit → status `no-connection` (“Kein passender Bus”) — never present a late bus as the chosen connection.

## Derived times

- **Losgehen** = bus departure − `walkToStopMinutes`
- **Langsam fertig werden** = Losgehen − `preparationMinutes`

## Service

`src/lib/work/travel-planner.ts` → `planWorkTravel(...)`

Used from `/api/bus/departures` for Birgit/Heidi only. Selection helpers live in `src/lib/bus/select.ts` (`workTravelMode`, `requireOnTime`).

## Config (`transitPrefs`)

| Field | Meaning |
|-------|---------|
| `walkToStopMinutes` | Home → start stop |
| `stopToWorkMinutes` | Destination stop → workplace |
| `preparationMinutes` | Get-ready window |
| `safetyBufferMinutes` | Extra slack before work start |
| `leadTimeMinutes` | Ride-duration **heuristic** when no API arrival exists (never invents per-trip times) |

Editable under Einstellungen → Bus for Birgit/Heidi.

## Realtime / offline

- Realtime > schedule (existing provider mapping).
- Delayed/cancelled → re-evaluate remaining candidates.
- `source: "local" | "cache"` → `isTestData: true` (never shown as live).
- No fake TRIAS live data; production without credentials stays on Testdaten / unavailable.

## Tests

`src/lib/work/travel-planner.test.ts` — 16 scenarios covering selection, walks, buffer, prep, cancel/delay, realtime, cache, Levi skip, Birgit≠Heidi prefs, multi-day targets, no fake production labeling.
