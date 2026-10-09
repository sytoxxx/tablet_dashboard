/**
 * Stage 1 of every plan analysis: UNDERSTAND the photo before extracting from
 * it. The model is asked only to judge the photo and describe the document
 * structure (kind, month/year, date headers, row labels, legend). Extraction
 * (stage 2) is only allowed after the deterministic checks here pass; anything
 * uncertain becomes a question to the user, never a guess.
 *
 * Shared by work rosters and school timetables; the type-specific parts are
 * kept separate on purpose — the two table formats must not be conflated.
 */
import {
  needsRowChoiceError,
  photoUnreadableError,
  wrongDocumentError,
} from "@/server/ai/errors";
import type { PlanAnalysisMode } from "@/lib/plan-analysis/types";

export type PhotoVerdict = "good" | "poor" | "unreadable";

export type Understanding = {
  quality: {
    verdict: PhotoVerdict;
    issues: string[];
    /** False when part of the plan is cut off or on another (missing) page. */
    wholeDocumentVisible: boolean;
  };
  documentKind: "work_roster" | "school_timetable" | "other";
  period: { month: number | null; year: number | null; evidence: string | null };
  layout: {
    /** Work: the person/row labels as printed, top to bottom. */
    employeeLabels: string[];
    /** Work: date header cells as printed. School: weekday header cells as printed. */
    headers: string[];
    /** School: the lesson-slot labels of the time column as printed. */
    timeSlots: string[];
  };
  targetRow: { label: string | null; confidence: number };
  legend: Record<string, string>;
};

const asString = (v: unknown, max = 80): string | null =>
  typeof v === "string" && v.trim() ? v.trim().replace(/[<>]/g, "").slice(0, max) : null;

const asStringList = (v: unknown, maxItems: number, max = 80): string[] =>
  Array.isArray(v)
    ? v.map((x) => asString(x, max)).filter((x): x is string => Boolean(x)).slice(0, maxItems)
    : [];

function asIntInRange(v: unknown, lo: number, hi: number): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi ? v : null;
}

/** Defensive parse. Anything missing or malformed degrades to "unknown" — never to "fine". */
export function parseUnderstanding(raw: unknown): Understanding {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const q = (o.quality && typeof o.quality === "object" ? o.quality : {}) as Record<string, unknown>;
  const verdict: PhotoVerdict =
    q.verdict === "good" || q.verdict === "poor" || q.verdict === "unreadable"
      ? q.verdict
      : "unreadable";
  const period = (o.period && typeof o.period === "object" ? o.period : {}) as Record<string, unknown>;
  const layout = (o.layout && typeof o.layout === "object" ? o.layout : {}) as Record<string, unknown>;
  const target = (o.targetRow && typeof o.targetRow === "object" ? o.targetRow : {}) as Record<string, unknown>;

  const legend: Record<string, string> = {};
  if (o.legend && typeof o.legend === "object") {
    for (const [code, meaning] of Object.entries(o.legend as Record<string, unknown>)) {
      const c = asString(code, 8);
      const m = asString(meaning, 60);
      if (c && m) legend[c] = m;
    }
  }

  const confidence =
    typeof target.confidence === "number" && target.confidence >= 0 && target.confidence <= 1
      ? target.confidence
      : 0;

  return {
    quality: {
      verdict,
      issues: asStringList(q.issues, 10, 40),
      wholeDocumentVisible: q.wholeDocumentVisible === true,
    },
    documentKind:
      o.documentKind === "work_roster" || o.documentKind === "school_timetable"
        ? o.documentKind
        : "other",
    period: {
      month: asIntInRange(period.month, 1, 12),
      year: asIntInRange(period.year, 2000, 2100),
      evidence: asString(period.evidence, 60),
    },
    layout: {
      employeeLabels: asStringList(layout.employeeLabels, 60),
      headers: asStringList(layout.headers ?? layout.dateHeaders ?? layout.dayHeaders, 62, 30),
      timeSlots: asStringList(layout.timeSlots, 20, 30),
    },
    targetRow: { label: asString(target.label, 80), confidence },
    legend,
  };
}

/** Throws photo_unreadable / wrong_document when the photo or document cannot be used at all. */
export function assertUsable(u: Understanding, planType: PlanAnalysisMode): void {
  if (u.quality.verdict === "unreadable") throw photoUnreadableError(u.quality.issues);
  // Missing days/columns would be silently absent from the saved plan — refuse instead.
  if (!u.quality.wholeDocumentVisible) {
    throw photoUnreadableError(["cropped", ...u.quality.issues.filter((i) => i !== "cropped")]);
  }
  const expected = planType === "work" ? "work_roster" : "school_timetable";
  if (u.documentKind !== expected) throw wrongDocumentError(planType);
}

