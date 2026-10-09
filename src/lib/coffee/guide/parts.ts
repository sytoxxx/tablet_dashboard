import type { GuidePart, ImageSlotId, PartId, SourceId } from "@/lib/coffee/guide/types";

/**
 * Parts for "Welches Teil ist das?". Names/explanations follow the official
 * Ninja ES600 Series Owner's Guide (see docs/coffee-guide-sources.md).
 * Positions on the machine are only stated where the guide states them.
 */
export const GUIDE_PARTS: Record<PartId, GuidePart> = {
  "double-basket": {
    id: "double-basket",
    name: "Doppelsieb",
    officialName: "Double Basket",
    explanation:
      "Das Sieb im Siebträger, in das der Espresso gemahlen wird. Es ist ab Werk schon eingesetzt.",
    image: "basket-double",
  },
  portafilter: {
    id: "portafilter",
    name: "Siebträger",
    officialName: "Portafilter",
    explanation:
      "Der Griff mit dem Sieb. Erst kommt er zum Mahlen in die Mahlhalterung, danach in den Brühkopf.",
    image: "part-portafilter",
  },
  funnel: {
    id: "funnel",
    name: "Trichter",
    officialName: "Funnel",
    explanation:
      "Das Kunststoffteil, das beim Mahlen und Tampen auf den Siebträger kommt, damit nichts danebengeht. Sein Fach ist links an der Maschine.",
    image: "part-funnel",
  },
  "grinding-cradle": {
    id: "grinding-cradle",
    name: "Mahlhalterung",
    officialName: "Grinding Cradle",
    explanation:
      "Hier steckst du den Siebträger zum Mahlen ein. Die Maschine wiegt ihn dabei.",
    image: "part-cradle",
  },
  "center-dial": {
    id: "center-dial",
    name: "Drehrad in der Mitte",
    officialName: "Center Dial / START BREW",
    explanation:
      "Drehen wählt das Getränk aus, Drücken startet den Bezug.",
    image: "start-brew",
  },
  "grind-dial": {
    id: "grind-dial",
    name: "Mahlgradregler",
    officialName: "Grind Dial",
    explanation:
      "Das Rad an der Seite der Maschine. 1 ist am feinsten, 25 am gröbsten.",
    image: "grind-dial-display",
  },
  "assisted-tamper": {
    id: "assisted-tamper",
    name: "Tamper",
    officialName: "Assisted Tamper",
    explanation:
      "Damit drückst du das Pulver an. Er kommt in den Trichter und wird bis zum Anschlag gedrückt. Sein Fach ist links an der Maschine.",
    image: "part-tamper",
  },
  wdt: {
    id: "wdt",
    name: "WDT-Nadelwerkzeug",
    officialName: "WDT-Tool (eigenes Zubehör, nicht von Ninja)",
    explanation:
      "Feine Nadeln, mit denen du Klumpen im Pulver auflockerst und es gleichmäßig verteilst.",
    image: "wdt-tool",
  },
  "group-head": {
    id: "group-head",
    name: "Brühkopf",
    officialName: "Group Head",
    explanation:
      "Hier wird der Siebträger zum Brühen eingespannt. Er trägt einen orangen Punkt und einen Pfeil für die Endposition.",
    image: "part-group-head",
  },
  "milk-jug": {
    id: "milk-jug",
    name: "Milchkännchen",
    officialName: "Milk Jug mit Whisk",
    explanation:
      "Das Kännchen mit eingebautem Schlagwerk. Die Milch steht zwischen MIN- und MAX-Linie.",
    image: "part-milk-jug",
  },
  "froth-dial": {
    id: "froth-dial",
    name: "Schaum-Wahlrad",
    officialName: "Froth Dial / START FROTH",
    explanation:
      "Drehen wählt die Schaum-Art, Drücken von START FROTH startet das Aufschäumen.",
    image: "part-froth-dial",
  },
  "steam-wand": {
    id: "steam-wand",
    name: "Dampfstab",
    officialName: "Steam Wand",
    explanation: "Das Rohr, das beim Aufschäumen im Milchkännchen steckt.",
    image: "part-steam-wand",
  },
  "hot-water-button": {
    id: "hot-water-button",
    name: "Heißwasser-Taste",
    officialName: "HOT WATER Button",
    explanation:
      "Die Taste links neben dem großen Drehrad. Mit ihr wählst du heißes Wasser. Gestartet wird mit START BREW.",
    image: "part-hot-water",
  },
};

export type ImageSlot = {
  id: ImageSlotId;
  /** File under public/coffee-guide/. */
  file: string;
  alt: string;
  /** Where the picture comes from — keep in sync with docs/coffee-guide-sources.md. */
  source: SourceId;
};

function slot(id: ImageSlotId, alt: string, source: SourceId): ImageSlot {
  return { id, file: `${id}.png`, alt, source };
}

const MANUAL: SourceId = "owners-guide-es600"; // US edition: same drawing as in the EU edition
const EU: SourceId = "owners-guide-es600eu";
const PHOTO: SourceId = "product-photo-es601";
const WDT: SourceId = "wdt-photos-flickr";

