import type { WeekdayKey, WorkDayStatus } from "@/lib/types";
import { WEEKDAY_ORDER } from "@/lib/format";
import type {
  AnalyzedSchoolLesson,
  AnalyzedWorkEntry,
  PlanAnalysisMode,
  PlanAnalysisResult,
  PlanDraft,
  PlanPeriod,
  SchoolPlanDraft,
  UncertaintyMark,
} from "@/lib/plan-analysis/types";
import { computePeriod, isIsoDate, resolvePlanDate, weekdayMatches } from "@/lib/plan-analysis/plan-date";
import { checkPlausibility } from "@/lib/plan-analysis/plausibility";
import { normalizeTimeToken, parseTimeRangeToken } from "@/lib/plan-analysis/time";

const MAX_ENTRIES = 62; // ~2 months of daily rows — generous, still bounded

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const BARE_CODE_RE = /^[A-ZÄÖÜ]{1,4}$/;

function isWeekday(value: string): value is WeekdayKey {
  return (WEEKDAY_ORDER as string[]).includes(value);
}

function cleanText(value: unknown, max = 80): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value
    .trim()
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

function parseLesson(
  raw: unknown,
  path: string,
  uncertainties: UncertaintyMark[],
): AnalyzedSchoolLesson | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const time = cleanText(obj.time, 5);
  const subject = cleanText(obj.subject, 60);
  const room = cleanText(obj.room, 40);
  if (!time || !TIME_RE.test(time) || !subject) return null;

  const lesson: AnalyzedSchoolLesson = {
    id: cleanText(obj.id, 40) ?? `lesson-${path}`,
    time,
    subject,
    room: room ?? "?",
    uncertain: Boolean(obj.uncertain) || !room || room === "?",
  };

  if (Array.isArray(obj.bringItems)) {
    const items = obj.bringItems
      .map((i) => cleanText(i, 40))
      .filter((i): i is string => Boolean(i));
    if (items.length) lesson.bringItems = items;
  }

  if (!room || room === "?") {
    uncertainties.push({ path: `${path}.room`, reason: "Raum unklar oder fehlend" });
    lesson.uncertain = true;
  }
  if (obj.uncertain) {
    uncertainties.push({ path, reason: "Vom Modell als unsicher markiert" });
  }

  return lesson;
}

const NON_WORK_STATUSES = new Set<WorkDayStatus>(["free", "vacation", "sick", "other"]);

const NON_WORK_LABEL: Record<Exclude<WorkDayStatus, "work">, string> = {
  free: "Frei",
  vacation: "Urlaub",
  sick: "Krankenstand",
  other: "Sonstiges",
};

/** Label-text fallback for models/manual entries that omit the status field. */
function statusFromLabel(label: string): Exclude<WorkDayStatus, "work"> | null {
  const t = label.trim().toLowerCase();
  if (/^frei\b/.test(t)) return "free";
  if (/urlaub/.test(t)) return "vacation";
  if (/krank/.test(t)) return "sick";
  return null;
}

function isWeekdayValue(value: unknown): value is WeekdayKey {
  return typeof value === "string" && isWeekday(value);
}

/** Resolves a start/end time pair as robustly as possible without ever inventing a value. */
function resolveShiftTimes(
  obj: Record<string, unknown>,
): { start: string; end: string; timeUnclear: boolean; timeLowConfidence: boolean } {
  const rawStart = typeof obj.start === "string" ? obj.start : "";
  const rawEnd = typeof obj.end === "string" ? obj.end : "";

  const normStart = normalizeTimeToken(rawStart);
  const normEnd = normalizeTimeToken(rawEnd);
  if (normStart && normEnd) {
    return { start: normStart, end: normEnd, timeUnclear: false, timeLowConfidence: false };
  }

  // The AI (or a merged OCR cell) sometimes returns the whole shift as one
  // combined range in `start` when `end` is missing — split it defensively.
  if (!rawEnd && rawStart) {
    const range = parseTimeRangeToken(rawStart);
    if (range) {
      return {
        start: range.start,
        end: range.end,
        timeUnclear: false,
        timeLowConfidence: !range.confident,
      };
    }
  }

  return { start: "", end: "", timeUnclear: true, timeLowConfidence: false };
}

/**
 * A dated work-plan row. The date is resolved from either an already-ISO
 * `date` field or a `day`/`month`(/`year`) triple relative to `referenceDate`
 * — the year is only ever inferred when genuinely absent from the plan, by
 * picking whichever year lands closest to today; never a fabricated date.
 * A row whose date cannot be determined at all is dropped, not guessed.
 */
