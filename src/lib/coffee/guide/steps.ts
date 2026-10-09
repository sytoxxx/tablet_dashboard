import type {
  GuideCompletion,
  GuideRouteKey,
  GuideStep,
  ImageSlotId,
  SourceRef,
} from "@/lib/coffee/guide/types";

/**
 * The machine is the Ninja Luxe Café Premier ES601EU. Every statement here comes from the
 * official EU edition of the owner's guide (ES600EU series, 181 pages, English part = PDF
 * pages 34–50; the German part pages 18–33 says the same) or, for the milk amounts, from
 * Ninja's official recipes. `page` = page of that 181-page document.
 * See docs/coffee-guide-sources.md.
 */
const E = (page: number): SourceRef => ({ id: "owners-guide-es600eu", page });
const RECIPE_CAPPUCCINO: SourceRef = { id: "recipe-cappuccino" };
const RECIPE_LATTE: SourceRef = { id: "recipe-latte" };

/** Common preparation — written once, shared by every drink. */
export type CommonStepDef = GuideStep & {
  /** Overrides for the "americano" profile (same preparation, other drink on the centre dial). */
  americano?: Partial<GuideStep>;
};

export const COMMON_STEPS: CommonStepDef[] = [
  {
    id: "basket",
    kind: "default",
    image: "basket-double",
    parts: ["double-basket", "portafilter"],
    sources: [E(38)],
    title: "Doppelsieb einsetzen",
    body: "Setze das Doppelsieb in den Siebträger. Die große Lasche am Sieb muss zur großen Lasche im Siebträger passen — dann fest eindrücken.",
    note: "Ab Werk ist das Doppelsieb schon eingesetzt.",
  },
  {
    id: "funnel",
    kind: "default",
    image: "funnel-on-portafilter",
    parts: ["funnel", "portafilter"],
    sources: [E(38)],
    title: "Trichter (Funnel) aufsetzen",
    body: "Setze den Trichter auf den Siebträger. Die Kerben am Trichter müssen zu den Kerben am Siebträger passen. Nach unten drücken, bis er einrastet.",
    note: "Der Trichter verhindert, dass beim Mahlen etwas überläuft.",
  },
  {
    id: "cradle",
    kind: "default",
    image: "portafilter-in-cradle",
    parts: ["grinding-cradle", "portafilter"],
    sources: [E(38)],
    title: "Siebträger in die Mahlhalterung",
    body: "Setze den Siebträger mit Trichter gerade und ganz in die Mahlhalterung. Dann loslassen — die Maschine wiegt ihn.",
    note: "Keine Animation? Siebträger entnehmen, Maschine aus- und einschalten, neu einsetzen.",
  },
  {
    id: "select",
    kind: "default",
    image: "select-espresso",
    parts: ["center-dial"],
    sources: [E(38), E(36)],
    title: "Getränk wählen",
    body: "Drehe das Drehrad in der Mitte auf ESPRESSO. Wie viel Pulver gemahlen wird, bestimmt die Waage der Maschine.",
    note: "Optional: Mit der STRENGTH-Taste wird der Espresso kürzer oder länger.",
    americano: {
      image: "select-americano",
      title: "Americano wählen",
      body: "Drehe das Drehrad in der Mitte auf AMERICANO. Wie viel Pulver gemahlen wird, bestimmt die Waage der Maschine.",
      note: "Die Maschine zeigt nach dem Einsetzen des Siebträgers, welche Getränke zum eingesetzten Sieb passen.",
      unverified:
        "In der Anleitung steht Americano in der Getränkeliste des Doppelsiebs, das Bedienfeld-Bild zeigt das Wort aber nicht. Wähle am Drehrad das, was deine Maschine als Americano anzeigt.",
    },
  },
  {
    id: "grind-match",
    kind: "grind",
    image: "grind-dial-display",
    parts: ["grind-dial"],
    sources: [E(39)],
    title: "Mahlgrad angleichen",
    body: "Drehe den Mahlgradregler, bis die Zahl unter CURRENT so groß ist wie die unter RECOMMENDED.",
    note: "1 = am feinsten, 25 = am gröbsten. Die Empfehlung kann sich ändern.",
  },
  {
    id: "grind-start",
    kind: "default",
    image: "start-grind",
    parts: [],
    sources: [E(39)],
    title: "Mahlen starten",
    body: "Drücke START GRIND. Die Maschine piept zum Start und noch einmal, wenn sie fertig ist. Dann blinkt TAMP im Bedienfeld.",
    confirmLabel: "Fertig gemahlen",
  },
  {
    id: "remove",
    kind: "default",
    image: "portafilter-with-funnel",
    parts: ["portafilter", "funnel"],
    sources: [E(39)],
    title: "Siebträger herausnehmen",
    body: "Nimm den Siebträger vorsichtig aus der Mahlhalterung. Der Trichter bleibt aufgesetzt.",
  },
  {
    id: "wdt",
    kind: "wdt",
    image: "wdt-tool",
    parts: ["wdt"],
    // WDT is the household's own accessory, not part of Ninja's procedure.
    sources: [],
    title: "Optional: Kaffee verteilen",
    body: "Mit dem WDT-Tool kannst du das Kaffeepulver vorsichtig umrühren und gleichmäßig verteilen.",
  },
  {
    id: "tamp",
    kind: "default",
    image: "tamping",
    parts: ["assisted-tamper", "funnel"],
    sources: [E(39)],
    title: "Tampen",
    body: "Stelle den Siebträger auf eine feste, ebene Fläche, mit einem Tuch darunter. Setze den Tamper in den Trichter und drücke ihn ganz nach unten, bis er am Trichter anliegt.",
    note: "Du musst keine Kraft schätzen: Drücken, bis der Tamper am Trichter anliegt.",
    americano: {
      unverified:
        "Die Anleitung sagt „bei allen Espresso-Getränken tampen“. Ob TAMP beim Americano am Gerät blinkt, ist nicht belegt — richte dich nach der Anzeige.",
    },
  },
  {
    id: "unfunnel",
    kind: "default",
    image: "funnel-tamper-removed",
    parts: ["funnel", "assisted-tamper"],
    sources: [E(39)],
    title: "Trichter abnehmen",
    body: "Nimm Tamper und Trichter vom Siebträger ab und lege beide links an der Maschine in ihre Fächer.",
  },
  {
    id: "lock",
    kind: "lock",
    image: "group-head-lock",
    parts: ["group-head", "portafilter"],
    sources: [E(40)],
    title: "Siebträger einspannen",
    body: "Setze den Siebträger so in den Brühkopf, dass sein oranger Punkt auf dem orangen Punkt am Brühkopf liegt. Dann drehen, bis der orange Punkt am Lock-Pfeil steht.",
  },
];

