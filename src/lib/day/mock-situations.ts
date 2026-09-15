import { DAY_CONFIG } from "@/lib/day/config";

/** Named mock wall-clocks for QA (local device timezone). */
export const MOCK_SITUATIONS = {
  morningNext: { label: "Morgen · nächster Block", hour: 7, minute: 30 },
  midCurrent: { label: "Vormittag · laufend", hour: 10, minute: 20 },
  eveningDone: { label: "Nachmittag · erledigt", hour: 16, minute: 0 },
  eveningTomorrow: {
    label: "Abend · Morgen-Fokus",
    hour: Math.max(DAY_CONFIG.eveningTomorrowHour, 19),
    minute: 15,
  },
  lateNoBus: { label: "Spät · kein Bus", hour: 22, minute: 30 },
  freeWeekendMorning: { label: "Wochenende morgens", hour: 9, minute: 0, forceWeekday: 6 as const },
} as const;

export type MockSituationKey = keyof typeof MOCK_SITUATIONS;

export function dateFromSituation(
  key: MockSituationKey,
  base = new Date(),
): Date {
  const s = MOCK_SITUATIONS[key];
  const d = new Date(base);
  if ("forceWeekday" in s && typeof s.forceWeekday === "number") {
    const delta = s.forceWeekday - d.getDay();
    d.setDate(d.getDate() + delta);
  }
  d.setHours(s.hour, s.minute, 0, 0);
  return d;
}
