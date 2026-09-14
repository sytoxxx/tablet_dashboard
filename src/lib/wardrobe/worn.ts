/**
 * Mark wardrobe items / outfits as worn — feeds rotation scoring.
 */
import type { WardrobeCatalog, WardrobeItem } from "@/lib/wardrobe/model";
import type { PickedOutfit } from "@/lib/wardrobe/pick";

export function markItemsWorn(
  catalog: WardrobeCatalog,
  itemIds: string[],
  wornOnIso: string,
): WardrobeCatalog {
  const idSet = new Set(itemIds);
  const date = wornOnIso.slice(0, 10);
  return {
    personId: catalog.personId,
    updatedAt: new Date().toISOString(),
    items: catalog.items.map((item) => {
      if (!idSet.has(item.id) || item.personId !== catalog.personId) return item;
      return {
        ...item,
        lastWornIso: date,
        wearCount: item.wearCount + 1,
        updatedAt: new Date().toISOString(),
      };
    }),
  };
}

export function markOutfitWorn(
  catalog: WardrobeCatalog,
  outfit: PickedOutfit,
  wornOnIso: string,
): WardrobeCatalog {
  const ids = outfit.pieces
    .map((p) => p.item?.id)
    .filter((id): id is string => Boolean(id));
  return markItemsWorn(catalog, ids, wornOnIso);
}

/** Optional soft preference signal when user rejects a suggestion. */
export type OutfitRejectionSignal = {
  personId: string;
  dateIso: string;
  combinationKey: string;
  itemIds: string[];
  at: string;
};

export function buildRejectionSignal(
  outfit: PickedOutfit,
): OutfitRejectionSignal {
  return {
    personId: outfit.personId,
    dateIso: outfit.dateIso,
    combinationKey: outfit.combinationKey,
    itemIds: outfit.pieces
      .map((p) => p.item?.id)
      .filter((id): id is string => Boolean(id)),
    at: new Date().toISOString(),
  };
}

export function itemSummary(item: WardrobeItem): string {
  return item.name;
}