const CUP_ESPRESSO: GuideStep = {
  id: "cup",
  kind: "default",
  image: "cup-under",
  parts: [],
  sources: [E(40)],
  title: "Tasse unterstellen",
  body: "Stelle eine Tasse unter den Siebträger. Die Abtropfschale muss eingesetzt sein.",
  note: "Kleine Tasse? Die verstellbare Tassenablage nach oben stellen, dann spritzt es weniger.",
};

const BREW_ESPRESSO: GuideStep = {
  id: "brew",
  kind: "default",
  image: "start-brew",
  parts: ["center-dial"],
  sources: [E(40)],
  title: "Bezug starten",
  body: "Dein gemahlener Espresso ist noch ausgewählt. Drücke das Drehrad (START BREW). Ein Piepton startet, ein zweiter beendet den Bezug.",
  note: "Den Siebträger nie während des Bezugs lösen — die Maschine steht unter Druck.",
  confirmLabel: "Bezug fertig",
};

type MilkDrink = "cappuccino" | "latte";

/**
 * Milk workflow — only for Cappuccino and Latte. Both use the double shot and
 * dairy milk in the official Ninja recipes, but differ in milk amount
 * (Cappuccino ≈ 5 oz, Latte ≈ 8 oz) and froth style (Thick vs. Thin Froth).
 */
const MILK = {
  cappuccino: {
    recipe: RECIPE_CAPPUCCINO,
    amount: "ca. 5 oz (etwa 150 ml)",
    jugLine: "cappuccino",
    jugLineWhere: "die untere der beiden aufgedruckten Linien",
    frothImage: "froth-select-thick",
    cup: "Eine Tasse mit ca. 240 ml (8 oz) passt für Espresso plus Milchschaum.",
    froth: "Thick Froth",
    frothText:
      "Drehe das Schaum-Wahlrad auf THICK FROTH — fester, fluffiger Schaum, passend für Cappuccino.",
    frothTime: "Das Aufschäumen dauert etwa eine Minute.",
  },
  latte: {
    recipe: RECIPE_LATTE,
    amount: "ca. 8 oz (etwa 240 ml)",
    jugLine: "latte",
    jugLineWhere: "die obere der beiden aufgedruckten Linien",
    frothImage: "froth-select-thin",
    cup: "Eine große Tasse mit ca. 350 ml (12 oz) passt für Espresso plus viel Milch.",
    froth: "Thin Froth",
    frothText:
      "Drehe das Schaum-Wahlrad auf THIN FROTH — eine dünne Schaumschicht, passend für Latte.",
    frothTime: undefined,
  },
} satisfies Record<
  MilkDrink,
  {
    recipe: SourceRef;
    amount: string;
    jugLine: string;
    jugLineWhere: string;
    frothImage: ImageSlotId;
    cup: string;
    froth: string;
    frothText: string;
    frothTime: string | undefined;
  }
