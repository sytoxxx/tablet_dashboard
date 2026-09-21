/**
 * Robust, honest clock-time parsing for uploaded rosters. Every accepted
 * format must be unambiguous on its own — a token that could plausibly mean
 * more than one thing (e.g. a bare "6" with no other signal) is refused
 * rather than guessed. Callers treat `null` as "not recognized", never as
 * license to invent a time.
 */

const STRICT_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Normalizes a single clock-time token ("06.00", "6:00", "0600", "06 Uhr", …) to strict "HH:MM", or null. */
export function normalizeTimeToken(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  if (STRICT_RE.test(t)) return t;

  let m = /^([01]?\d|2[0-3])[.,]([0-5]\d)$/.exec(t);
  if (m) return `${pad2(Number(m[1]))}:${m[2]}`;

  m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(t);
  if (m) return `${pad2(Number(m[1]))}:${m[2]}`;

  m = /^([01]\d|2[0-3])([0-5]\d)$/.exec(t);
  if (m) return `${m[1]}:${m[2]}`;

  m = /^([01]?\d|2[0-3])\s*(?:uhr|h)$/i.exec(t);
  if (m) return `${pad2(Number(m[1]))}:00`;

  return null;
}

const RANGE_RE =
  /^([01]?\d|2[0-3])(?:[.:]([0-5]\d))?\s*(?:-|–|—|bis)\s*([01]?\d|2[0-3])(?:[.:]([0-5]\d))?$/i;

export type TimeRangeParse = { start: string; end: string; confident: boolean };

/**
 * Splits a single combined-range token ("06:00–14:00", "06.00-14.00",
 * "6-14", "08:00 bis 16:00") into start/end. A range with an explicit
 * minute separator on either side is `confident`; a bare "6-14"-style
 * hour-only range is syntactically valid but genuinely ambiguous (could be
 * shorthand, could be something else), so it comes back `confident: false`
 * — the caller must still flag it for review, not treat it as settled.
 */
export function parseTimeRangeToken(raw: unknown): TimeRangeParse | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  const m = RANGE_RE.exec(t);
  if (!m) return null;
  const startH = Number(m[1]);
  const endH = Number(m[3]);
  if (startH > 23 || endH > 23) return null;
  const startM = m[2] ?? "00";
  const endM = m[4] ?? "00";
  return {
    start: `${pad2(startH)}:${startM}`,
    end: `${pad2(endH)}:${endM}`,
    confident: Boolean(m[2] || m[4]),
  };
}
