/**
 * Text import for work plans ("Mit ChatGPT importieren").
 *
 * The user photographs the roster with ChatGPT, copies the list ChatGPT writes and pastes it
 * here. This module turns that list into `AnalyzedWorkEntry` rows — the very same shape the
 * photo analysis produces — so everything after it (preview, correction, conflict handling,
 * saving via `applyPlanDraft`) is shared and there is exactly one way plans reach the data.
 *
 * Rules (see docs/arbeitsplan-import.md):
 *  - no AI call, deterministic;
 *  - never invent a time, a date, a month, a year or a person;
 *  - never skip a line silently: every line is either read, reported as an issue (blocking,
 *    with the line shown), or listed as a non-blocking note;
 *  - anything ambiguous becomes an `uncertain` entry the user must confirm in the preview.
 */
import type { PersonId, WeekdayKey, WorkDayStatus } from "@/lib/types";
import type {
  AnalyzedWorkEntry,
  PlanAnalysisResult,
  PlanPeriod,
  UncertaintyMark,
} from "@/lib/plan-analysis/types";
import { checkPlausibility } from "@/lib/plan-analysis/plausibility";
import { weekdayMatches } from "@/lib/plan-analysis/plan-date";

export type KnownPerson = { id: PersonId; name: string };

export type TextLineIssue = {
  /** 1-based line number in the pasted text. */
  line: number;
  text: string;
  reason: string;
};

export type TextNote = { line?: number; text: string };

export type TextImportOutcome = {
  /** Person as written in the text ("Person: Heidi"), if any. */
  personText: string | null;
  /** Resolved known person — null when the text names nobody or somebody unknown. */
  personId: PersonId | null;
  personProblem: "unknown" | "ambiguous" | null;
  /** Declared month/year from the header (null = not stated). */
  declared: { month: number | null; year: number | null };
  entries: AnalyzedWorkEntry[];
  /** Blocking problems — each is shown with its line and must be fixed before continuing. */
  issues: TextLineIssue[];
  /** Non-blocking information (ignored text lines, removed duplicates, …). */
  notes: TextNote[];
  /** ISO dates of the declared month that have no entry. Empty when no month is declared. */
  missingDays: string[];
  /** True when at least one date had no year and the header gave none either. */
  needsYear: boolean;
  /** True when a bare day number ("5 | 06:00-12:00") was used but no month is declared. */
  needsMonth: boolean;
  /** Year that was assumed because the user chose it (not read from the text). */
  assumedYear: number | null;
};

export type ParseOptions = {
  persons: KnownPerson[];
  /** Year the user explicitly chose after the "which year?" question. */
  assumeYear?: number;
  /** Month the user explicitly chose after the "which month?" question (1–12). */
  assumeMonth?: number;
};

const MONTHS: Array<{ n: number; names: string[] }> = [
  { n: 1, names: ["januar", "jänner", "jan", "january"] },
  { n: 2, names: ["februar", "feber", "feb", "february"] },
  { n: 3, names: ["märz", "maerz", "mär", "mrz", "mar", "march"] },
  { n: 4, names: ["april", "apr"] },
  { n: 5, names: ["mai", "may"] },
  { n: 6, names: ["juni", "jun", "june"] },
  { n: 7, names: ["juli", "jul", "july"] },
  { n: 8, names: ["august", "aug"] },
  { n: 9, names: ["september", "sept", "sep"] },
  { n: 10, names: ["oktober", "okt", "oct", "october"] },
  { n: 11, names: ["november", "nov"] },
  { n: 12, names: ["dezember", "dez", "dec", "december"] },
];

export function monthFromName(raw: string): number | null {
  const t = raw.trim().toLowerCase().replace(/\.$/, "");
  for (const m of MONTHS) if (m.names.includes(t)) return m.n;
  return null;
}

const MONTH_ALT = MONTHS.flatMap((m) => m.names)
  .sort((a, b) => b.length - a.length)
  .join("|");

