/**
 * Map Phase-18 picked outfits into Phase-17 OutfitRecommendation shape.
 * Only real wardrobe items become pieces — never invent garments.
 */
import type {
  OutfitBottomCategory,
  OutfitRecommendation,
  OutfitRuleKind,
  OutfitTopCategory,
  ShoeCategory,
} from "@/lib/outfit/types";
import type { PickedOutfit } from "@/lib/wardrobe/pick";
import { perfumeStatus } from "@/lib/wardrobe/pick";

export function pickedOutfitToRecommendation(
  picked: PickedOutfit,
): OutfitRecommendation {
  const realPieces = picked.pieces
    .filter((p) => p.item)
    .map((p) => ({
      label: p.item!.name,
      slot: p.slot,
      category: p.item!.garmentKind,
      fromPreferenceOrWardrobe: true as const,
    }));

  const missing = picked.pieces
    .map((p) => p.missingPrompt)
    .filter((m): m is string => Boolean(m));

  const detailParts = picked.pieces.map((p) =>
    p.item ? p.item.name : (p.missingPrompt ?? p.label),
  );

  let ruleKind: OutfitRuleKind;
  let priority: 1 | 2 | 3 | 4 | 5;
  let wardrobeRequired: boolean;
  let blocksNormalOutfit: boolean;
  let topCategory: OutfitTopCategory | null = null;
  let bottomCategory: OutfitBottomCategory | null = null;
  let shoeCategory: ShoeCategory | null = null;

  switch (picked.mode) {
    case "workshop":
      ruleKind = "mandatory_day";
      priority = 1;
      wardrobeRequired = missing.length > 0;
      blocksNormalOutfit = true;
      topCategory = "workshop-top";
      bottomCategory = "joggers";
      shoeCategory = "comfortable";
      break;
    case "presentation":
      ruleKind = "occasion";
      priority = 2;
      wardrobeRequired = missing.length > 0 || realPieces.length === 0;
      blocksNormalOutfit = true;
      topCategory = "button-t-shirt";
      break;
    case "normal":
      ruleKind = "rotation";
      priority = 5;
      wardrobeRequired = realPieces.length === 0;
      blocksNormalOutfit = false;
      break;
    default:
      ruleKind = picked.weatherNotes.length ? "weather" : "preference";
      priority = picked.weatherNotes.length ? 3 : 4;
      wardrobeRequired = true;
      blocksNormalOutfit = false;
      if (picked.weatherNotes.some((n) => /regen/i.test(n))) {
        shoeCategory = "rain";
      }
      break;
  }

  return {
    ruleKind,
    priority,
    headline: picked.headline,
    topCategory,
    bottomCategory,
    shoeCategory,
    pieces: realPieces,
    wardrobeRequired,
    detail:
      detailParts.length > 0
        ? detailParts.join(" · ")
        : (picked.notes[0] ??
          "Outfit-Empfehlung verfügbar, sobald dein Kleiderschrank eingerichtet ist."),
    notes: [...picked.notes, ...missing],
    blocksNormalOutfit,
  };
}

export function perfumeDetailFromDigital(): string {
  return perfumeStatus(true);
}