/**
 * Every image the guide shows — all stored locally under public/coffee-guide/,
 * no remote images. They are cut from the official Ninja ES600 Series Owner's
 * Guide (EU edition for the control panel; US edition's vector drawings where
 * the EU edition shows the identical drawing), the official ES601 product photo,
 * and two CC BY 2.0 photos of a WDT tool; the build script adds only highlight marks.
 */
export const IMAGE_SLOTS: Record<ImageSlotId, ImageSlot> = {
  "basket-double": slot("basket-double", "Doppelsieb wird in den Siebträger gesetzt", MANUAL),
  "funnel-on-portafilter": slot("funnel-on-portafilter", "Trichter wird auf den Siebträger gesetzt", MANUAL),
  "portafilter-in-cradle": slot("portafilter-in-cradle", "Siebträger mit Trichter in der Mahlhalterung", MANUAL),
  "select-espresso": slot("select-espresso", "Bedienfeld der ES601EU: Drehrad in der Mitte, Auswahl Espresso", EU),
  "select-americano": slot("select-americano", "Bedienfeld der ES601EU: Drehrad in der Mitte, Auswahl Americano", EU),
  "grind-dial-display": slot("grind-dial-display", "Mahlgradregler an der Seite und die Anzeige CURRENT und RECOMMENDED", MANUAL),
  "start-grind": slot("start-grind", "Bedienfeld: START-GRIND-Taste", MANUAL),
  "portafilter-with-funnel": slot("portafilter-with-funnel", "Siebträger mit Trichter wird aus der Mahlhalterung genommen", MANUAL),
  "wdt-tool": slot("wdt-tool", "WDT-Nadelwerkzeug und wie es im Kaffeepulver steckt", WDT),
  "wdt-stirring": slot("wdt-stirring", "WDT-Werkzeug rührt im Kaffeepulver im Siebträger", WDT),
  tamping: slot("tamping", "Tamper wird in den Trichter auf dem Siebträger gesetzt und nach unten gedrückt", MANUAL),
  "funnel-tamper-removed": slot("funnel-tamper-removed", "Trichter- und Tamper-Fach links an der Maschine", MANUAL),
  "group-head-lock": slot("group-head-lock", "Siebträger wird in den Brühkopf eingesetzt und festgedreht", MANUAL),
  "cup-under": slot("cup-under", "Tasse steht unter den Auslaufstellen des Siebträgers", MANUAL),
  "start-brew": slot("start-brew", "Bedienfeld der ES601EU: Drehrad START BREW", EU),
  "hot-water-select": slot("hot-water-select", "Bedienfeld der ES601EU: die Taste HOT WATER links neben dem Drehrad", EU),
  "hot-water-start": slot("hot-water-start", "Bedienfeld der ES601EU: das Drehrad START BREW", EU),
  "jug-line-cappuccino": slot("jug-line-cappuccino", "Milchkännchen mit der aufgedruckten unteren Linie „cappuccino“", MANUAL),
  "jug-line-latte": slot("jug-line-latte", "Milchkännchen mit der aufgedruckten oberen Linie „latte“", MANUAL),
  "jug-on-platform": slot("jug-on-platform", "Milchkännchen steht auf der Plattform, der Dampfstab steckt darin", MANUAL),
  "froth-select-thin": slot("froth-select-thin", "Schaum-Art Thin Froth am Bedienfeld", EU),
  "froth-select-thick": slot("froth-select-thick", "Schaum-Art Thick Froth am Bedienfeld", EU),
  "start-froth": slot("start-froth", "Finger drückt am Bedienfeld START FROTH, das Kännchen steht auf der Plattform", MANUAL),
  "pour-milk": slot("pour-milk", "Milchschaum wird aus dem Kännchen in die Tasse gegossen", MANUAL),
  "wand-wipe": slot("wand-wipe", "Dampfstab wird nach dem Aufschäumen abgewischt", MANUAL),
  "part-funnel": slot("part-funnel", "Der Trichter (Funnel)", MANUAL),
  "part-tamper": slot("part-tamper", "Der Tamper (Assisted Tamper)", MANUAL),
  "part-portafilter": slot("part-portafilter", "Der Siebträger (Portafilter) mit Griff und Sieb", MANUAL),
  "part-cradle": slot("part-cradle", "Die Mahlhalterung an der Maschine, markiert", PHOTO),
  "part-group-head": slot("part-group-head", "Der Brühkopf mit dem Ninja-Logo, markiert", PHOTO),
  "part-milk-jug": slot("part-milk-jug", "Das Milchkännchen mit Griff und Schlagwerk-Halterung", MANUAL),
  "part-steam-wand": slot("part-steam-wand", "Der Dampfstab, markiert", PHOTO),
  "part-froth-dial": slot("part-froth-dial", "Das Schaum-Wahlrad mit START FROTH, markiert", EU),
  "part-hot-water": slot("part-hot-water", "Die Taste HOT WATER links neben dem Drehrad, markiert", EU),
};
