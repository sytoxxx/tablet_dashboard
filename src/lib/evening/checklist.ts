/**
 * Person-specific evening prep checklist (“Alles hergerichtet”).
 * Pure helpers — persistence stays in the client component.
 */
import type { PersonId } from "@/lib/types";

export type EveningChecklistKey =
  | "outfit"
  | "shoes"
  | "perfume"
  | "bag"
  | "weather";

export type EveningChecklistItem = {
  key: EveningChecklistKey;
  label: string;
  /** Whether this slot is relevant for the person/day. */
  relevant: boolean;
  done: boolean;
};

export type EveningChecklistState = {
  personId: PersonId;
  dateIso: string;
  checked: Partial<Record<EveningChecklistKey, boolean>>;
};

export const EVENING_CHECKLIST_LABELS: Record<EveningChecklistKey, string> = {
  outfit: "Kleidung",
  shoes: "Schuhe",
  perfume: "Parfum",
  bag: "Tasche",
  weather: "Wetter geprüft",
};

export function buildEveningChecklist(input: {
  personId: PersonId;
  dateIso: string;
  checked?: Partial<Record<EveningChecklistKey, boolean>> | null;
  /** Hide perfume when preferences disable it. */
  includePerfume?: boolean;
}): EveningChecklistItem[] {
  const checked = input.checked ?? {};
  const keys: EveningChecklistKey[] = [
    "outfit",
    "shoes",
    ...(input.includePerfume === false ? [] : (["perfume"] as const)),
    "bag",
    "weather",
  ];
  return keys.map((key) => ({
    key,
    label: EVENING_CHECKLIST_LABELS[key],
    relevant: true,
    done: Boolean(checked[key]),
  }));
}

export function isEveningPrepComplete(
  items: EveningChecklistItem[],
): boolean {
  const relevant = items.filter((i) => i.relevant);
  return relevant.length > 0 && relevant.every((i) => i.done);
}

export function eveningChecklistStorageKey(
  personId: PersonId,
  dateIso: string,
): string {
  return `coffee-morning:evening-checklist:${personId}:${dateIso}`;
}
