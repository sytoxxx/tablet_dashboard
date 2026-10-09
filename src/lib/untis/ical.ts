/**
 * Minimal, honest iCalendar (RFC 5545) reader for the WebUntis "iCal-Abo" feed.
 *
 * It reads only what is really in the feed: start/end, SUMMARY, LOCATION, DESCRIPTION and
 * STATUS. It never derives a teacher, a substitution or a room from guesses — those are shown
 * only if the feed literally says so (see `info`, `cancelled`). Recurring events (RRULE) are not
 * expanded; they are counted so the UI can say so instead of silently dropping them.
 */

export const SCHOOL_TZ = "Europe/Vienna";

export type UntisEvent = {
  /** Stable key: UID or date+start+summary. */
  id: string;
  /** Local date in the school's time zone, YYYY-MM-DD. */
  date: string;
  /** Local start / end, HH:MM. */
  start: string;
  end: string;
  subject: string;
  room: string;
  /** Free text of the feed (DESCRIPTION), trimmed — never interpreted. */
  info: string;
  /** True only when the feed says STATUS:CANCELLED. */
  cancelled: boolean;
};

export type IcalParseResult = {
  events: UntisEvent[];
  /** Human-readable notes about things that were not used (all-day items, recurring rules, …). */
  warnings: string[];
};

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function unfold(text: string): string[] {
  const raw = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

type Prop = { name: string; params: Record<string, string>; value: string };

function parseProp(line: string): Prop | null {
  const colon = (() => {
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuote = !inQuote;
      else if (c === ":" && !inQuote) return i;
    }
    return -1;
  })();
  if (colon < 1) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...paramParts] = head.split(";");
  const params: Record<string, string> = {};
  for (const p of paramParts) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: name!.toUpperCase(), params, value };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function partsInZone(date: Date, tz: string): { y: number; mo: number; d: number; h: number; mi: number } {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const get = (t: string) => Number(f.formatToParts(date).find((p) => p.type === t)!.value);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

export type LocalMoment = { date: string; time: string; allDay: boolean };

/** DTSTART/DTEND value → wall-clock date and time in the school's zone. */
export function toLocalMoment(prop: Prop): LocalMoment | null {
  const v = prop.value.trim();
  if (prop.params.VALUE === "DATE" || /^\d{8}$/.test(v)) {
    const m = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
    if (!m) return null;
    return { date: `${m[1]}-${m[2]}-${m[3]}`, time: "00:00", allDay: true };
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(v);
  if (!m) return null;
  const [, y, mo, d, h, mi, , z] = m;
  if (z) {
    const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi)));
    const p = partsInZone(date, SCHOOL_TZ);
    return { date: `${p.y}-${pad2(p.mo)}-${pad2(p.d)}`, time: `${pad2(p.h)}:${pad2(p.mi)}`, allDay: false };
  }
  const tzid = prop.params.TZID;
  if (tzid && tzid !== SCHOOL_TZ) {
    // Interpret the wall-clock time in the stated zone, then show it in the school's zone.
    try {
      let guess = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
      for (let i = 0; i < 2; i++) {
        const p = partsInZone(new Date(guess), tzid);
        const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
        guess += Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi)) - asUtc;
      }
      const p = partsInZone(new Date(guess), SCHOOL_TZ);
      return { date: `${p.y}-${pad2(p.mo)}-${pad2(p.d)}`, time: `${pad2(p.h)}:${pad2(p.mi)}`, allDay: false };
    } catch {
      return null;
    }
  }
  // Floating time or the school's own zone: the written clock time is what the school means.
  return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}`, allDay: false };
}

export function parseIcal(text: string): IcalParseResult {
  const lines = unfold(text);
  const events: UntisEvent[] = [];
  let allDay = 0;
  let recurring = 0;
  let broken = 0;

  let cur: Prop[] | null = null;
  for (const line of lines) {
    const t = line.trim();
    if (t.toUpperCase() === "BEGIN:VEVENT") {
      cur = [];
      continue;
    }
    if (t.toUpperCase() === "END:VEVENT") {
      if (cur) {
        const get = (n: string) => cur!.find((p) => p.name === n);
        const ds = get("DTSTART");
        const de = get("DTEND");
        if (get("RRULE")) recurring++;
        const start = ds ? toLocalMoment(ds) : null;
        const end = de ? toLocalMoment(de) : null;
        if (!start) {
          broken++;
        } else if (start.allDay) {
          allDay++;
        } else {
          const subject = unescapeText(get("SUMMARY")?.value ?? "").trim();
          const uid = get("UID")?.value.trim();
          events.push({
            id: uid ? `${uid}@${start.date}${start.time}` : `${start.date}-${start.time}-${subject}`,
            date: start.date,
            start: start.time,
            // A missing end is not invented: it stays equal to the start and the UI shows only the start.
            end: end && !end.allDay && end.date === start.date ? end.time : start.time,
            subject: subject || "(ohne Titel)",
            room: unescapeText(get("LOCATION")?.value ?? "").trim(),
            info: unescapeText(get("DESCRIPTION")?.value ?? "").trim(),
            cancelled: (get("STATUS")?.value ?? "").trim().toUpperCase() === "CANCELLED",
          });
        }
      }
      cur = null;
      continue;
    }
    if (cur) {
      const p = parseProp(line);
      if (p) cur.push(p);
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const warnings: string[] = [];
  if (allDay > 0) warnings.push(`${allDay} ganztägige Einträge werden nicht als Stunden angezeigt.`);
  if (recurring > 0) warnings.push(`${recurring} Einträge mit Wiederholungsregel werden nur einmal gezeigt.`);
  if (broken > 0) warnings.push(`${broken} Einträge ohne lesbare Startzeit wurden übersprungen.`);
  return { events, warnings };
}
