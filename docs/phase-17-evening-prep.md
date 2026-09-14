# Phase 17 — Personal Evening Prep + Outfit Rule Engine

Foundation for “Für morgen vorbereiten” without wardrobe scanning or invented garments.

## Evening Prep

- Builds tomorrow’s plan from shared day intelligence + travel planner (no parallel clock math).
- Sections: context, outfit, shoes, perfume, bag, weather, leave-home time.
- Person-specific checklist (“Alles hergerichtet”) persisted in `localStorage` per person+date.

## Outfit rule priority

1. Mandatory day clothing (e.g. Werkstatt)
2. Occasion (Referat / Präsentation)
3. Weather factors
4. Personal preferences
5. Rotation (when wardrobe exists)

## Levi rules (preferences, not scattered hardcoding)

- **Werkstatt:** Rotes HTL-T-Shirt + Jogginghose + bequeme Schuhe; change at school.
- **Referat:** Button-T-Shirt / gepflegt-casual category only — no invented pieces.
- Normal school day without wardrobe → setup message only.

## Wardrobe foundation

Types only (`WardrobeCatalog` / `WardrobeItem`) for a future phone scanner. No fake items in production flows.

## Unchanged

- Phase-16 leave reminder (3‑minute tone)
- School Jarvis integration
- Levi walking / Birgit & Heidi bus travel
