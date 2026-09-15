/**
 * Minimal TRIAS/XML helpers — no invented schema fields.
 * Based on VDV 431 / Verbund Linie FAQ (Param, not StopEventParam).
 *
 * Steiermark OGD responses use prefixed tags (`trias:StopPointRef`); requests
 * often omit prefixes. Match both.
 */

/** Local-name match with optional XML namespace prefix. */
function nsTag(tag: string): string {
  return `(?:\\w+:)?${tag}`;
}

export function matchTag(xml: string, tag: string): string | null {
  const t = nsTag(tag);
  const re = new RegExp(`<${t}(?:\\s[^>]*)?>([^<]*)</${t}>`, "i");
  const m = xml.match(re);
  return m?.[1]?.trim() || null;
}

/** Prefer direct text, else nested `<Text>` (common in TRIAS name elements). */
export function matchTagOrText(xml: string, tag: string): string | null {
  const t = nsTag(tag);
  const block = xml.match(
    new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`, "i"),
  );
  if (!block) return null;
  const inner = block[1];
  if (!inner.includes("<")) return inner.trim() || null;
  const text = matchTag(inner, "Text");
  if (text) return text;
  const stripped = stripXml(inner.replace(/<[^>]+>/g, " ")).trim();
  return stripped || null;
}

export function matchBooleanTag(xml: string, tag: string): boolean {
  const v = matchTag(xml, tag);
  if (!v) return false;
  return /^(true|1|yes)$/i.test(v.trim());
}

export function extractHHMM(value: string): string | null {
  const m = value.match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : null;
}

/** Parse ISO / TRIAS dateTime to minutes since midnight (local wall clock of the string). */
export function dateTimeToMinutes(value: string): number | null {
  const hhmm = extractHHMM(value);
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function stripXml(value: string): string {
  return value.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Delay minutes from timetable vs estimate — only when both known; never invent. */
export function delayMinutesFromTimes(
  scheduledIso: string | null,
  estimatedIso: string | null,
): number | null {
  if (!scheduledIso || !estimatedIso) return null;
  const a = Date.parse(scheduledIso);
  const b = Date.parse(estimatedIso);
  if (Number.isFinite(a) && Number.isFinite(b)) {
    return Math.round((b - a) / 60_000);
  }
  const sm = dateTimeToMinutes(scheduledIso);
  const em = dateTimeToMinutes(estimatedIso);
  if (sm === null || em === null) return null;
  return em - sm;
}
