/**
 * Presentation-only work-commute bus glance.
 * Uses existing travel / connection / BusInfo signals — never invents
 * delay, cancel, or deviation.
 */
import type { TravelConnection, TravelLeg } from "@/lib/work/travel-types";
import type { TravelPlanStatus } from "@/lib/work/travel-planner";
import { getViennaMinutesSinceMidnight, parseTimeToMinutes } from "@/lib/format";

export type WorkBusAlertKind = "none" | "delay" | "cancelled" | "deviation";

/** One real upcoming departure — from live TRIAS/StopEvent data only, never invented. */
export type BusUpcomingEntry = {
  /** Vienna wall-clock HH:MM (display). */
  time: string;
  line: string;
  destination: string;
  status?: string | null;
  delayMinutes?: number | null;
  cancelled?: boolean | null;
  /**
   * Absolute departure instant (ISO-8601). When present, past/upcoming and the
   * countdown are decided on the real date+time — correct across midnight and
   * for tomorrow's first bus. Without it only the clock time is known.
   */
  iso?: string | null;
};

/** A bus that left less than this long ago still counts as "now" (clock skew / just boarding). */
const DEPARTED_GRACE_MS = 30_000;

function entryMs(e: BusUpcomingEntry): number | null {
  if (!e.iso) return null;
  const ms = Date.parse(e.iso);
  return Number.isFinite(ms) ? ms : null;
}

/** Minutes until the departure (rounded down), or null when only an unreliable clock time is known. */
export function minutesUntilEntry(e: BusUpcomingEntry, now: Date): number | null {
  const ms = entryMs(e);
  if (ms !== null) return Math.floor((ms - now.getTime()) / 60_000);
  if (!e.time) return null;
  return parseTimeToMinutes(e.time) - getViennaMinutesSinceMidnight(now);
}

/** "jetzt" · "in 7 Min." · "in 1 Std. 8 Min." — from the real instant when known. */
export function countdownLabel(e: BusUpcomingEntry, now: Date): string {
  const m = minutesUntilEntry(e, now);
  if (m === null) return "";
  if (m <= 0) return "jetzt";
  if (m < 60) return m === 1 ? "in 1 Min." : `in ${m} Min.`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `in ${h} Std.` : `in ${h} Std. ${r} Min.`;
}

const viennaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vienna" });

/** "morgen" when the bus leaves on a later Vienna calendar day than `now` (needs the absolute instant). */
export function departureDayHint(e: BusUpcomingEntry, now: Date): "morgen" | null {
  const ms = entryMs(e);
  if (ms === null) return null;
  return viennaDate.format(new Date(ms)) > viennaDate.format(now) ? "morgen" : null;
}

/**
 * The next real departures, relative to `now`: up to `limit` buses that still
 * run, plus any cancelled departure that would have left before the last of
 * them (shown as cancelled, never as a normal bus). Anything already departed
 * is dropped, duplicates collapse, and the list is never padded — fewer real
 * connections simply means fewer rows.
 */