export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findLabel(labels: string[], wanted: string): string | null {
  const w = normalizeLabel(wanted);
  if (!w) return null;
  return labels.find((l) => normalizeLabel(l) === w) ?? null;
}

const ROW_CONFIDENCE_MIN = 0.75;

/**
 * Which printed row belongs to the person? `rowLabel` (the user's explicit
 * choice) always wins, `rowHint` (remembered from an earlier scan) only counts
 * if the document still contains it and the model does not point elsewhere.
 * Otherwise the model must be clearly confident — else the user is asked.
 * Returns null for a single-person document (no row to choose).
 */
export function decideTargetRow(
  u: Understanding,
  opts: { rowLabel?: string; rowHint?: string },
): string | null {
  const labels = u.layout.employeeLabels;

  if (opts.rowLabel) {
    if (labels.length === 0) return opts.rowLabel;
    const found = findLabel(labels, opts.rowLabel);
    if (!found) throw needsRowChoiceError(labels);
    return found;
  }

  if (labels.length <= 1) return labels[0] ?? null;

  const modelPick =
    u.targetRow.label && u.targetRow.confidence >= ROW_CONFIDENCE_MIN
      ? findLabel(labels, u.targetRow.label)
      : null;
  const hinted = opts.rowHint ? findLabel(labels, opts.rowHint) : null;

  if (hinted && (!u.targetRow.label || modelPick === hinted)) return hinted;
  if (modelPick) return modelPick;
  throw needsRowChoiceError(labels);
}

/* ---------------------------------- prompts ---------------------------------- */

export const UNDERSTAND_SYSTEM =
  "You are a careful document analyst. You do NOT extract the schedule in this step. You only (1) judge whether the photo is good enough to read reliably and (2) describe the structure of the document exactly as printed. Never guess: if something is not clearly legible, say so through the quality verdict instead of inventing it. Copy header and row texts exactly as printed. Never output HTML.";

export function understandPrompt(
  planType: PlanAnalysisMode,
  ctx: { personName: string; rowLabel?: string; rowHint?: string; referenceIso: string },
): string {
  const quality = `"quality": {"verdict":"good"|"poor"|"unreadable","issues":["blurry"|"cropped"|"glare"|"dark"|"tilted"|"small_print"|"missing_pages"...],"wholeDocumentVisible":true|false}. Use "unreadable" when you could not reliably read the table's text; "poor" when readable but with some doubtful cells; wholeDocumentVisible=false when part of the table is cut off or the photo shows only a section.`;
  if (planType === "work") {
    return `Today's date (context only): ${ctx.referenceIso}. The roster may show several employees (rows) and many days (columns), or only one person. Describe the document. Return JSON: { ${quality}, "documentKind":"work_roster"|"school_timetable"|"other", "period":{"month":1-12|null,"year":number|null,"evidence":"<the raw header text you read, e.g. 'September 2026'>"}, "layout":{"employeeLabels":["<every person/row label exactly as printed, top to bottom>"],"headers":["<every date header cell exactly as printed, left to right, e.g. '1 Mo','2 Di'>"]}, "targetRow":{"label":"<one of employeeLabels exactly as printed, or null>","confidence":0-1}, "legend":{"<code>":"<meaning exactly as printed>"} }. We need the row of the person "${ctx.personName}" — printed names may be abbreviated, reordered, or only a surname/initial.${ctx.rowLabel ? ` The user has identified the row "${ctx.rowLabel}" as theirs.` : ""}${ctx.rowHint ? ` On an earlier plan this person's row was printed as "${ctx.rowHint}" (a hint only — it must actually appear in this document).` : ""} Set targetRow.label to null (confidence 0) unless exactly one row clearly matches; never pick a row merely because it is first. Only fill "legend" from a legend/key that is actually printed in the document.`;
  }
  return `Describe the document. Return JSON: { ${quality}, "documentKind":"work_roster"|"school_timetable"|"other", "layout":{"headers":["<every weekday header cell exactly as printed, left to right>"],"timeSlots":["<every lesson-slot label of the time/period column exactly as printed, top to bottom>"]} }.`;
}

