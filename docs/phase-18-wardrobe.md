# Phase 18 — Personal Digital Wardrobe + Phone Import

First real digital wardrobe for Coffee Morning. Photo/manual import with **confirm-only** save, real outfit picking for Evening Prep, and person-scoped LocalStorage.

## Wardrobe data model

`src/lib/wardrobe/model.ts` — `WardrobeItem` / `WardrobeCatalog` / `WardrobeImportDraft`

- Structured color + brightness (`light` | `dark` | `neutral` | `unknown`)
- Garment kinds: T-Shirt, Button-T-Shirt, Polo, Hemd, Pullover, Hoodie, Jacke, Hose, Jeans, Jogginghose, Shorts, Schuhe, sonstiges
- Unknown attributes stay `unknown` / `null` — never invented as confident facts
- Optional tags (e.g. `htl`) for workshop matching

## Phone import

Route: `/person/[id]/kleiderschrank`

Flow: list → choose (camera/file **or** manual) → suggestion → edit → **Speichern**

- Camera is never auto-opened
- Vision analysis is optional (`analyzeGarmentImage`); default is unavailable
- Without vision, `suggestionShellAfterPhoto` + manual fields still work
- Drafts are never persisted until `confirmSaveWardrobeItem`

## Outfit rules (real items only)

`pickOutfitForDay` priority:

1. Workshop (Levi) — match preference labels to real items; otherwise show “Füge es deinem Kleiderschrank hinzu”
2. Presentation / Referat — prefer Button-T-Shirt / Polo from wardrobe
3. Normal day — rotation + weather scoring (last worn, wear count, rain, warmth, brightness)

Special rules override rotation. No fake garments, shoes, or perfume.

## Evening Prep

`buildEveningPrep({ digitalWardrobe })` uses real picks when a digital catalog is supplied.

UI: **Vorbereiten** / **Anderes Outfit** / **Getragen** (updates `lastWornIso` + `wearCount`).

Perfume stays: “Parfum noch nicht eingerichtet.”

## Persistence & privacy

- LocalStorage key `coffee-morning-wardrobe-v1:{personId}`
- Person isolation (Levi ≠ Birgit ≠ Heidi)
- No photo persistence; no base64 in logs (`sanitizeWardrobeErrorMessage`)

## Unchanged

- School Jarvis
- Phase-16 leave reminder
- Morning timeline / travel / bus logic

## Verify

```bash
npm test
npm run lint
npm run build
npm run dev   # port 43127
```

Branch: `cursor/coffee-morning-phase18-wardrobe-c828`