const WEEKDAY_WORDS: Array<{ key: WeekdayKey; names: string[] }> = [
  { key: "mon", names: ["montag", "mo"] },
  { key: "tue", names: ["dienstag", "di"] },
  { key: "wed", names: ["mittwoch", "mi"] },
  { key: "thu", names: ["donnerstag", "do"] },
  { key: "fri", names: ["freitag", "fr"] },
  { key: "sat", names: ["samstag", "sonnabend", "sa"] },
  { key: "sun", names: ["sonntag", "so"] },
];

function weekdayFromWord(word: string): WeekdayKey | null {
  const t = word.toLowerCase().replace(/\.$/, "");
  for (const w of WEEKDAY_WORDS) if (w.names.includes(t)) return w.key;
  return null;
}

const WEEKDAY_ALT = WEEKDAY_WORDS.flatMap((w) => w.names)
  .sort((a, b) => b.length - a.length)
  .join("|");

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isRealDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

/** "2026" / "26" → 2026. Anything else → null. */
function fullYear(raw: string): number | null {
  if (/^\d{4}$/.test(raw)) {
    const y = Number(raw);
    return y >= 2000 && y <= 2100 ? y : null;
  }
  if (/^\d{2}$/.test(raw)) return 2000 + Number(raw);
  return null;
}

// ----------------------------------------------------------------------------- line cleaning

function cleanLine(raw: string): string {
  return raw
    .replace(/[   ]/g, " ")
    .replace(/[​-‍﻿]/g, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*(?:[-*•–]\s+|\d+[.)]\s+(?=\d))/, "") // bullets / "1) " list numbers before a date
    .trim();
}

function isSeparatorRow(line: string): boolean {
  return /^[\s|:\-–—=+_*~]+$/.test(line);
}

function stripOuterPipes(line: string): string {
  return line.replace(/^\|\s*/, "").replace(/\s*\|$/, "").trim();
}

// ----------------------------------------------------------------------------- headers

const PERSON_KEY = /^(?:person|name|mitarbeiter(?:in)?|für|fuer|dienstplan\s+für|arbeitsplan\s+für)\s*[:=]\s*(.*)$/i;
const MONTH_KEY = /^(?:monat|zeitraum|plan(?:monat)?|datum)\s*[:=]\s*(.*)$/i;
const YEAR_KEY = /^(?:jahr)\s*[:=]\s*(\d{4})\s*$/i;

function parsePeriodText(value: string): { month: number | null; year: number | null } | null {
  const v = value.trim();
  let m = new RegExp(`^(${MONTH_ALT})\\.?\\s*,?\\s*(\\d{4})$`, "i").exec(v);
  if (m) return { month: monthFromName(m[1]!), year: Number(m[2]) };
  m = /^(\d{1,2})\s*[./-]\s*(\d{4})$/.exec(v);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) return { month: Number(m[1]), year: Number(m[2]) };
  m = /^(\d{4})\s*[./-]\s*(\d{1,2})$/.exec(v);
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return { month: Number(m[2]), year: Number(m[1]) };
  m = new RegExp(`^(${MONTH_ALT})\\.?$`, "i").exec(v);
  if (m) return { month: monthFromName(m[1]!), year: null };
  return null;
}

/** A free-standing title line like "Dienstplan Oktober 2026". */
function parseTitleLine(line: string): { month: number | null; year: number | null } | null {
  const m = new RegExp(
    `^(?:(?:dienst|arbeits)?plan|monatsplan|dienstplan|arbeitsplan)?\\s*(?:für|fuer)?\\s*(${MONTH_ALT})\\.?\\s*,?\\s*(\\d{4})$`,
    "i",
  ).exec(line);
  if (m) return { month: monthFromName(m[1]!), year: Number(m[2]) };
  return null;
}