>;

const MILK_STEPS = (drink: MilkDrink): GuideStep[] => {
  const m = MILK[drink];
  return [
    {
      id: "milk-jug",
      kind: "default",
      image: drink === "latte" ? "jug-line-latte" : "jug-line-cappuccino",
      parts: ["milk-jug"],
      sources: [E(42), m.recipe],
      title: "Milch ins Kännchen",
      body: `Fülle kalte Vollmilch ins Milchkännchen. Auf dem Kännchen ist die Linie „${m.jugLine}“ aufgedruckt (${m.jugLineWhere}). Das Schlagwerk muss eingesetzt sein.`,
      note: `Nicht höher füllen als bis zur Max-Linie. Das Ninja-Rezept nimmt ${m.amount}. Pflanzendrink geht auch — am besten die Barista-Version.`,
    },
    {
      id: "jug-place",
      kind: "default",
      image: "jug-on-platform",
      parts: ["milk-jug", "steam-wand"],
      sources: [E(42), m.recipe],
      title: "Kännchen aufstellen",
      body: "Die Unterseite des Kännchens muss trocken sein. Stelle es auf die Plattform — der Dampfstab steckt dabei im Kännchen.",
    },
    {
      id: "froth-select",
      kind: "default",
      image: m.frothImage,
      parts: ["froth-dial"],
      sources: [E(42), m.recipe],
      title: `${m.froth} wählen`,
      body: `${m.frothText} Wähle mit MILK TYPE die Milchsorte: MILK für Milch, PLANT-BASED für Pflanzendrink.`,
    },
    {
      id: "froth-start",
      kind: "default",
      image: "start-froth",
      parts: ["froth-dial", "steam-wand"],
      sources: [E(42), m.recipe],
      title: "Aufschäumen",
      body: "Drücke START FROTH. Ein Piepton startet, ein zweiter zeigt: fertig. Der Fortschrittsbalken zeigt den Stand.",
      note: [m.frothTime, "Nie direkt in den Espresso schäumen — immer im Kännchen."]
        .filter(Boolean)
        .join(" "),
      confirmLabel: "Schaum fertig",
    },
    {
      id: "pour-milk",
      kind: "default",
      image: "pour-milk",
      parts: ["milk-jug"],
      sources: [E(42), m.recipe],
      title: "Milch zum Espresso",
      body: "Klopfe das Kännchen kurz auf die Arbeitsfläche und schwenke es, um große Blasen zu lösen. Dann gieße die Milch über den Espresso.",
    },
    {
      id: "wand-clean",
      kind: "default",
      image: "wand-wipe",
      parts: ["steam-wand"],
      sources: [E(42)],
      title: "Dampfstab abwischen",
      body: "Wische den Dampfstab gleich mit einem feuchten Tuch ab und drücke ihn nach unten. Er spült sich dann automatisch.",
      confirmLabel: "Erledigt",
    },
  ];
};

/** Cup step for milk drinks: same step, plus the cup size the official recipe uses. */
function cupFor(drink: MilkDrink): GuideStep {
  return {
    ...CUP_ESPRESSO,
    sources: [...CUP_ESPRESSO.sources, MILK[drink].recipe],
    note: MILK[drink].cup,
  };
}

const HOT_WATER_SELECT: GuideStep = {
  id: "hot-water-select",
  kind: "default",
  image: "hot-water-select",
  parts: ["hot-water-button", "center-dial"],
  sources: [E(40), E(36)],
  title: "Heißes Wasser: Taste drücken",
  body: "Drücke die Taste HOT WATER. Sie sitzt links neben dem großen Drehrad.",
  note: "Stelle die Tasse mittig auf den Tassenhalter.",
};

const HOT_WATER_START: GuideStep = {
  id: "hot-water-start",
  kind: "default",
  image: "hot-water-start",
  parts: ["center-dial"],
  sources: [E(40)],
  title: "Heißes Wasser starten",
  body: "Drehe das Drehrad für die Temperatur: niedrig, mittel (Standard) oder hoch. Drücke dann START BREW. Drücke noch einmal START BREW, wenn es genug ist.",
  note: "Ohne zweiten Druck läuft das Programm von selbst und gibt 200 ml heißes Wasser aus.",
  confirmLabel: "Wasser fertig",
};

