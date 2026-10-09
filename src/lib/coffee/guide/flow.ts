import {
  COMMON_STEPS,
  ROUTE_COMPLETION,
  ROUTE_STEPS,
} from "@/lib/coffee/guide/steps";
import type {
  ExtendedMethod,
  GuideCompletion,
  GuideDrinkId,
  GuideProfile,
  GuideRouteKey,
  GuideSelection,
  GuideStep,
} from "@/lib/coffee/guide/types";

export const DRINK_CARDS: Array<{
  id: GuideDrinkId;
  emoji: string;
  name: string;
  tagline: string;
}> = [
  { id: "espresso", emoji: "☕", name: "Espresso", tagline: "Klein, kräftig, schwarz" },
  { id: "verlaengerter", emoji: "☕", name: "Verlängerter", tagline: "Längerer schwarzer Kaffee" },
  { id: "cappuccino", emoji: "🥛", name: "Cappuccino", tagline: "Espresso mit Milchschaum" },
  { id: "latte", emoji: "🥛", name: "Caffè Latte", tagline: "Espresso mit viel Milch" },
];

export const METHOD_CARDS: Array<{
  id: ExtendedMethod;
  emoji: string;
  name: string;
  hint: string;
}> = [
  {
    id: "auto",
    emoji: "⚡",
    name: "Schnell & einfach",
    hint: "Americano: Die Maschine bereitet ihn automatisch zu.",
  },
  {
    id: "manual",
    emoji: "⭐",
    name: "Besser & manueller",
    hint: "Espresso, danach heißes Wasser aus der Maschine (Taste HOT WATER).",
  },
];

export function needsMethodChoice(drink: GuideDrinkId): boolean {
  return drink === "verlaengerter";
}

export function isCompleteSelection(sel: GuideSelection): boolean {
  return needsMethodChoice(sel.drink) ? sel.method !== undefined : true;
}

export function routeKeyFor(sel: GuideSelection): GuideRouteKey {
  if (sel.drink === "verlaengerter") {
    return sel.method === "manual" ? "verlaengerter-manuell" : "verlaengerter-auto";
  }
  return sel.drink;
}

export function profileFor(sel: GuideSelection): GuideProfile {
  return routeKeyFor(sel) === "verlaengerter-auto" ? "americano" : "espresso";
}

export function drinkName(sel: GuideSelection): string {
  const base = DRINK_CARDS.find((c) => c.id === sel.drink)?.name ?? sel.drink;
  if (sel.drink !== "verlaengerter" || !sel.method) return base;
  return sel.method === "auto" ? `${base} (automatisch)` : `${base} (manuell)`;
}

/** drink → common preparation → drink-specific steps. The preparation exists once. */
export function buildGuideFlow(sel: GuideSelection): GuideStep[] {
  const profile = profileFor(sel);
  const common: GuideStep[] = [];
  for (const def of COMMON_STEPS) {
    const { americano, ...base } = def;
    common.push(profile === "americano" && americano ? { ...base, ...americano } : base);
  }
  return [...common, ...ROUTE_STEPS[routeKeyFor(sel)]];
}

export function completionFor(sel: GuideSelection): GuideCompletion {
  return ROUTE_COMPLETION[routeKeyFor(sel)];
}