function matchPerson(
  text: string,
  persons: KnownPerson[],
): { id: PersonId | null; problem: "unknown" | "ambiguous" | null } {
  const t = text.trim().toLowerCase();
  if (!t) return { id: null, problem: null };
  const words = t.split(/[\s,;/]+/).filter(Boolean);
  const hits = persons.filter((p) => {
    const name = p.name.toLowerCase();
    const id = p.id.toLowerCase();
    return t === name || t === id || words.includes(name) || words.includes(id);
  });
  if (hits.length === 1) return { id: hits[0]!.id, problem: null };
  if (hits.length > 1) return { id: null, problem: "ambiguous" };
  return { id: null, problem: "unknown" };
}

// ----------------------------------------------------------------------------- time ranges

type RangeHit = { start: string; end: string; confident: boolean; raw: string; index: number };

const RANGE_RE = new RegExp(
  "(^|[^\\d:.])" +
    "([01]?\\d|2[0-3])(?:\\s*[:.]\\s*([0-5]\\d))?\\s*(uhr|h)?" +
    "\\s*(?:-|–|—|bis|to)\\s*" +
    "([01]?\\d|2[0-3])(?:\\s*[:.]\\s*([0-5]\\d))?\\s*(uhr|h)?" +
    "(?![\\d:])",
  "gi",
);
const COMPACT_RANGE_RE = /(^|[^\d:.])([01]\d|2[0-3])([0-5]\d)\s*(?:-|–|—|bis)\s*([01]\d|2[0-3])([0-5]\d)(?![\d:])/gi;

function findRanges(text: string): RangeHit[] {
  const hits: RangeHit[] = [];
  RANGE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RANGE_RE.exec(text))) {
    const startH = Number(m[2]);
    const endH = Number(m[5]);
    const hasMinutes = Boolean(m[3] || m[6]);
    const hasUnit = Boolean(m[4] || m[7]);
    hits.push({
      start: `${pad2(startH)}:${m[3] ?? "00"}`,
      end: `${pad2(endH)}:${m[6] ?? "00"}`,
      // "6-12 Uhr" / "06:00-12:00" are clear; a bare "6-12" is only plausible, so it is confirmed by the user.
      confident: hasMinutes || hasUnit,
      raw: m[0].slice(m[1]!.length),
      index: m.index + m[1]!.length,
    });
  }
  COMPACT_RANGE_RE.lastIndex = 0;
  while ((m = COMPACT_RANGE_RE.exec(text))) {
    const index = m.index + m[1]!.length;
    if (hits.some((h) => index >= h.index && index < h.index + h.raw.length)) continue;
    hits.push({
      start: `${m[2]}:${m[3]}`,
      end: `${m[4]}:${m[5]}`,
      confident: true,
      raw: m[0].slice(m[1]!.length),
      index,
    });
  }
  return hits.sort((a, b) => a.index - b.index);
}

// ----------------------------------------------------------------------------- keywords

const FREE_RE = /^(frei|dienstfrei|freier\s+tag|freitag\s+frei|off|ruhetag|kein\s+dienst|frei\s*tag)\b(.*)$/i;
const VACATION_RE = /^(urlaub|urlaubstag|urlaub\s+genehmigt)\b(.*)$/i;
const SICK_RE = /^(krankenstand|krankheit|krankmeldung|krank|krankgemeldet)\b(.*)$/i;
const UNCLEAR_RE = /^(unklar|unleserlich|nicht\s+lesbar|\?+|unsicher)$/i;
const WORK_LABEL_RE = /^(nachtdienst|nacht|frühdienst|fruehdienst|spätdienst|spaetdienst|tagdienst|tagesdienst|zwischendienst|arbeit|dienst|schicht|bereitschaft)\b\s*(.*)$/i;

const STATUS_LABEL: Record<Exclude<WorkDayStatus, "work">, string> = {
  free: "Frei",
  vacation: "Urlaub",
  sick: "Krankenstand",
  other: "Sonstiges",
};