const CUP_AMERICANO: GuideStep = {
  ...CUP_ESPRESSO,
  note: "Ein Double Americano ist standardmäßig 216 ml groß — nimm eine Tasse, in die mehr hineinpasst.",
};

const BREW_AMERICANO: GuideStep = {
  ...BREW_ESPRESSO,
  body: "Dein gemahlener Americano ist noch ausgewählt. Drücke das Drehrad (START BREW). Ein Piepton startet, ein zweiter beendet den Bezug.",
};

/** Drink-specific steps that follow the shared preparation. */
export const ROUTE_STEPS: Record<GuideRouteKey, GuideStep[]> = {
  espresso: [CUP_ESPRESSO, BREW_ESPRESSO],
  "verlaengerter-auto": [CUP_AMERICANO, BREW_AMERICANO],
  "verlaengerter-manuell": [CUP_ESPRESSO, BREW_ESPRESSO, HOT_WATER_SELECT, HOT_WATER_START],
  cappuccino: [cupFor("cappuccino"), BREW_ESPRESSO, ...MILK_STEPS("cappuccino")],
  latte: [cupFor("latte"), BREW_ESPRESSO, ...MILK_STEPS("latte")],
};

const AFTER_ESPRESSO =
  "Nimm den Siebträger vorsichtig heraus und klopfe den Kaffeesatz aus.";

export const ROUTE_COMPLETION: Record<GuideRouteKey, GuideCompletion> = {
  espresso: { headline: "Dein Espresso ist fertig ☕", tip: AFTER_ESPRESSO },
  "verlaengerter-auto": { headline: "Dein Americano ist fertig ☕", tip: AFTER_ESPRESSO },
  "verlaengerter-manuell": {
    headline: "Dein Verlängerter ist fertig ☕",
    tip: AFTER_ESPRESSO,
  },
  cappuccino: { headline: "Dein Cappuccino ist fertig ☕", tip: AFTER_ESPRESSO },
  latte: { headline: "Dein Caffè Latte ist fertig ☕", tip: AFTER_ESPRESSO },
};

/** Sources used by at least one step — kept in sync with docs/coffee-guide-sources.md. */
export const SOURCE_CATALOG = {
  "owners-guide-es600eu": {
    title: "ES600 Series Bedienungsanleitung / Owner's Guide, EU-Ausgabe (ES600EU, gilt für die ES601EU), 181 Seiten, mehrsprachig",
    publisher: "SharkNinja Europe (ninjakitchen.eu) — gelesen über den Seiten-Spiegel manualpdf.in",
    url: "https://www.manualpdf.in/ninja/luxe-cafe-premier-es601/manual",
  },
  "owners-guide-es600": {
    title: "ES600 Series Owner's Guide, US-Ausgabe (ES601_IB_43_REV_Mv28, © 2025) — nur als Quelle der Zeichnungen, die in der EU-Ausgabe identisch sind",
    publisher: "SharkNinja Operating LLC",
    url: "https://cdn.bfldr.com/U447IH35/as/4mjc7t7447v3gj6svz5pwxsq/2845969_Owner-s_Guide",
  },
  "product-photo-es601": {
    title: "Offizielles Produktfoto ES601BK_01 (Ninja Luxe Café Premier)",
    publisher: "SharkNinja",
    url: "https://assets.sharkninja.com/image/upload/f_auto/q_auto/SharkNinja-NA/ES601BK_01.jpg",
  },
  "wdt-photos-flickr": {
    title: "„Ground Coffee Stirrer Original“ — WDT-Tool und Anwendung, CC BY 2.0",
    publisher: "Caspia Jackmanson / Flickr",
    url: "https://www.flickr.com/photos/djackmanson/52558316160/",
  },
  "recipe-cappuccino": {
    title: "Vanilla Cappuccino — Ninja Test Kitchen (Luxe Café, double shot, 5 oz Milch, THICK FROTH)",
    publisher: "SharkNinja",
    url: "https://www.sharkninja.com/vanilla-cappuccino/REC15818.html",
  },
  "recipe-latte": {
    title: "Cinnamon Latte with Honey — Ninja Test Kitchen (Luxe Café, double shot, 8 oz Milch, THIN FROTH)",
    publisher: "SharkNinja",
    url: "https://www.sharkninja.com/cinnamon-latte-with-honey/REC15834.html",
  },
} as const;
