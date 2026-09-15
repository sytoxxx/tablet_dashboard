/**
 * Outfit picker using real wardrobe items + Phase-17 rule priority.
 * Workshop > Referat > weather/rotation. Never invents garments.
 */
import { defaultOutfitPreferences } from "@/lib/outfit/preferences";
import { buildWeatherOutfitFactors } from "@/lib/outfit/weather-factors";
import type {
  DayOutfitSignals,
  PersonOutfitPreferences,
} from "@/lib/outfit/types";
import type { PersonId, WeatherInfo } from "@/lib/types";
import {
  findByGarmentKinds,
  matchPreferencePiece,
} from "@/lib/wardrobe/match";
import type { WardrobeCatalog, WardrobeItem } from "@/lib/wardrobe/model";
import type { WardrobeGarmentKind } from "@/lib/wardrobe/taxonomy";

export type PickedOutfitPiece = {
  slot: "top" | "bottom" | "shoes" | "outerwear";
  item: WardrobeItem | null;
  label: string;
  missingPrompt: string | null;
};

export type PickedOutfit = {
  personId: PersonId;
  dateIso: string;
  mode: "workshop" | "presentation" | "normal" | "empty";
  headline: string;
  pieces: PickedOutfitPiece[];
  notes: string[];
  /** Stable key for confirm / alternative exclusion. */
  combinationKey: string;
  weatherNotes: string[];
};