function parseWorkEntry(
  raw: unknown,
  path: string,
  uncertainties: UncertaintyMark[],
  referenceDate: Date,
  legend: Map<string, string>,
  yearInferred: { value: boolean },
): AnalyzedWorkEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  let iso: string | null = null;
  if (isIsoDate(obj.date)) {
    iso = obj.date;
  } else if (typeof obj.day === "number" && typeof obj.month === "number") {
    const hasExplicitYear = typeof obj.year === "number";
    if (!hasExplicitYear) yearInferred.value = true;
    iso = resolvePlanDate(
      {
        day: obj.day,
        month: obj.month,
        year: hasExplicitYear ? (obj.year as number) : undefined,
      },
      referenceDate,
    );
  }
  if (!iso) return null;

  const weekday = isWeekdayValue(obj.weekday) ? obj.weekday : undefined;

  const label = cleanText(obj.label, 80);
  const rawStatus = typeof obj.status === "string" ? obj.status : null;
  const explicitStatus =
    rawStatus && NON_WORK_STATUSES.has(rawStatus as WorkDayStatus)
      ? (rawStatus as Exclude<WorkDayStatus, "work">)
      : null;
  const status = explicitStatus ?? (label ? statusFromLabel(label) : null);

  const weekdayMismatch = weekday ? !weekdayMatches(iso, weekday) : false;

  if (status) {
    // A day off — never require or invent start/end/location for it.
    const entry: AnalyzedWorkEntry = {
      date: iso,
      weekday,
      label: label ?? NON_WORK_LABEL[status],
      start: "",
      end: "",
      location: "",
      status,
      uncertain: Boolean(obj.uncertain) || weekdayMismatch,
      baseUncertain: Boolean(obj.uncertain),
    };
    const notes = cleanText(obj.notes, 160);
    if (notes) entry.notes = notes;
    if (weekdayMismatch) {
      uncertainties.push({ path: `${path}.date`, reason: "Wochentag passt nicht zum Datum" });
    }
    return entry;
  }

  const codeRaw = cleanText(obj.code, 8) ?? (label && BARE_CODE_RE.test(label) ? label : null);
  const start0 = typeof obj.start === "string" ? obj.start.trim() : "";
  const end0 = typeof obj.end === "string" ? obj.end.trim() : "";

  // A bare duty code with no times at all: never assume "Arbeit" — resolve
  // via the document's own legend, or surface it as needing a user answer.
  if (codeRaw && !start0 && !end0) {
    const meaning = legend.get(codeRaw.toUpperCase());
    if (meaning) {
      const meaningStatus = statusFromLabel(meaning);
      if (meaningStatus) {
        const entry: AnalyzedWorkEntry = {
          date: iso,
          weekday,
          label: meaning,
          start: "",
          end: "",
          location: "",
          status: meaningStatus,
          code: codeRaw,
          uncertain: weekdayMismatch,
          baseUncertain: false,
        };
        if (weekdayMismatch) {
          uncertainties.push({ path: `${path}.date`, reason: "Wochentag passt nicht zum Datum" });
        }
        return entry;
      }
      // Legend resolves the code to a work-type label, but no times were
      // given for it — still real information (not free/off), still needs a time.
      const entry: AnalyzedWorkEntry = {
        date: iso,
        weekday,
        label: meaning,
        start: "",
        end: "",
        location: "",
        status: "other",
        code: codeRaw,
        timeUnclear: true,
        uncertain: true,
        baseUncertain: true,
      };
      uncertainties.push({
        path: `${path}.start`,
        reason: `Zeiten für „${meaning}“ (Code ${codeRaw}) nicht angegeben`,
      });
      return entry;
    }
    const entry: AnalyzedWorkEntry = {
      date: iso,
      weekday,
      label: codeRaw,
      start: "",
      end: "",
      location: "",
      status: "other",
      code: codeRaw,
      unresolvedCode: true,
      uncertain: true,
      baseUncertain: true,
    };
    uncertainties.push({
      path,
      reason: `Unbekannter Dienstcode „${codeRaw}“ — Bedeutung bitte bestätigen`,
    });
    return entry;
  }

  if (!label) return null;

  const location = cleanText(obj.location, 60);
  const { start, end, timeUnclear, timeLowConfidence } = resolveShiftTimes(obj);

  if (timeUnclear) {
    // The date and label ARE real — keep the row visible instead of making the whole day vanish.
    const entry: AnalyzedWorkEntry = {
      date: iso,
      weekday,
      label,
      start: "",
      end: "",
      location: location ?? "",
      status: "work",
      timeUnclear: true,
      uncertain: true,
      baseUncertain: true,
    };
    const rawShown = [start0, end0].filter(Boolean).join(codeRaw ? " " : "–") || start0 || end0;
    uncertainties.push({
      path: `${path}.start`,
      reason: rawShown
        ? `Zeit nicht eindeutig erkannt (Rohtext: „${rawShown}“)`
        : "Zeit nicht angegeben",
    });
    return entry;
  }

  const entry: AnalyzedWorkEntry = {
    date: iso,
    weekday,
    label,
    start,
    end,
    location: location ?? "?",
    status: "work",
    uncertain: Boolean(obj.uncertain) || !location || location === "?" || weekdayMismatch || timeLowConfidence,
    baseUncertain: Boolean(obj.uncertain) || !location || location === "?" || timeLowConfidence,
  };

  const notes = cleanText(obj.notes, 160);
  if (notes) entry.notes = notes;

  if (Array.isArray(obj.bringItems)) {
    const items = obj.bringItems
      .map((i) => cleanText(i, 40))
      .filter((i): i is string => Boolean(i));
    if (items.length) entry.bringItems = items;
  }

  if (!location || location === "?") {
    uncertainties.push({ path: `${path}.location`, reason: "Ort unklar oder fehlend" });
  }
  if (weekdayMismatch) {
    uncertainties.push({ path: `${path}.date`, reason: "Wochentag passt nicht zum Datum" });
  }
  if (timeLowConfidence) {
    uncertainties.push({
      path: `${path}.start`,
      reason: `Zeitangabe „${start0}“ ist mehrdeutig (kein klarer Minuten-Trenner) — bitte bestätigen`,
    });
  }

  return entry;
}

