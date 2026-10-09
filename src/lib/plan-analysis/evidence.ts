/**
 * Cross-checks the "evidence" the AI must quote for every extracted row (the
 * header cell it read the date/weekday from and the raw cell text it read the
 * times from) against the values it reported. A mismatch means a value was
 * probably attached to the wrong date, weekday or row — the single most
 * dangerous failure when reading a table — so the row is flagged for review
 * instead of being trusted.
 */
import { normalizeTimeToken, parseTimeRangeToken } from "@/lib/plan-analysis/time";
import type { WeekdayKey } from "@/lib/types";

const WEEKDAY_TOKENS: Record<WeekdayKey, string[]> = {
  mon: ["mo", "mon", "montag", "monday"],
  tue: ["di", "tue", "dienstag", "tuesday"],
  wed: ["mi", "wed", "mittwoch", "wednesday"],
  thu: ["do", "thu", "donnerstag", "thursday"],
  fri: ["fr", "fri", "freitag", "friday"],
  sat: ["sa", "sat", "samstag", "saturday"],
  sun: ["so", "sun", "sonntag", "sunday"],
};

function readStr(v: unknown, max = 60): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** All clock times written in a free text cell ("FD 06:00-14:00", "6.00 – 14.00"), normalised to HH:MM. */
export function timesInText(text: string): string[] {
  const out: string[] = [];
  const range = parseTimeRangeToken(text.trim());
  if (range) return [range.start, range.end];
  for (const m of text.matchAll(/\b([01]?\d|2[0-3])[.:]([0-5]\d)\b/g)) {
    const t = normalizeTimeToken(`${m[1]}:${m[2]}`);
    if (t) out.push(t);
  }
  return out;
}

export function weekdayInText(text: string): WeekdayKey | null {
  const words = text.toLowerCase().split(/[^a-zäöü]+/).filter(Boolean);
  for (const [key, tokens] of Object.entries(WEEKDAY_TOKENS) as [WeekdayKey, string[]][]) {
    if (words.some((w) => tokens.includes(w))) return key;
  }
  return null;
}

/** First number 1–31 in a header cell, e.g. "12 Mi" -> 12. */
function dayNumberInHeader(header: string): number | null {
  const m = /\b(\d{1,2})\b/.exec(header);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 31 ? n : null;
}

export type WorkEvidenceInput = {
  raw: unknown;
  day: number;
  /** Weekday of the resolved ISO date. */
  isoWeekday: WeekdayKey;
  status: string;
  start: string;
  end: string;
  requireEvidence: boolean;
};

/** Returns a human-readable problem, or null when the evidence agrees with the extracted values. */
export function checkWorkEvidence(i: WorkEvidenceInput): string | null {
  const ev = (i.raw && typeof i.raw === "object" ? i.raw : null) as Record<string, unknown> | null;
  const header = readStr(ev?.header);
  const cell = readStr(ev?.cell, 120);

  if (!header && !cell) {
    return i.requireEvidence ? "Keine Belegangabe aus der Tabelle (Datumsspalte und Zelle fehlen)" : null;
  }

  if (header) {
    const headerDay = dayNumberInHeader(header);
    if (headerDay !== null && headerDay !== i.day) {
      return `Datumsspalte „${header}“ passt nicht zum Tag ${i.day} — möglicherweise falsch zugeordnet`;
    }
    const headerWeekday = weekdayInText(header);
    if (headerWeekday && headerWeekday !== i.isoWeekday) {
      return `Wochentag in der Spalte „${header}“ passt nicht zum Datum — möglicherweise falsch zugeordnet`;
    }
  }

  if (cell && i.status === "work" && i.start && i.end) {
    const times = timesInText(cell);
    if (times.length > 0 && !(times.includes(i.start) && times.includes(i.end))) {
      return `Zelle „${cell}“ passt nicht zu den Zeiten ${i.start}–${i.end}`;
    }
  }
  return null;
}

export type SchoolEvidenceInput = {
  raw: unknown;
  day: WeekdayKey;
  time: string;
  requireEvidence: boolean;
};

export function checkSchoolEvidence(i: SchoolEvidenceInput): string | null {
  const ev = (i.raw && typeof i.raw === "object" ? i.raw : null) as Record<string, unknown> | null;
  const dayHeader = readStr(ev?.dayHeader);
  const slot = readStr(ev?.slot, 60);
  if (!dayHeader && !slot) {
    return i.requireEvidence ? "Keine Belegangabe aus der Tabelle (Wochentag und Zeitslot fehlen)" : null;
  }
  const headerDay = dayHeader ? weekdayInText(dayHeader) : null;
  if (headerDay && headerDay !== i.day) {
    return `Spalte „${dayHeader}“ passt nicht zum Wochentag — möglicherweise falsch zugeordnet`;
  }
  if (slot) {
    const times = timesInText(slot);
    if (times.length > 0 && !times.includes(i.time)) {
      return `Zeitslot „${slot}“ passt nicht zur Startzeit ${i.time}`;
    }
  }
  return null;
}