export function extractWorkPrompt(
  u: Understanding,
  ctx: { personName: string; personId: string; referenceIso: string; targetRow: string | null; pageCount: number },
): string {
  const pages =
    ctx.pageCount > 1
      ? `The following ${ctx.pageCount} images are consecutive pages/photos of the SAME roster — read them together as one document. `
      : "";
  const known = JSON.stringify({
    period: u.period,
    headers: u.layout.headers,
    employeeLabels: u.layout.employeeLabels,
    legend: u.legend,
  });
  const rowRule = ctx.targetRow
    ? `Extract ONLY the row labelled "${ctx.targetRow}". Never take any value from another row. Echo the row you used in "targetRowLabel" exactly as printed.`
    : `The document appears to contain a single person's schedule; extract every dated row.`;
  return `Person: ${ctx.personName} (${ctx.personId}). Plan type: work. Today's date (context only): ${ctx.referenceIso}. ${pages}Document analysis already made from this photo (use it, do not contradict it): ${known}. ${rowRule}
Return JSON: { "mode":"work","source":"ai","confidence":0-1,"warnings":string[],"uncertainties":[{path,reason}],"targetRowLabel":string|null,"legend":{"<code>":"<meaning>"}?,"draft":{"type":"work","entries":[ { "day":1-31,"month":1-12,"year"?:number,"weekday"?:"mon".."sun","code"?:string,"label":string,"start":string,"end":string,"location":string,"status":"work"|"free"|"vacation"|"sick"|"other","evidence":{"header":"<the date header cell printed for this column, copied exactly>","cell":"<the raw text inside this person's cell, copied exactly>"},"notes"?:string,"uncertain"?:boolean } ] } }.
Rules: (1) One entry per date that shows something for this person (a shift, a code, or an explicit day-off marker FREI/URLAUB/KRANKENSTAND). Omit blank dates. (2) The date comes ONLY from the header of the same column as the cell — copy that header into evidence.header and derive day/month from it (year from the document period; if the document shows no year anywhere, omit "year"). Never derive a date by counting, by position, or from another row. (3) "weekday" only if the header itself prints one. (4) Copy the cell text into evidence.cell and take times only from that text; write times as "HH:MM" (24h). If only an hour is legible set "uncertain":true and add an uncertainty quoting the raw text. (5) If the cell holds a code that the legend explains, set "code" and use the legend; if a code is NOT explained anywhere, set "code", leave label/status empty, and add an uncertainty — never guess a code's meaning from general knowledge. (6) For free/vacation/sick/other days leave start/end/location as empty strings. (7) "location": only if the plan prints one; otherwise "" — never invent it. (8) If anything is not clearly legible, set "uncertain":true and explain in uncertainties instead of guessing; if a whole region is unreadable, say so in warnings.`;
}

export const EXTRACT_WORK_SYSTEM =
  "You extract ONE person's dated work schedule from a roster photo, using a prior document analysis. You only report what is clearly visible. You never invent dates, times, locations, or the meaning of codes, and you never mix up rows or columns: every date must come from the header of the same column as the cell it labels. When unsure, mark the entry uncertain and say why. Never output HTML.";

export function extractSchoolPrompt(
  u: Understanding,
  ctx: { personName: string; personId: string; referenceIso: string; pageCount: number },
): string {
  const pages =
    ctx.pageCount > 1
      ? `The following ${ctx.pageCount} images are consecutive pages/photos of the SAME timetable — read them together. `
      : "";
  const known = JSON.stringify({ dayHeaders: u.layout.headers, timeSlots: u.layout.timeSlots });
  return `Person: ${ctx.personName} (${ctx.personId}). Plan type: school. Today's date (context only): ${ctx.referenceIso}. ${pages}Document analysis already made from this photo (use it, do not contradict it): ${known}.
Return JSON: { "mode":"school","source":"ai","confidence":0-1,"warnings":string[],"uncertainties":[{path,reason}],"draft":{"type":"school","week":{ "mon"?:{"lessons":[{"id":string,"time":"HH:MM","subject":string,"room":string,"evidence":{"dayHeader":"<the weekday header of this column, copied exactly>","slot":"<the time-slot label of this row, copied exactly>"},"bringItems"?:string[],"uncertain"?:boolean}]}, "tue"?:..., "wed"?:..., "thu"?:..., "fri"?:... } } }.
Rules: (1) A lesson belongs to the weekday printed in the header of ITS column — copy that header into evidence.dayHeader; never place a lesson by position or by counting. (2) "time" is the START time of the lesson as HH:MM (24h), taken from the time column / slot label. If the table only numbers its periods (1., 2., …) and the document prints no clock times for them, do NOT invent clock times: omit those lessons and add a warning that clock times are missing. (3) Include a lesson only if its cell has a subject. Free periods/empty cells are NOT lessons — omit them. (4) "room" only if printed; otherwise "". (5) Substitutions/changes (e.g. "Vertretung", "entfällt", crossed out) must not be silently applied: keep the original lesson, set "uncertain":true and describe the change in uncertainties. (6) If anything is not clearly legible set "uncertain":true and explain; never invent subjects, rooms or times.`;
}

export const EXTRACT_SCHOOL_SYSTEM =
  "You extract a weekly school timetable from a photo, using a prior document analysis. You only report what is clearly visible. You never invent subjects, rooms, times, or lessons for empty cells, and you never mix up weekday columns or time rows. When unsure, mark the lesson uncertain and say why. Never output HTML.";
