/**
 * Presentation-only work-commute bus glance.
 * Uses existing travel / connection / BusInfo signals — never invents
 * delay, cancel, or deviation.
 */
import type { TravelConnection, TravelLeg } from "@/lib/work/travel-types";
import type { TravelPlanStatus } from "@/lib/work/travel-planner";

export type WorkBusAlertKind = "none" | "delay" | "cancelled" | "deviation";

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
}): WorkBusGlance {
  const empty: WorkBusGlance = {
    visible: false,
    title: "Bus zur Arbeit",
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
    title: "Bus zur Arbeit",
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
  };
}
