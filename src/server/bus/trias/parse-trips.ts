import {
  delayMinutesFromTimes,
  extractHHMM,
  matchTag,
  matchTagOrText,
} from "@/server/bus/trias/xml";

/** Parsed TRIAS trip before domain enrichment (leave-home, end destination). */
export type ParsedTripLeg = {
  type: "WALK" | "TRANSIT" | "TRANSFER";
  from: string | null;
  to: string | null;
  fromRef: string | null;
  toRef: string | null;
  line: string | null;
  direction: string | null;
  depPlannedIso: string | null;
  depEstimatedIso: string | null;
  arrPlannedIso: string | null;
  arrEstimatedIso: string | null;
  cancelled: boolean;
  /** ISO-8601 duration from TRIAS when present (e.g. PT10M). */
  durationIso: string | null;
};

export type ParsedTrip = {
  interchanges: number;
  durationIso: string | null;
  legs: ParsedTripLeg[];
};

function durationIsoToMinutes(value: string | null): number | null {
  if (!value) return null;
  const m = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!m) return null;
  const h = Number(m[1] || 0);
  const min = Number(m[2] || 0);
  const s = Number(m[3] || 0);
  return h * 60 + min + Math.round(s / 60);
}

export { durationIsoToMinutes };

/**
 * Parse TripResponse into structured trips. Never invents legs or stop refs.
 * Skips trips with no usable legs. Full XML must not be logged by callers.
 */
export function parseTriasTrips(xml: string): ParsedTrip[] {
  const out: ParsedTrip[] = [];
  const chunks = xml.split(/<(?:\w+:)?TripResult[\s>]/i).slice(1);

  for (const chunk of chunks) {
    const legs: ParsedTripLeg[] = [];
    const legChunks = chunk.split(/<(?:\w+:)?TripLeg[\s>]/i).slice(1);

    for (const leg of legChunks) {
      const timed = leg.match(
        /<(?:\w+:)?TimedLeg[\s>]([\s\S]*?)<\/(?:\w+:)?TimedLeg>/i,
      )?.[1];
      const cont = leg.match(
        /<(?:\w+:)?ContinuousLeg[\s>]([\s\S]*?)<\/(?:\w+:)?ContinuousLeg>/i,
      )?.[1];
      const ix = leg.match(
        /<(?:\w+:)?InterchangeLeg[\s>]([\s\S]*?)<\/(?:\w+:)?InterchangeLeg>/i,
      )?.[1];

      if (timed) {
        const board =
          timed.match(
            /<(?:\w+:)?LegBoard[\s>]([\s\S]*?)<\/(?:\w+:)?LegBoard>/i,
          )?.[1] || "";
        const alight =
          timed.match(
            /<(?:\w+:)?LegAlight[\s>]([\s\S]*?)<\/(?:\w+:)?LegAlight>/i,
          )?.[1] || "";
        const service =
          timed.match(
            /<(?:\w+:)?Service[\s>]([\s\S]*?)<\/(?:\w+:)?Service>/i,
          )?.[1] || "";
        const cancelled =
          /^(true|1)$/i.test(matchTag(service, "Cancelled") || "") ||
          /^(true|1)$/i.test(matchTag(board, "NotServicedStop") || "") ||
          /^(true|1)$/i.test(matchTag(alight, "NotServicedStop") || "");

        legs.push({
          type: "TRANSIT",
          from:
            matchTagOrText(board, "StopPointName") ||
            matchTagOrText(board, "LocationName"),
          to:
            matchTagOrText(alight, "StopPointName") ||
            matchTagOrText(alight, "LocationName"),
          fromRef: matchTag(board, "StopPointRef"),
          toRef: matchTag(alight, "StopPointRef"),
          line:
            matchTagOrText(service, "PublishedLineName") ||
            matchTag(service, "LineRef"),
          direction: matchTagOrText(service, "DestinationText"),
          depPlannedIso: matchTag(board, "TimetabledTime"),
          depEstimatedIso: matchTag(board, "EstimatedTime"),
          arrPlannedIso: matchTag(alight, "TimetabledTime"),
          arrEstimatedIso: matchTag(alight, "EstimatedTime"),
          cancelled,
          durationIso: null,
        });
        continue;
      }

      if (cont) {
        const start =
          cont.match(
            /<(?:\w+:)?LegStart[\s>]([\s\S]*?)<\/(?:\w+:)?LegStart>/i,
          )?.[1] || "";
        const end =
          cont.match(
            /<(?:\w+:)?LegEnd[\s>]([\s\S]*?)<\/(?:\w+:)?LegEnd>/i,
          )?.[1] || "";
        legs.push({
          type: "WALK",
          from:
            matchTagOrText(start, "LocationName") ||
            matchTagOrText(start, "StopPointName"),
          to:
            matchTagOrText(end, "LocationName") ||
            matchTagOrText(end, "StopPointName"),
          fromRef: matchTag(start, "StopPointRef"),
          toRef: matchTag(end, "StopPointRef"),
          line: null,
          direction: null,
          depPlannedIso: matchTag(start, "TimetabledTime"),
          depEstimatedIso: matchTag(start, "EstimatedTime"),
          arrPlannedIso: matchTag(end, "TimetabledTime"),
          arrEstimatedIso: matchTag(end, "EstimatedTime"),
          cancelled: false,
          durationIso: matchTag(cont, "Duration"),
        });
        continue;
      }

      if (ix) {
        legs.push({
          type: "TRANSFER",
          from: null,
          to: null,
          fromRef: null,
          toRef: null,
          line: null,
          direction: null,
          depPlannedIso: null,
          depEstimatedIso: null,
          arrPlannedIso: null,
          arrEstimatedIso: null,
          cancelled: false,
          durationIso: matchTag(ix, "WalkDuration") || matchTag(ix, "Duration"),
        });
      }
    }

    if (legs.length === 0) continue;

    const interchangesRaw = matchTag(chunk, "Interchanges");
    const interchanges = interchangesRaw ? Number(interchangesRaw) : 0;

    out.push({
      interchanges: Number.isFinite(interchanges) ? interchanges : 0,
      durationIso: matchTag(chunk, "Duration"),
      legs,
    });
  }

  return out;
}

