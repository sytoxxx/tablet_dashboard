/**
 * Adapt Phase-18 wardrobe catalog into Phase-17 outfit engine shape when needed.
 */
import type {
  WardrobeCatalog as OutfitWardrobeCatalog,
  WardrobeItem as OutfitWardrobeItem,
} from "@/lib/outfit/types";
import type { WardrobeCatalog } from "@/lib/wardrobe/model";

export function toOutfitEngineCatalog(
  catalog: WardrobeCatalog | null | undefined,
): OutfitWardrobeCatalog | null {
  if (!catalog) return null;
  const items: OutfitWardrobeItem[] = catalog.items
    .filter((i) => i.active)
    .map((i) => ({
      id: i.id,
      category:
        i.slot === "top"
          ? "top"
          : i.slot === "bottom"
            ? "bottom"
            : i.slot === "shoes"
              ? "shoes"
              : i.slot === "outerwear"
                ? "outerwear"
                : "other",
      label: i.name,
      color: i.color === "unknown" ? undefined : i.color,
      brightness:
        i.brightness === "unknown"
          ? undefined
          : i.brightness === "light" ||
              i.brightness === "dark" ||
              i.brightness === "neutral"
            ? i.brightness
            : undefined,
      warmth:
        i.warmth === "cool" || i.warmth === "mild" || i.warmth === "warm"
          ? i.warmth
          : undefined,
      rainOk: i.rainSuitable ?? undefined,
      style: i.style === "unknown" ? undefined : i.style,
      favorite: i.favorite,
      lastWornIso: i.lastWornIso,
      wearCount: i.wearCount,
      available: i.active,
    }));
  return {
    personId: catalog.personId,
    items,
    updatedAt: catalog.updatedAt,
  };
}