function titleCase(word: string): string {
  const w = word.trim();
  if (!w) return w;
  const normalized = w
    .replace(/^fruehdienst$/i, "Frühdienst")
    .replace(/^spaetdienst$/i, "Spätdienst");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

// ----------------------------------------------------------------------------- date prefix

type DatePrefix = {
  y: number | null;
  m: number;
  d: number;
  weekday: WeekdayKey | null;
  rest: string;
  /** The date was only a day number — month and year come from the header. */
  bareDay: boolean;
  /** Year was written as two digits ("26"). */
  twoDigitYear: boolean;
};

function parseDatePrefix(line: string): DatePrefix | { error: string } | null {
  let s = line;
  let weekday: WeekdayKey | null = null;
  const wd = new RegExp(`^(${WEEKDAY_ALT})\\.?[\\s,:\\-–]*(?=\\d)`, "i").exec(s);
  if (wd) {
    weekday = weekdayFromWord(wd[1]!);
    s = s.slice(wd[0].length);
  }

  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?!\d)/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!isRealDate(y, mo, d)) return { error: `Das Datum ${m[0]} gibt es nicht.` };
    return { y, m: mo, d, weekday, rest: s.slice(m[0].length), bareDay: false, twoDigitYear: false };
  }

  m = /^(\d{1,2})\.\s*(\d{1,2})\.?(?:\s*(\d{4}|\d{2})(?!\d))?/.exec(s);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const yr = m[3] ? fullYear(m[3]) : null;
    if (m[3] && yr == null) return { error: `Das Jahr „${m[3]}“ ist nicht gültig.` };
    if (mo < 1 || mo > 12) return { error: `Der Monat ${mo} ist nicht gültig.` };
    if (yr != null && !isRealDate(yr, mo, d)) return { error: `Das Datum ${m[0].trim()} gibt es nicht.` };
    if (yr == null && (d < 1 || d > 31)) return { error: `Der Tag ${d} ist nicht gültig.` };
    return {
      y: yr,
      m: mo,
      d,
      weekday,
      rest: s.slice(m[0].length),
      bareDay: false,
      twoDigitYear: Boolean(m[3] && m[3].length === 2),
    };
  }

  m = new RegExp(`^(\\d{1,2})\\.?\\s*(${MONTH_ALT})\\.?(?:\\s*,?\\s*(\\d{4}))?(?![\\p{L}\\d])`, "iu").exec(s);
  if (m) {
    const d = Number(m[1]);
    const mo = monthFromName(m[2]!)!;
    const yr = m[3] ? Number(m[3]) : null;
    if (yr != null && !isRealDate(yr, mo, d)) return { error: `Das Datum ${m[0].trim()} gibt es nicht.` };
    return { y: yr, m: mo, d, weekday, rest: s.slice(m[0].length), bareDay: false, twoDigitYear: false };
  }

  // Bare day number: "5 | 06:00-12:00" — only with an explicit separator so that a time like "06:00-12:00" is never read as a day.
  m = /^(\d{1,2})\s*(?:[|;\t]|\.\s+(?=\S))/.exec(s);
  if (m) {
    const d = Number(m[1]);
    if (d < 1 || d > 31) return { error: `Der Tag ${d} ist nicht gültig.` };
    return { y: null, m: 0, d, weekday, rest: s.slice(m[0].length), bareDay: true, twoDigitYear: false };
  }

  return null;
}

// ----------------------------------------------------------------------------- main parser

type RawRow = {
  line: number;
  text: string;
  date: { y: number | null; m: number; d: number; bareDay: boolean };
  weekday: WeekdayKey | null;
  rest: string;
};

function describeEntry(e: AnalyzedWorkEntry): string {
  return e.status === "work" ? `${e.start}-${e.end} ${e.label}` : e.label;
}

