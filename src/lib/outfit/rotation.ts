/**
 * Outfit rotation helpers — structure for future wardrobe picks.
 * Special days (workshop / presentation) always win over rotation.
 */
import type {
  OutfitRotationState,
  WardrobeCatalog,
  WardrobeItem,
  WearHistoryEntry,
} from "@/lib/outfit/types";

export function daysBetweenIso(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T12:00:00`);
  const b = Date.parse(`${toIso}T12:00:00`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.round((b - a) / 86_400_000);
}

export function wasWornRecently(
  rotation: OutfitRotationState,
  outfitOrItemId: string,
  onDateIso: string,
): boolean {
  const min = rotation.minDaysBetweenSameOutfit;
  for (const entry of rotation.history) {
    const hit =
      entry.outfitId === outfitOrItemId ||
      entry.itemIds.includes(outfitOrItemId);
    if (!hit) continue;
    if (daysBetweenIso(entry.dateIso, onDateIso) < min) return true;
  }
  return false;
}

/**
 * Rank wardrobe items for a future picker. Empty catalog → empty list.
 */
export function rankWardrobeItemsForRotation(input: {
  catalog: WardrobeCatalog | null | undefined;
  rotation: OutfitRotationState;
  onDateIso: string;
  category?: WardrobeItem["category"];
}): WardrobeItem[] {
  const items = input.catalog?.items ?? [];
  if (items.length === 0) return [];

  const filtered = items.filter((item) => {
    if (item.available === false) return false;
    if (input.category && item.category !== input.category) return false;
    if (input.rotation.dislikedItemIds.includes(item.id)) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    const aRecent = wasWornRecently(input.rotation, a.id, input.onDateIso);
    const bRecent = wasWornRecently(input.rotation, b.id, input.onDateIso);
    if (aRecent !== bRecent) return aRecent ? 1 : -1;

    const aFav = input.rotation.favoriteItemIds.includes(a.id) || Boolean(a.favorite);
    const bFav = input.rotation.favoriteItemIds.includes(b.id) || Boolean(b.favorite);
    if (aFav !== bFav) return aFav ? -1 : 1;

    const aCount = a.wearCount ?? 0;
    const bCount = b.wearCount ?? 0;
    if (aCount !== bCount) return aCount - bCount;

    return (a.lastWornIso ?? "").localeCompare(b.lastWornIso ?? "");
  });
}

export function recordWear(
  rotation: OutfitRotationState,
  entry: WearHistoryEntry,
): OutfitRotationState {
  return {
    ...rotation,
    history: [entry, ...rotation.history].slice(0, 60),
  };
}
