/**
 * Wardrobe garment taxonomy — structured colors & categories (Phase 18).
 * Unknown stays unknown; never invent confident attributes.
 */
export const WARDROBE_COLORS = [
  "black",
  "white",
  "grey",
  "red",
  "blue",
  "green",
  "yellow",
  "orange",
  "brown",
  "beige",
  "pink",
  "purple",
  "multicolor",
  "unknown",
] as const;

export type WardrobeColor = (typeof WARDROBE_COLORS)[number];

export const WARDROBE_COLOR_LABELS: Record<WardrobeColor, string> = {
  black: "Schwarz",
  white: "Weiß",
  grey: "Grau",
  red: "Rot",
  blue: "Blau",
  green: "Grün",
  yellow: "Gelb",
  orange: "Orange",
  brown: "Braun",
  beige: "Beige",
  pink: "Pink",
  purple: "Lila",
  multicolor: "Mehrfarbig",
  unknown: "Unbekannt",
};

export type WardrobeBrightness = "light" | "dark" | "neutral" | "unknown";

export const WARDROBE_BRIGHTNESS_LABELS: Record<WardrobeBrightness, string> = {
  light: "Hell",
  dark: "Dunkel",
  neutral: "Neutral",
  unknown: "Unbekannt",
};

/** Fine-grained garment kinds for import + matching. */
export const WARDROBE_GARMENT_KINDS = [
  "t-shirt",
  "button-t-shirt",
  "polo",
  "shirt",
  "sweater",
  "hoodie",
  "jacket",
  "pants",
  "jeans",
  "joggers",
  "shorts",
  "shoes",
  "other",
] as const;

export type WardrobeGarmentKind = (typeof WARDROBE_GARMENT_KINDS)[number];

export const WARDROBE_GARMENT_LABELS: Record<WardrobeGarmentKind, string> = {
  "t-shirt": "T-Shirt",
  "button-t-shirt": "Button-T-Shirt",
  polo: "Polo",
  shirt: "Hemd",
  sweater: "Pullover",
  hoodie: "Hoodie",
  jacket: "Jacke",
  pants: "Hose",
  jeans: "Jeans",
  joggers: "Jogginghose",
  shorts: "Shorts",
  shoes: "Schuhe",
  other: "Sonstiges",
};

export type WardrobeSlot = "top" | "bottom" | "shoes" | "outerwear" | "other";

export function slotForGarmentKind(kind: WardrobeGarmentKind): WardrobeSlot {
  switch (kind) {
    case "t-shirt":
    case "button-t-shirt":
    case "polo":
    case "shirt":
    case "sweater":
    case "hoodie":
      return "top";
    case "pants":
    case "jeans":
    case "joggers":
    case "shorts":
      return "bottom";
    case "shoes":
      return "shoes";
    case "jacket":
      return "outerwear";
    default:
      return "other";
  }
}

export type WardrobeWarmth = "cool" | "mild" | "warm" | "unknown";
export type WardrobeComfort = "low" | "medium" | "high" | "unknown";
export type WardrobeStyle =
  | "casual"
  | "smart-casual"
  | "sport"
  | "work"
  | "workshop"
  | "unknown";

export function parseWardrobeColor(raw: string | null | undefined): WardrobeColor {
  if (!raw) return "unknown";
  const v = raw.trim().toLowerCase();
  const map: Record<string, WardrobeColor> = {
    schwarz: "black",
    black: "black",
    weiß: "white",
    weiss: "white",
    white: "white",
    grau: "grey",
    gray: "grey",
    grey: "grey",
    rot: "red",
    red: "red",
    blau: "blue",
    blue: "blue",
    grün: "green",
    gruen: "green",
    green: "green",
    gelb: "yellow",
    yellow: "yellow",
    orange: "orange",
    braun: "brown",
    brown: "brown",
    beige: "beige",
    pink: "pink",
    rosa: "pink",
    lila: "purple",
    purple: "purple",
    violett: "purple",
    mehrfarbig: "multicolor",
    multicolor: "multicolor",
  };
  return map[v] ?? "unknown";
}

export function parseGarmentKind(
  raw: string | null | undefined,
): WardrobeGarmentKind {
  if (!raw) return "other";
  const v = raw.trim().toLowerCase();
  if (/button|knopf/.test(v) && /t-?shirt|shirt/.test(v)) return "button-t-shirt";
  if (/polo/.test(v)) return "polo";
  if (/jogging|joggers|sweatpants/.test(v)) return "joggers";
  if (/jeans/.test(v)) return "jeans";
  if (/shorts|kurze hose/.test(v)) return "shorts";
  if (/hose|pants|trousers/.test(v)) return "pants";
  if (/hoodie|kapuze/.test(v)) return "hoodie";
  if (/pullover|sweater/.test(v)) return "sweater";
  if (/jacke|jacket|mantel/.test(v)) return "jacket";
  if (/hemd/.test(v) && !/t-?shirt/.test(v)) return "shirt";
  if (/t-?shirt|shirt/.test(v)) return "t-shirt";
  if (/schuh|sneaker|shoe/.test(v)) return "shoes";
  return "other";
}