export function selectUpcomingBusRows(
  upcoming: BusUpcomingEntry[] | null | undefined,
  now: Date,
  limit = 3,
): BusUpcomingEntry[] {
  if (!upcoming?.length) return [];
  const nowMinutes = getViennaMinutesSinceMidnight(now);

  const future = upcoming.filter((e) => {
    if (!e.time) return false;
    const ms = entryMs(e);
    if (ms !== null) return ms >= now.getTime() - DEPARTED_GRACE_MS;
    return parseTimeToMinutes(e.time) >= nowMinutes;
  });

  const sortKey = (e: BusUpcomingEntry) =>
    entryMs(e) ?? now.getTime() + (parseTimeToMinutes(e.time) - nowMinutes) * 60_000;
  const sorted = [...future].sort((a, b) => sortKey(a) - sortKey(b));

  const seen = new Set<string>();
  const unique = sorted.filter((e) => {
    const key = `${e.iso ?? e.time}|${e.line}|${e.destination}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let running = 0;
  let cut = unique.length;
  for (let i = 0; i < unique.length; i++) {
    const cancelled = Boolean(unique[i]!.cancelled) || unique[i]!.status === "CANCELLED";
    if (cancelled) continue;
    running += 1;
    if (running === limit) {
      cut = i + 1;
      break;
    }
  }
  return unique.slice(0, cut);
}

export type WorkBusGlance = {
  /** Mount the card only when true. */
  visible: boolean;
  title: string;
  kind: WorkBusAlertKind;
  /** Primary clock time (bus departure when known). */
  time: string | null;
  /** e.g. "Linie 1 → Bruck" */
  lineTarget: string | null;
  arrival: string | null;
  leaveHome: string | null;
  delayMinutes: number | null;
  /** Alert headline — only when kind !== none */
  alertTitle: string | null;
  /** Concrete change from data — never invented filler */
  alertDetail: string | null;
  /** Next usable connection when cancelled / no primary */
  nextTime: string | null;
  nextLineTarget: string | null;
  nextArrival: string | null;
  /** Quiet label when timetable is seed/cache — never present as live. */
  isTestData?: boolean;
  /** Small honest note shown under the card when the plan is only oriented on a typical time, not a confirmed shift. */
  hint: string | null;
};

type PlanLike = {
  mode?: string | null;
  status?: TravelPlanStatus | string | null;
  message?: string | null;
  leaveHome?: string | null;
  busDeparture?: string | null;
  arrivalAtWork?: string | null;
  arrivalAtDestination?: string | null;
  destinationLabel?: string | null;
  endDestinationLabel?: string | null;
  transitDestinationLabel?: string | null;
  isTestData?: boolean | null;
  legs?: TravelLeg[] | null;
  connections?: TravelConnection[] | null;
  alternativeConnection?: TravelConnection | null;
  bus?: {
    line?: string | null;
    destination?: string | null;
    departure?: string | null;
    scheduledDeparture?: string | null;
    realtimeDeparture?: string | null;
    delayMinutes?: number | null;
    cancelled?: boolean | null;
    estimatedArrivalHHmm?: string | null;
    status?: string | null;
    isTestData?: boolean | null;
  } | null;
};

function firstTransit(legs: TravelLeg[] | null | undefined): TravelLeg | null {
  if (!legs?.length) return null;
  return legs.find((leg) => leg.type === "TRANSIT") ?? null;
}

function lineTargetCopy(
  plan: PlanLike,
  connection?: TravelConnection | null,
): string | null {
  const legs = connection?.legs ?? plan.legs;
  const transit = firstTransit(legs);
  const line =
    transit?.line?.trim() ||
    connection?.lineSummary?.replace(/^Linie\s+/i, "").trim() ||
    plan.bus?.line?.trim() ||
    null;
  const direction =
    transit?.direction?.trim() ||
    connection?.direction?.trim() ||
    plan.bus?.destination?.trim() ||
    plan.transitDestinationLabel?.trim() ||
    plan.endDestinationLabel?.trim() ||
    plan.destinationLabel?.trim() ||
    null;
  if (line && direction) return `Linie ${line} → ${direction}`;
  if (line) return `Linie ${line}`;
  if (direction) return `→ ${direction}`;
  return null;
}

function delayFrom(
  plan: PlanLike,
  primary: TravelConnection | null,
): number | null {
  const fromConn =
    typeof primary?.delayMinutes === "number" ? primary.delayMinutes : null;
  if (fromConn !== null && fromConn > 0) return fromConn;
  const transit = firstTransit(primary?.legs ?? plan.legs);
  const fromLeg =
    typeof transit?.delayMinutes === "number" ? transit.delayMinutes : null;
  if (fromLeg !== null && fromLeg > 0) return fromLeg;
  const fromBus =
    typeof plan.bus?.delayMinutes === "number" ? plan.bus.delayMinutes : null;
  if (fromBus !== null && fromBus > 0) return fromBus;
  return null;
}

function isCancelled(
  plan: PlanLike,
  primary: TravelConnection | null,
): boolean {
  if (plan.status === "cancelled") return true;
  if (primary?.cancelled === true) return true;
  if (plan.bus?.cancelled === true) return true;
  if (plan.bus?.status === "CANCELLED") return true;
  const transit = firstTransit(primary?.legs ?? plan.legs);
  return transit?.cancelled === true;
}

/**
 * Real schedule-vs-live mismatch (same departure slot) — never invents.
 */
function deviationDetail(plan: PlanLike): string | null {
  const scheduled = plan.bus?.scheduledDeparture?.trim() || null;
  const live =
    plan.bus?.realtimeDeparture?.trim() ||
    plan.bus?.departure?.trim() ||
    null;
  if (!scheduled || !live) return null;
  if (scheduled === live) return null;
  return `Geplant ${scheduled} · fährt ${live}`;
}

function pickNextConnection(
  plan: PlanLike,
  primary: TravelConnection | null,
): TravelConnection | null {
  const alt = plan.alternativeConnection ?? null;
  if (alt && !alt.cancelled) return alt;
  const list = plan.connections ?? [];
  for (const c of list) {
    if (c === primary) continue;
    if (c.cancelled) continue;
    if (c.departure || c.leaveHome) return c;
  }
  return null;
}

/**
 * Resolve Birgit/Heidi “Bus zur Arbeit” glance from live travel data.
 */
export function resolveWorkBusGlance(input: {
  plan: PlanLike | null | undefined;
  /** Free day / personal — never show work bus. */
  isWorking: boolean;
  /** Night / senseless today leftovers. */
  hideTodayBus?: boolean;
  focusTomorrow?: boolean;
  /**
   * Whether the plan is based on a confirmed dated shift or only an
   * explicitly configured typical/orientation time. Drives the card's title
   * and hint — never silently presents a typical time as a confirmed one.
   */
  basis?: "confirmed" | "typical" | null;
}): WorkBusGlance {
  const title = input.basis === "typical" ? "Nach üblicher Arbeitszeit" : "Für deinen Dienst";
  const hint = input.basis === "typical" ? "Monatsplan noch nicht verfügbar" : null;

  const empty: WorkBusGlance = {
    visible: false,
    title,
    kind: "none",
    time: null,
    lineTarget: null,
    arrival: null,
    leaveHome: null,
    delayMinutes: null,
    alertTitle: null,
    alertDetail: null,
    nextTime: null,
    nextLineTarget: null,
    nextArrival: null,
    isTestData: false,
    hint: null,
  };

  if (!input.isWorking || !input.plan) return empty;
  if (input.plan.mode === "walking") return empty;
  if (input.hideTodayBus) return empty;

  const plan = input.plan;
  const primary = plan.connections?.[0] ?? null;
  const cancelled = isCancelled(plan, primary);
  const delay = cancelled ? null : delayFrom(plan, primary);
  const deviation = cancelled || delay ? null : deviationDetail(plan);

  const time =
    primary?.departure?.trim() ||
    plan.busDeparture?.trim() ||
    plan.bus?.realtimeDeparture?.trim() ||
    plan.bus?.departure?.trim() ||
    null;
  const leaveHome =
    primary?.leaveHome?.trim() || plan.leaveHome?.trim() || null;
  const arrival =
    primary?.arrival?.trim() ||
    plan.arrivalAtWork?.trim() ||
    plan.arrivalAtDestination?.trim() ||
    plan.bus?.estimatedArrivalHHmm?.trim() ||
    null;
  const lineTarget = lineTargetCopy(plan, primary);

  const next = cancelled || plan.status === "no-connection"
    ? pickNextConnection(plan, primary)
    : null;
  const nextTime =
    next?.departure?.trim() || next?.leaveHome?.trim() || null;
  const nextLineTarget = next ? lineTargetCopy(plan, next) : null;
  const nextArrival = next?.arrival?.trim() || null;

  // Nothing concrete to show → hide card (no empty shell).
  const hasNormalFacts = Boolean(time || leaveHome || lineTarget);
  const hasAlertFacts = cancelled || Boolean(delay) || Boolean(deviation);
  if (!hasNormalFacts && !hasAlertFacts && plan.status === "no-connection") {
    // Honest quiet empty — short natural state handled by caller optional.
    return {
      ...empty,
      visible: true,
      kind: "none",
      isTestData: Boolean(plan.isTestData || plan.bus?.isTestData),
      alertTitle: null,
      alertDetail: input.focusTomorrow
        ? "Morgen steht keine passende Verbindung."
        : "Heute steht keine passende Verbindung.",
      hint,
    };
  }
  if (!hasNormalFacts && !hasAlertFacts) return empty;

  let kind: WorkBusAlertKind = "none";
  let alertTitle: string | null = null;
  let alertDetail: string | null = null;

  if (cancelled) {
    kind = "cancelled";
    alertTitle = "⚠️ Bus fällt aus";
    alertDetail = nextTime
      ? null
      : plan.message?.trim() && plan.message !== "Kein passender Bus"
        ? plan.message.trim()
        : null;
  } else if (delay !== null && delay > 0) {
    kind = "delay";
    alertTitle = null;
    alertDetail = `+${delay} Min. Verspätung`;
  } else if (deviation) {
    kind = "deviation";
    alertTitle = "⚠️ Achtung";
    alertDetail = input.focusTomorrow
      ? `Morgen fährt der Bus anders.\n${deviation}`
      : `Heute fährt der Bus anders.\n${deviation}`;
  }

  return {
    visible: true,
    title,
    kind,
    time,
    lineTarget,
    arrival,
    leaveHome,
    delayMinutes: delay,
    alertTitle,
    alertDetail,
    nextTime,
    nextLineTarget,
    nextArrival,
    isTestData: Boolean(plan.isTestData || plan.bus?.isTestData),
    hint,
  };
}