export function validatePlanAnalysis(
  raw: unknown,
  expectedMode: PlanAnalysisMode,
  referenceDate: Date = new Date(),
): { ok: true; result: PlanAnalysisResult } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Ungültige Analyse-Antwort." };
  }

  const obj = raw as Record<string, unknown>;
  const mode = obj.mode === "school" || obj.mode === "work" ? obj.mode : expectedMode;
  if (mode !== expectedMode) {
    return { ok: false, error: `Erwartet ${expectedMode}, erhalten ${String(obj.mode)}.` };
  }

  const source = obj.source === "ai" ? "ai" : "mock";
  const confidence =
    typeof obj.confidence === "number" && obj.confidence >= 0 && obj.confidence <= 1
      ? obj.confidence
      : 0.5;

  const warnings = Array.isArray(obj.warnings)
    ? obj.warnings.filter((w): w is string => typeof w === "string").slice(0, 20)
    : [];

  const uncertainties: UncertaintyMark[] = [];
  const draftRaw = obj.draft;
  if (!draftRaw || typeof draftRaw !== "object") {
    return { ok: false, error: "Draft fehlt in der Analyse." };
  }
  const draftObj = draftRaw as Record<string, unknown>;

  let draft: PlanDraft;
  let period: PlanPeriod | undefined;
  let legendOut: Record<string, string> | undefined;
  let unknownCodes: string[] | undefined;

  if (mode === "school") {
    const weekRaw = draftObj.week;
    if (!weekRaw || typeof weekRaw !== "object") {
      return { ok: false, error: "Stundenplan fehlt." };
    }
    const week: SchoolPlanDraft["week"] = {};
    for (const [key, value] of Object.entries(weekRaw as Record<string, unknown>)) {
      if (!isWeekday(key)) continue;
      const day = value as { lessons?: unknown };
      if (!day || !Array.isArray(day.lessons)) continue;
      const lessons = day.lessons
        .map((lesson, index) =>
          parseLesson(lesson, `week.${key}.lessons.${index}`, uncertainties),
        )
        .filter((l): l is AnalyzedSchoolLesson => Boolean(l));
      if (lessons.length) week[key] = { lessons };
    }
    if (Object.keys(week).length === 0) {
      return { ok: false, error: "Keine gültigen Unterrichtsstunden erkannt." };
    }
    draft = { type: "school", week };
  } else {
    const entriesRaw = draftObj.entries;
    if (!Array.isArray(entriesRaw)) {
      return { ok: false, error: "Arbeitsplan-Einträge fehlen." };
    }

    const legendRaw = obj.legend;
    const legend = new Map<string, string>();
    if (legendRaw && typeof legendRaw === "object") {
      for (const [code, meaning] of Object.entries(legendRaw as Record<string, unknown>)) {
        const cleanCode = cleanText(code, 8);
        const cleanMeaning = cleanText(meaning, 60);
        if (cleanCode && cleanMeaning) legend.set(cleanCode.toUpperCase(), cleanMeaning);
      }
    }

    const yearInferred = { value: false };
    let entries = entriesRaw
      .slice(0, MAX_ENTRIES)
      .map((row, index) =>
        parseWorkEntry(row, `entries.${index}`, uncertainties, referenceDate, legend, yearInferred),
      )
      .filter((e): e is AnalyzedWorkEntry => Boolean(e))
      // Stable chronological order regardless of the order the plan listed them in.
      .sort((a, b) => a.date.localeCompare(b.date));
    if (entries.length === 0) {
      return { ok: false, error: "Keine gültigen, datierten Schichten erkannt." };
    }

    period = computePeriod(entries, yearInferred.value);
    const plausibility = checkPlausibility(entries, period);
    entries = plausibility.entries;
    uncertainties.push(...plausibility.uncertainties);

    unknownCodes = [
      ...new Set(
        entries.filter((e) => e.unresolvedCode && e.code).map((e) => e.code as string),
      ),
    ];
    legendOut = Object.fromEntries(legend);

    draft = { type: "work", entries };
  }

  if (Array.isArray(obj.uncertainties)) {
    for (const u of obj.uncertainties) {
      if (u && typeof u === "object") {
        const path = cleanText((u as UncertaintyMark).path, 120);
        const reason = cleanText((u as UncertaintyMark).reason, 160);
        if (path && reason) uncertainties.push({ path, reason });
      }
    }
  }

  return {
    ok: true,
    result: {
      mode,
      source,
      confidence,
      draft,
      uncertainties,
      warnings,
      period,
      legend: legendOut,
      unknownCodes,
    },
  };
}