export function parseWorkPlanText(text: string, options: ParseOptions): TextImportOutcome {
  const issues: TextLineIssue[] = [];
  const notes: TextNote[] = [];
  const rows: RawRow[] = [];

  let personText: string | null = null;
  let declaredMonth: number | null = null;
  let declaredYear: number | null = null;

  const lines = text.replace(/\r\n?/g, "\n").split("\n");

  const takeHeaderField = (field: string, lineNo: number, original: string): boolean => {
    const f = field.trim();
    let m = PERSON_KEY.exec(f);
    if (m) {
      const value = m[1]!.trim();
      if (value) personText = personText ?? value;
      else issues.push({ line: lineNo, text: original, reason: "Hinter „Person:“ fehlt der Name." });
      return true;
    }
    m = MONTH_KEY.exec(f);
    if (m) {
      const value = m[1]!.trim();
      const p = parsePeriodText(value);
      if (!p) {
        issues.push({
          line: lineNo,
          text: original,
          reason: `„${value}“ ist kein Monat. Beispiel: „Monat: Oktober 2026“.`,
        });
        return true;
      }
      if (p.month != null) declaredMonth = p.month;
      if (p.year != null) declaredYear = p.year;
      return true;
    }
    m = YEAR_KEY.exec(f);
    if (m) {
      declaredYear = Number(m[1]);
      return true;
    }
    return false;
  };

  lines.forEach((rawLine, idx) => {
    const lineNo = idx + 1;
    const original = rawLine.trim();
    if (!original) return;
    let line = cleanLine(rawLine);
    if (!line) return;
    if (isSeparatorRow(line)) return;
    line = stripOuterPipes(line);
    if (!line || isSeparatorRow(line)) return;

    // ---- header line(s), possibly several on one line ("Person: Heidi | Monat: Oktober 2026")
    const fields = line.split(/\s*\|\s*/);
    if (fields.some((f) => PERSON_KEY.test(f) || MONTH_KEY.test(f) || YEAR_KEY.test(f))) {
      let allConsumed = true;
      for (const f of fields) {
        if (!f.trim()) continue;
        if (!takeHeaderField(f, lineNo, original)) allConsumed = false;
      }
      if (allConsumed) return;
      issues.push({
        line: lineNo,
        text: original,
        reason: "Diese Zeile mischt Kopfzeile und Dienst — bitte auf zwei Zeilen aufteilen.",
      });
      return;
    }

    const title = parseTitleLine(line);
    if (title) {
      if (title.month != null) declaredMonth = title.month;
      if (title.year != null) declaredYear = title.year;
      return;
    }

    // ---- data line
    const prefix = parseDatePrefix(line);
    if (prefix && "error" in prefix) {
      issues.push({ line: lineNo, text: original, reason: prefix.error });
      return;
    }
    if (prefix) {
      rows.push({
        line: lineNo,
        text: original,
        date: { y: prefix.y, m: prefix.m, d: prefix.d, bareDay: prefix.bareDay },
        weekday: prefix.weekday,
        rest: prefix.rest,
      });
      return;
    }

    // ---- table header row ("Datum | Zeit | Dienst")
    if (/^(datum|tag|date)\b/i.test(fields[0] ?? "") && !/\d/.test(line)) return;

    // ---- no date at the start
    if (/\d/.test(line)) {
      issues.push({
        line: lineNo,
        text: original,
        reason: "Am Anfang dieser Zeile steht kein Datum (Beispiel: 05.10.2026 | 07:00-14:00).",
      });
    } else {
      notes.push({ line: lineNo, text: original });
    }
  });

  // ---- resolve person
  const { id: personId, problem: personProblem } = personText
    ? matchPerson(personText, options.persons)
    : { id: null, problem: null };

  // ---- resolve month/year context
  const effectiveYear = declaredYear ?? options.assumeYear ?? null;
  const effectiveMonth = declaredMonth ?? options.assumeMonth ?? null;
  let needsYear = false;
  let needsMonth = false;
  const assumedYear = declaredYear == null && options.assumeYear != null ? options.assumeYear : null;

  const entries: AnalyzedWorkEntry[] = [];

  for (const row of rows) {
    let { y, m } = row.date;
    const d = row.date.d;
    if (row.date.bareDay) {
      if (effectiveMonth == null) {
        needsMonth = true;
        continue;
      }
      m = effectiveMonth;
    }
    if (y == null) {
      if (effectiveYear != null) {
        // A December roster may list 1–3 January (and vice versa) without a year.
        y = effectiveYear;
        if (declaredMonth === 12 && m === 1) y = effectiveYear + 1;
        else if (declaredMonth === 1 && m === 12) y = effectiveYear - 1;
      } else {
        needsYear = true;
        continue;
      }
    }
    if (!isRealDate(y, m, d)) {
      issues.push({ line: row.line, text: row.text, reason: `Das Datum ${pad2(d)}.${pad2(m)}.${y} gibt es nicht.` });
      continue;
    }
    const iso = `${y}-${pad2(m)}-${pad2(d)}`;
    const built = buildEntry(row, iso);
    if ("issue" in built) {
      issues.push({ line: row.line, text: row.text, reason: built.issue });
      continue;
    }
    entries.push(built.entry);
  }

  // ---- duplicates
  const sorted = entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.date.localeCompare(b.e.date) || a.i - b.i)
    .map((x) => x.e);
  const deduped: AnalyzedWorkEntry[] = [];
  for (const e of sorted) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.date === e.date && describeEntry(prev) === describeEntry(e) && prev.status === e.status) {
      notes.push({ text: `Doppelte Zeile für ${formatIso(e.date)} entfernt (gleicher Eintrag zweimal).` });
      continue;
    }
    deduped.push(e);
  }

  // ---- missing calendar days of the declared month
  const missingDays: string[] = [];
  if (declaredMonth != null && (declaredYear ?? options.assumeYear) != null) {
    const y = (declaredYear ?? options.assumeYear)!;
    const have = new Set(deduped.map((e) => e.date));
    for (let day = 1; day <= daysInMonth(y, declaredMonth); day++) {
      const iso = `${y}-${pad2(declaredMonth)}-${pad2(day)}`;
      if (!have.has(iso)) missingDays.push(iso);
    }
    if (deduped.length === 0) missingDays.length = 0;
  }

  return {
    personText,
    personId,
    personProblem,
    declared: { month: declaredMonth, year: declaredYear },
    entries: deduped,
    issues,
    notes,
    missingDays,
    needsYear,
    needsMonth,
    assumedYear,
  };
}

