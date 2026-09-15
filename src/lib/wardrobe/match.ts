/**
 * Match preference labels / garment kinds to real wardrobe items.
 * Never invents items — returns null / prompt when missing.
 */
import type { OutfitPieceSuggestion } from "@/lib/outfit/types";
import type { WardrobeCatalog, WardrobeItem } from "@/lib/wardrobe/model";
import type { WardrobeGarmentKind, WardrobeSlot } from "@/lib/wardrobe/taxonomy";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function scoreItemAgainstLabel(
  item: WardrobeItem,
  label: string,
): number {
  if (!item.active) return -1;
  const nLabel = normalize(label);
  const nName = normalize(item.name);
  let score = 0;
  if (nName === nLabel) score += 100;
  if (nName.includes(nLabel) || nLabel.includes(nName)) score += 40;
  for (const tag of item.tags) {
    if (nLabel.includes(normalize(tag))) score += 25;
  }
  if (/htl/.test(nLabel) && (item.tags.includes("htl") || /htl/.test(nName))) {
    score += 50;
  }
  if (/rot|red/.test(nLabel) && item.color === "red") score += 30;
  if (/jogging|jogger/.test(nLabel) && item.garmentKind === "joggers") score += 30;
  if (/button|knopf/.test(nLabel) && item.garmentKind === "button-t-shirt") {
    score += 30;
  }
  if (/polo/.test(nLabel) && item.garmentKind === "polo") score += 30;
  if (/bequem|comfort|entspannt/.test(nLabel) && item.comfort === "high") {
    score += 15;
  }
  if (/schuh|sneaker|shoe/.test(nLabel) && item.garmentKind === "shoes") {
    score += 25;
  }
  if (/schuh|sneaker|shoe/.test(nName) && item.garmentKind === "shoes") {
    score += 10;
  }
  return score;
}

export function findBestMatchingItem(
  catalog: WardrobeCatalog | null | undefined,
  label: string,
  slot?: WardrobeSlot,
): WardrobeItem | null {
  if (!catalog || catalog.items.length === 0) return null;
  let best: WardrobeItem | null = null;
  let bestScore = 0;
  for (const item of catalog.items) {
    if (!item.active) continue;
    if (slot && item.slot !== slot) continue;
    const score = scoreItemAgainstLabel(item, label);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return bestScore >= 25 ? best : null;
}

export function findByGarmentKinds(
  catalog: WardrobeCatalog | null | undefined,
  kinds: WardrobeGarmentKind[],
  slot?: WardrobeSlot,
): WardrobeItem[] {
  if (!catalog) return [];
  return catalog.items.filter(
    (i) =>
      i.active &&
      kinds.includes(i.garmentKind) &&
      (!slot || i.slot === slot),
  );
}

export type PreferenceMatchResult = {
  item: WardrobeItem | null;
  /** Prompt when preference exists but wardrobe item is missing. */
  missingPrompt: string | null;
  preferenceLabel: string;
};

export function matchPreferencePiece(
  catalog: WardrobeCatalog | null | undefined,
  piece: OutfitPieceSuggestion,
): PreferenceMatchResult {
  const slot = piece.slot === "accessory" ? undefined : piece.slot;
  const item = findBestMatchingItem(catalog, piece.label, slot as WardrobeSlot);
  if (item) {
    return { item, missingPrompt: null, preferenceLabel: piece.label };
  }
  return {
    item: null,
    missingPrompt: `Für diesen Tag ist „${piece.label}“ vorgesehen. Füge es deinem Kleiderschrank hinzu.`,
    preferenceLabel: piece.label,
  };
}