export function preferIsoTime(
  estimated: string | null,
  planned: string | null,
): string | null {
  return estimated || planned || null;
}

export function isoToHHmm(iso: string | null): string | null {
  if (!iso) return null;
  return extractHHMM(iso);
}

export function tripHasCancelledLeg(trip: ParsedTrip): boolean {
  return trip.legs.some((l) => l.cancelled);
}

export function tripIsDirect(trip: ParsedTrip): boolean {
  const transit = trip.legs.filter((l) => l.type === "TRANSIT");
  return transit.length <= 1 && trip.interchanges === 0;
}

export function tripDepartureIso(trip: ParsedTrip): string | null {
  for (const leg of trip.legs) {
    if (leg.type === "TRANSIT") {
      return preferIsoTime(leg.depEstimatedIso, leg.depPlannedIso);
    }
  }
  for (const leg of trip.legs) {
    const t = preferIsoTime(leg.depEstimatedIso, leg.depPlannedIso);
    if (t) return t;
  }
  return null;
}

export function tripArrivalIso(trip: ParsedTrip): string | null {
  for (let i = trip.legs.length - 1; i >= 0; i--) {
    const leg = trip.legs[i];
    const t = preferIsoTime(leg.arrEstimatedIso, leg.arrPlannedIso);
    if (t) return t;
  }
  return null;
}

export function tripDelayMinutes(trip: ParsedTrip): number | null {
  for (const leg of trip.legs) {
    if (leg.type !== "TRANSIT") continue;
    const d = delayMinutesFromTimes(leg.depPlannedIso, leg.depEstimatedIso);
    if (d !== null) return d;
  }
  return null;
}

export function tripHasRealtime(trip: ParsedTrip): boolean {
  return trip.legs.some(
    (l) =>
      l.type === "TRANSIT" &&
      Boolean(l.depEstimatedIso || l.arrEstimatedIso),
  );
}
