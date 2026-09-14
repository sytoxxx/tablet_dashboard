# Phase 16 — Personal Leave Reminder

Quiet acoustic cue ~3 minutes before each person’s computed `leaveHome`.

## Behavior

- Source of truth: existing `TravelPlan.leaveHome` + morning timeline (`leave_soon`).
- Exactly one soft tone in the window `[leave − 3 min, leave)`.
- No tone at `prepare_soft` (“Langsam fertig werden”) or `leave_now` (“Jetzt losgehen”).
- Deduped by `personId|date|leaveHome` (module-level fired set). New leave time → new key → new cue.
- Audio unlock via profile tile tap (browser autoplay). Failure → no crash; visual cue remains.

## Settings

Personen-Admin: Losgeh-Erinnerung an/aus, Tonstärke clamped to 0.02–0.25 (default on / 0.08).