function formatIso(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function buildEntry(
  row: RawRow,
  iso: string,
): { entry: AnalyzedWorkEntry } | { issue: string } {
  const weekday = row.weekday ?? undefined;
  const weekdayMismatch = weekday ? !weekdayMatches(iso, weekday) : false;

  const cleanedRest = row.rest
    .replace(/^[\s|;\t:,\-–—]+/, "")
    .replace(/\s*[|;\t]\s*/g, " | ")
    .trim();
  if (!cleanedRest) {
    return { issue: "Zu diesem Datum fehlt die Angabe (Zeit, „Frei“, „Urlaub“, „Krankenstand“ oder „Unklar“)." };
  }

  const fields = cleanedRest.split(" | ").map((f) => f.trim()).filter(Boolean);
  const ranges = findRanges(cleanedRest);

  const base = (partial: Partial<AnalyzedWorkEntry> & Pick<AnalyzedWorkEntry, "label" | "status">): AnalyzedWorkEntry => {
    const entry: AnalyzedWorkEntry = {
      date: iso,
      weekday,
      start: "",
      end: "",
      location: "",
      ...partial,
    };
    if (weekdayMismatch) entry.uncertain = true;
    return entry;
  };

  // ---- explicit "unclear"
  if (fields.length === 1 && UNCLEAR_RE.test(fields[0]!)) {
    return {
      entry: base({ label: "Unklar", status: "other", uncertain: true, baseUncertain: true }),
    };
  }

  // ---- day-off statuses
  const statusField = fields.find((f) => FREE_RE.test(f) || VACATION_RE.test(f) || SICK_RE.test(f));
  if (statusField) {
    if (ranges.length > 0) {
      return { issue: "Hier stehen ein freier Tag/Urlaub/Krankenstand UND eine Arbeitszeit — das passt nicht zusammen." };
    }
    let status: Exclude<WorkDayStatus, "work"> = "free";
    let m: RegExpExecArray | null;
    if ((m = VACATION_RE.exec(statusField))) status = "vacation";
    else if ((m = SICK_RE.exec(statusField))) status = "sick";
    else m = FREE_RE.exec(statusField);
    const extra = (m?.[2] ?? "").replace(/^[\s,:()\-–—]+|[\s()]+$/g, "");
    const others = fields.filter((f) => f !== statusField);
    const notes = [extra, ...others].filter(Boolean).join(" · ");
    return {
      entry: base({
        label: STATUS_LABEL[status],
        status,
        ...(notes ? { notes: notes.slice(0, 160) } : {}),
      }),
    };
  }

  // ---- work with a time range
  if (ranges.length > 1) {
    return { issue: "Mehrere Zeiträume in einer Zeile (geteilter Dienst) — bitte als einen Zeitraum angeben." };
  }
  if (ranges.length === 1) {
    const r = ranges[0]!;
    if (r.start === r.end) {
      return { issue: `Beginn und Ende sind gleich (${r.start}) — bitte prüfen.` };
    }
    const leftover = cleanedRest
      .replace(r.raw, " ")
      .split(/\s*\|\s*|\s{2,}/)
      .map((f) => f.replace(/^[\s,:\-–—]+|[\s,:\-–—]+$/g, ""))
      .filter(Boolean);

    let label = "Arbeit";
    let location = "";
    const noteParts: string[] = [];
    for (const piece of leftover) {
      const lm = WORK_LABEL_RE.exec(piece);
      if (lm && label === "Arbeit") {
        label = titleCase(lm[1]!);
        const tail = lm[2]!.trim();
        if (tail) location = location || tail;
      } else if (!location) {
        location = piece;
      } else {
        noteParts.push(piece);
      }
    }

    const overnight = r.end < r.start;
    const isNight = /nacht/i.test(label);
    const uncertain = !r.confident || (overnight && !isNight) || weekdayMismatch;
    if (overnight) noteParts.unshift("endet am Folgetag");
    return {
      entry: base({
        label,
        status: "work",
        start: r.start,
        end: r.end,
        location: location.slice(0, 60),
        ...(noteParts.length ? { notes: noteParts.join(" · ").slice(0, 160) } : {}),
        uncertain,
        baseUncertain: !r.confident || (overnight && !isNight),
      }),
    };
  }

  // ---- no time, no status: a work label without times, or an unknown code
  const first = fields[0]!;
  const wl = WORK_LABEL_RE.exec(first);
  if (wl && fields.length <= 2) {
    return {
      entry: base({
        label: titleCase(wl[1]!),
        status: "work",
        timeUnclear: true,
        uncertain: true,
        baseUncertain: true,
      }),
    };
  }
  if (fields.length === 1 && /^[A-Za-zÄÖÜäöü]{1,4}\d{0,2}$/.test(first)) {
    const code = first.toUpperCase();
    return {
      entry: base({
        label: code,
        status: "other",
        code,
        unresolvedCode: true,
        uncertain: true,
        baseUncertain: true,
      }),
    };
  }

  return { issue: `„${cleanedRest}“ ist weder eine Uhrzeit noch Frei/Urlaub/Krankenstand/Unklar.` };
}

// ----------------------------------------------------------------------------- result

export const UNCLEAR_LABEL = "Unklar";

/** A day the text marked "Unklar" — it must be turned into a real status (or removed) before saving. */
export function isUnclearEntry(e: Pick<AnalyzedWorkEntry, "status" | "label">): boolean {
  return e.status === "other" && e.label.trim().toLowerCase() === "unklar";
}

export function buildAnalysisFromText(outcome: TextImportOutcome): PlanAnalysisResult {
  const { declared, assumedYear } = outcome;
  const year = declared.year ?? assumedYear;
  const period: PlanPeriod = (() => {
    if (declared.month != null && year != null) {
      return { month: declared.month, year, monthCertain: true, yearCertain: assumedYear == null };
    }
    const months = new Set(outcome.entries.map((e) => Number(e.date.slice(5, 7))));
    const years = new Set(outcome.entries.map((e) => Number(e.date.slice(0, 4))));
    return {
      month: months.size === 1 ? [...months][0]! : null,
      year: years.size === 1 ? [...years][0]! : null,
      monthCertain: months.size === 1,
      yearCertain: assumedYear == null && years.size === 1,
    };
  })();

  const plausibility = checkPlausibility(outcome.entries, period);
  const uncertainties: UncertaintyMark[] = [...plausibility.uncertainties];

  plausibility.entries.forEach((e, index) => {
    const path = `entries.${index}`;
    if (e.weekday && !weekdayMatches(e.date, e.weekday)) {
      uncertainties.push({ path: `${path}.date`, reason: "Wochentag passt nicht zum Datum" });
    }
    if (isUnclearEntry(e)) {
      uncertainties.push({ path, reason: "Im Text als „Unklar“ markiert — bitte Status wählen oder Tag entfernen" });
    } else if (e.unresolvedCode && e.code) {
      uncertainties.push({ path, reason: `Unbekannter Dienstcode „${e.code}“ — Bedeutung bitte bestätigen` });
    } else if (e.timeUnclear) {
      uncertainties.push({ path: `${path}.start`, reason: "Zeit nicht angegeben — bitte ergänzen" });
    } else if (e.status === "work" && e.uncertain && !e.timeUnclear) {
      const overnight = e.end < e.start;
      if (overnight && !/nacht/i.test(e.label)) {
        uncertainties.push({ path: `${path}.end`, reason: "Ende liegt vor Beginn — Nachtdienst? Bitte bestätigen" });
      } else if (e.baseUncertain) {
        uncertainties.push({
          path: `${path}.start`,
          reason: `Zeitangabe ${e.start}–${e.end} wurde aus Stunden ohne Minuten gelesen — bitte bestätigen`,
        });
      }
    }
  });

  const warnings: string[] = [];
  if (outcome.missingDays.length > 0) {
    warnings.push(`Es fehlen ${outcome.missingDays.length} Tage: ${summarizeDays(outcome.missingDays)}`);
  }
  for (const n of outcome.notes) warnings.push(n.line ? `Zeile ${n.line} nicht verwendet: „${n.text}“` : n.text);

  const unknownCodes = [
    ...new Set(plausibility.entries.filter((e) => e.unresolvedCode && e.code).map((e) => e.code as string)),
  ];

  return {
    mode: "work",
    source: "text",
    confidence: 1,
    draft: { type: "work", entries: plausibility.entries },
    uncertainties,
    warnings,
    period,
    unknownCodes,
  };
}

/** "3., 17.–19., 30." for a list of ISO dates of the same month. */
export function summarizeDays(isoDays: string[]): string {
  const nums = isoDays.map((d) => Number(d.slice(8, 10))).sort((a, b) => a - b);
  const parts: string[] = [];
  let i = 0;
  while (i < nums.length) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j]! + 1) j++;
    parts.push(j > i + 1 ? `${nums[i]}.–${nums[j]}.` : nums.slice(i, j + 1).map((n) => `${n}.`).join(", "));
    i = j + 1;
  }
  return parts.join(", ");
}

