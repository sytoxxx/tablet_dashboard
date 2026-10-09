export type GuideDrinkId = "espresso" | "verlaengerter" | "cappuccino" | "latte";

/** Only relevant for "verlaengerter": machine automatic vs. espresso + hot water by hand. */
export type ExtendedMethod = "auto" | "manual";

export type GuideSelection = { drink: GuideDrinkId; method?: ExtendedMethod };

export type GuideRouteKey =
  | "espresso"
  | "verlaengerter-auto"
  | "verlaengerter-manuell"
  | "cappuccino"
  | "latte";

/**
 * "espresso": double basket, grind, (WDT), tamp, ESPRESSO on the centre dial.
 * "americano": the same preparation with AMERICANO on the centre dial.
 */
export type GuideProfile = "espresso" | "americano";

export type PartId =
  | "double-basket"
  | "portafilter"
  | "funnel"
  | "grinding-cradle"
  | "center-dial"
  | "grind-dial"
  | "assisted-tamper"
  | "wdt"
  | "group-head"
  | "milk-jug"
  | "froth-dial"
  | "steam-wand"
  | "hot-water-button";

/** Every image of the guide: `public/coffee-guide/<id>.png` (built by scripts/build-coffee-guide-images.py). */
export type ImageSlotId =
  | "basket-double"
  | "funnel-on-portafilter"
  | "portafilter-in-cradle"
  | "select-espresso"
  | "select-americano"
  | "grind-dial-display"
  | "start-grind"
  | "portafilter-with-funnel"
  | "wdt-tool"
  | "wdt-stirring"
  | "tamping"
  | "funnel-tamper-removed"
  | "group-head-lock"
  | "cup-under"
  | "start-brew"
  | "hot-water-select"
  | "hot-water-start"
  | "jug-line-cappuccino"
  | "jug-line-latte"
  | "jug-on-platform"
  | "froth-select-thin"
  | "froth-select-thick"
  | "start-froth"
  | "pour-milk"
  | "wand-wipe"
  | "part-funnel"
  | "part-tamper"
  | "part-portafilter"
  | "part-cradle"
  | "part-group-head"
  | "part-milk-jug"
  | "part-steam-wand"
  | "part-froth-dial"
  | "part-hot-water";

export type SourceId =
  | "owners-guide-es600"
  | "owners-guide-es600eu"
  | "product-photo-es601"
  | "wdt-photos-flickr"
  | "recipe-cappuccino"
  | "recipe-latte";

/** `page` = PDF page of the source document (when it is a paged document). */
export type SourceRef = { id: SourceId; page?: number };

export type GuideStepKind = "default" | "grind" | "wdt" | "lock";

export type GuideStepContent = {
  title: string;
  /** One or two plain sentences. */
  body: string;
  /** Small secondary line under the body. */
  note?: string;
  /** Overrides the default "Weiter" label. */
  confirmLabel?: string;
  /**
   * Set when the step rests on something the official manual does not state outright. Shown to the
   * user as "noch nicht an der Maschine bestätigt" — never presented as certain.
   */
  unverified?: string;
};

export type GuideStep = GuideStepContent & {
  id: string;
  kind: GuideStepKind;
  image: ImageSlotId;
  /** Parts offered under "Welches Teil ist das?". */
  parts: PartId[];
  sources: SourceRef[];
};

export type GuidePart = {
  id: PartId;
  /** German name shown first. */
  name: string;
  /** Official Ninja name (or "Zubehör" label for non-Ninja parts). */
  officialName: string;
  explanation: string;
  image: ImageSlotId;
};

export type GuideCompletion = {
  headline: string;
  tip?: string;
};
