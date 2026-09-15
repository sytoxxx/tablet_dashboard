import type { LiveDeparture, DepartureServiceStatus } from "@/lib/bus/select";
import {
  delayMinutesFromTimes,
  extractHHMM,
  matchBooleanTag,
  matchTag,
  matchTagOrText,
  stripXml,
} from "@/server/bus/trias/xml";

/**
 * Parse TRIAS StopEventResponse XML into LiveDeparture[].
 *
 * Documented fields (VDV 431 / Mentz TRIAS 1.2 / Verbund Linie FAQ):
 * - ThisCall/CallAtStop/ServiceDeparture/TimetabledTime
 * - ThisCall/CallAtStop/ServiceDeparture/EstimatedTime
 * - ThisCall/CallAtStop/NotServicedStop
 * - Service/Cancelled
 * - PublishedLineName / DestinationText
 *
 * Does not invent StopPointRefs, delays, or endpoints.
 * TODO(after credentials): validate against live Steiermark sample responses
 * and adjust tag nesting if the provider uses optional wrappers.
 */
export function parseTriasStopEvents(xml: string): LiveDeparture[] {
  const out: LiveDeparture[] = [];
  const results = xml.split(/<(?:\w+:)?StopEventResult[\s>]/i).slice(1);

  for (const chunk of results) {
    const thisCall =
      chunk.match(
        /<(?:\w+:)?ThisCall[\s>]([\s\S]*?)<\/(?:\w+:)?ThisCall>/i,
      )?.[1] ?? chunk;
    const service =
      chunk.match(
        /<(?:\w+:)?Service[\s>]([\s\S]*?)<\/(?:\w+:)?Service>/i,
      )?.[1] ?? chunk;

    const cancelled =
      matchBooleanTag(service, "Cancelled") ||
      matchBooleanTag(thisCall, "NotServicedStop") ||
      matchBooleanTag(chunk, "Cancelled");

    const departureBlock =
      thisCall.match(
        /<ServiceDeparture[\s>]([\s\S]*?)<\/ServiceDeparture>/i,
      )?.[1] ?? thisCall;

    const timetabledRaw =
      matchTag(departureBlock, "TimetabledTime") ||
      matchTag(thisCall, "TimetabledTime");
    const estimatedRaw =
      matchTag(departureBlock, "EstimatedTime") ||
      matchTag(thisCall, "EstimatedTime");

    const scheduledHHmm = timetabledRaw ? extractHHMM(timetabledRaw) : null;
    const realtimeHHmm = estimatedRaw ? extractHHMM(estimatedRaw) : null;
    const effective = realtimeHHmm || scheduledHHmm;
    if (!effective && !cancelled) continue;

    const line =
      matchTagOrText(chunk, "PublishedLineName") ||
      matchTagOrText(chunk, "LineName") ||
      matchTag(chunk, "PublicCode") ||
      "?";
    const destination =
      matchTagOrText(chunk, "DestinationText") ||
      matchTagOrText(chunk, "DestinationName") ||
      matchTagOrText(chunk, "DestinationStopName") ||
      "—";

    const delayMinutes = delayMinutesFromTimes(
      timetabledRaw,
      estimatedRaw,
    );
    const isRealtime = Boolean(realtimeHHmm);
    const status = resolveServiceStatus({
      cancelled,
      isRealtime,
      delayMinutes,
    });

    out.push({
      line: stripXml(line).slice(0, 16),
      destination: stripXml(destination).slice(0, 60),
      time: effective || scheduledHHmm || realtimeHHmm || "00:00",
      scheduledTime: scheduledHHmm ?? undefined,
      realtimeTime: realtimeHHmm ?? undefined,
      delayMinutes,
      cancelled,
      isRealtime,
      status,
    });
  }

  return out.slice(0, 12);
}

function resolveServiceStatus(input: {
  cancelled: boolean;
  isRealtime: boolean;
  delayMinutes: number | null;
}): DepartureServiceStatus {
  if (input.cancelled) return "CANCELLED";
  if (input.delayMinutes !== null && input.delayMinutes > 0) return "DELAYED";
  if (input.isRealtime) return "REALTIME";
  if (!input.isRealtime) return "PLANNED";
  return "UNKNOWN";
}