function daysSince(iso: string | null, onDateIso: string): number {
  if (!iso) return 999;
  const a = Date.parse(`${iso.slice(0, 10)}T12:00:00`);
  const b = Date.parse(`${onDateIso}T12:00:00`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 999;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function wasWornYesterday(item: WardrobeItem, onDateIso: string): boolean {
  return daysSince(item.lastWornIso, onDateIso) <= 1;
}

/**
 * Score candidate for normal-day rotation + weather.
 * Higher = better.
 */
export function scoreWardrobeItemForDay(input: {
  item: WardrobeItem;
  onDateIso: string;
  rain: boolean;
  cold: boolean;
  hot: boolean;
  preferBrightness?: "light" | "dark" | null;
  excludeIds?: Set<string>;
}): number {
  const { item } = input;
  if (!item.active) return -10_000;
  if (input.excludeIds?.has(item.id)) return -5_000;

  let score = 50;
  score += Math.min(40, daysSince(item.lastWornIso, input.onDateIso));
  score -= Math.min(20, item.wearCount);
  if (wasWornYesterday(item, input.onDateIso)) score -= 60;
  if (item.favorite) score += 8;

  if (input.rain) {
    if (item.rainSuitable === true) score += 25;
    if (item.rainSuitable === false) score -= 40;
  }
  if (input.cold) {
    if (item.warmth === "warm") score += 20;
    if (item.warmth === "cool") score -= 25;
  }
  if (input.hot) {
    if (item.warmth === "cool") score += 20;
    if (item.warmth === "warm") score -= 25;
  }
  if (item.comfort === "high") score += 10;
  if (input.preferBrightness && item.brightness === input.preferBrightness) {
    score += 12;
  }
  if (input.preferBrightness && item.brightness !== "unknown") {
    if (item.brightness !== input.preferBrightness) score -= 6;
  }
  return score;
}

function pickBest(
  items: WardrobeItem[],
  onDateIso: string,
  weather: { rain: boolean; cold: boolean; hot: boolean },
  excludeIds?: Set<string>,
  preferBrightness?: "light" | "dark" | null,
): WardrobeItem | null {
  if (items.length === 0) return null;
  let best: WardrobeItem | null = null;
  let bestScore = -Infinity;
  for (const item of items) {
    const score = scoreWardrobeItemForDay({
      item,
      onDateIso,
      ...weather,
      excludeIds,
      preferBrightness,
    });
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return bestScore > -1000 ? best : null;
}

function combinationKey(pieces: PickedOutfitPiece[]): string {
  return pieces
    .map((p) => `${p.slot}:${p.item?.id ?? "missing"}`)
    .sort()
    .join("|");
}

const PRESENTATION_TOPS: WardrobeGarmentKind[] = [
  "button-t-shirt",
  "polo",
  "t-shirt",
];

/**
 * Build an outfit proposal from real wardrobe data + day signals.
 */
export function pickOutfitForDay(input: {
  personId: PersonId;
  dateIso: string;
  signals: DayOutfitSignals;
  wardrobe?: WardrobeCatalog | null;
  weather?: WeatherInfo | null;
  preferences?: PersonOutfitPreferences | null;
  /** Exclude a previous combination when user asks for alternative. */
  excludeCombinationKey?: string | null;
  preferBrightness?: "light" | "dark" | null;
}): PickedOutfit {
  const preferences =
    input.preferences ?? defaultOutfitPreferences(input.personId);
  const weatherFactors = buildWeatherOutfitFactors(input.weather);
  const weatherNotes = weatherFactors.guidance;
  const weatherFlags = {
    rain: weatherFactors.rain,
    cold:
      typeof weatherFactors.morningTempC === "number" &&
      weatherFactors.morningTempC <= 8,
    hot:
      typeof weatherFactors.daytimeTempC === "number" &&
      weatherFactors.daytimeTempC >= 22,
  };
  const catalog = input.wardrobe;
  const signals = input.signals;
  const excludeIds = new Set<string>();

  // 1) Workshop
  if (signals.workshopDay && preferences.workshop?.enabled) {
    const ws = preferences.workshop;
    const top = matchPreferencePiece(catalog, ws.top);
    const bottom = matchPreferencePiece(catalog, ws.bottom);
    const shoes = matchPreferencePiece(catalog, ws.shoes);
    const pieces: PickedOutfitPiece[] = [
      {
        slot: "top",
        item: top.item,
        label: top.item?.name ?? ws.top.label,
        missingPrompt: top.missingPrompt,
      },
      {
        slot: "bottom",
        item: bottom.item,
        label: bottom.item?.name ?? ws.bottom.label,
        missingPrompt: bottom.missingPrompt,
      },
      {
        slot: "shoes",
        item: shoes.item,
        label: shoes.item?.name ?? ws.shoes.label,
        missingPrompt: shoes.missingPrompt,
      },
    ];
    return {
      personId: input.personId,
      dateIso: input.dateIso,
      mode: "workshop",
      headline: "Werkstatttag",
      pieces,
      notes: [ws.note, ...weatherNotes.slice(0, 1)],
      combinationKey: combinationKey(pieces),
      weatherNotes,
    };
  }

  // 2) Presentation / Referat
  if (signals.presentation && preferences.presentation?.enabled) {
    const pr = preferences.presentation;
    const topCandidates = findByGarmentKinds(catalog, PRESENTATION_TOPS, "top");
    // Prefer button-t-shirt / polo over plain t-shirt
    const rankedTops = [...topCandidates].sort((a, b) => {
      const rank = (k: WardrobeGarmentKind) =>
        k === "button-t-shirt" ? 0 : k === "polo" ? 1 : 2;
      return rank(a.garmentKind) - rank(b.garmentKind);
    });
    const top =
      pickBest(
        rankedTops,
        input.dateIso,
        weatherFlags,
        excludeIds,
        input.preferBrightness,
      ) ?? null;
    if (top) excludeIds.add(top.id);

    const bottoms = (catalog?.items ?? []).filter(
      (i) => i.active && i.slot === "bottom",
    );
    const bottom = pickBest(
      bottoms,
      input.dateIso,
      weatherFlags,
      excludeIds,
      input.preferBrightness,
    );
    if (bottom) excludeIds.add(bottom.id);

    const shoesList = (catalog?.items ?? []).filter(
      (i) => i.active && i.slot === "shoes",
    );
    const shoes = pickBest(
      shoesList,
      input.dateIso,
      weatherFlags,
      excludeIds,
    );

    const pieces: PickedOutfitPiece[] = [
      {
        slot: "top",
        item: top,
        label: top?.name ?? pr.styleHint,
        missingPrompt: top
          ? null
          : "Für das Referat fehlt noch ein gepflegtes Button-T-Shirt / Polo im Kleiderschrank.",
      },
      {
        slot: "bottom",
        item: bottom,
        label: bottom?.name ?? "Hose",
        missingPrompt: bottom
          ? null
          : "Noch keine Hose im Kleiderschrank.",
      },
      {
        slot: "shoes",
        item: shoes,
        label: shoes?.name ?? "Schuhe",
        missingPrompt: shoes
          ? null
          : "Noch keine Schuhe im Kleiderschrank.",
      },
    ];

    return {
      personId: input.personId,
      dateIso: input.dateIso,
      mode: "presentation",
      headline: signals.presentationLabel
        ? `Referat — ${signals.presentationLabel}`
        : "Referat / Präsentation",
      pieces,
      notes: [
        pr.styleHint,
        ...(pr.allowFormalShirt
          ? []
          : ["Kein klassisches Hemd — gepflegt-casual."]),
        ...weatherNotes.slice(0, 1),
      ],
      combinationKey: combinationKey(pieces),
      weatherNotes,
    };
  }

  // 3) Normal day — real wardrobe only
  const active = (catalog?.items ?? []).filter((i) => i.active);
  if (active.length === 0) {
    return {
      personId: input.personId,
      dateIso: input.dateIso,
      mode: "empty",
      headline: signals.schoolDay ? "Normaler Schultag" : "Alltag",
      pieces: [],
      notes: [
        "Outfit-Empfehlung verfügbar, sobald dein Kleiderschrank eingerichtet ist.",
        ...weatherNotes,
      ],
      combinationKey: "empty",
      weatherNotes,
    };
  }

  const tryPick = (extraExclude: Set<string>): PickedOutfit => {
    const localExclude = new Set(extraExclude);
    const top = pickBest(
      active.filter((i) => i.slot === "top"),
      input.dateIso,
      weatherFlags,
      localExclude,
      input.preferBrightness,
    );
    if (top) localExclude.add(top.id);
    const bottom = pickBest(
      active.filter((i) => i.slot === "bottom"),
      input.dateIso,
      weatherFlags,
      localExclude,
      input.preferBrightness,
    );
    if (bottom) localExclude.add(bottom.id);
    const shoes = pickBest(
      active.filter((i) => i.slot === "shoes"),
      input.dateIso,
      weatherFlags,
      localExclude,
    );
    const pieces: PickedOutfitPiece[] = [
      {
        slot: "top",
        item: top,
        label: top?.name ?? "Oberteil",
        missingPrompt: top ? null : "Kein Oberteil im Kleiderschrank.",
      },
      {
        slot: "bottom",
        item: bottom,
        label: bottom?.name ?? "Hose",
        missingPrompt: bottom ? null : "Keine Hose im Kleiderschrank.",
      },
      {
        slot: "shoes",
        item: shoes,
        label: shoes?.name ?? "Schuhe",
        missingPrompt: shoes ? null : "Keine Schuhe im Kleiderschrank.",
      },
    ];
    return {
      personId: input.personId,
      dateIso: input.dateIso,
      mode: "normal",
      headline: signals.schoolDay ? "Normaler Schultag" : "Alltag",
      pieces,
      notes: weatherNotes,
      combinationKey: combinationKey(pieces),
      weatherNotes,
    };
  };

  let picked = tryPick(excludeIds);
  if (
    input.excludeCombinationKey &&
    picked.combinationKey === input.excludeCombinationKey
  ) {
    // Force alternative by excluding previously chosen item ids
    for (const p of picked.pieces) {
      if (p.item) excludeIds.add(p.item.id);
    }
    const alt = tryPick(excludeIds);
    if (alt.combinationKey !== picked.combinationKey) picked = alt;
  }

  return picked;
}

export function perfumeStatus(catalogEmpty = true): string {
  if (catalogEmpty) return "Parfum noch nicht eingerichtet.";
  return "Parfum-Empfehlung aus deinen Düften";
}
