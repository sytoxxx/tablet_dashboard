import { NextResponse } from "next/server";
import { unauthorizedIfAnonymous } from "@/lib/auth/guard";
import { createBusProvider } from "@/server/bus";
import {
  departuresFromLocalStop,
  friendlyBusEmptyMessage,
  selectRelevantDeparture,
} from "@/lib/bus/select";
import { seedPersons } from "@/data/seed";
import { DEFAULT_TRANSIT_PREFS } from "@/lib/data/defaults";
import { resolveWorkTimeForDate, type WorkTimeResolution } from "@/lib/work/work-time-resolution";
import { DAY_CONFIG } from "@/lib/day/config";
import { getViennaMinutesSinceMidnight } from "@/lib/format";
import {
  isWorkTravelPerson,
  planWorkTravel,
  type TravelPlan,
} from "@/lib/work/travel-planner";
import type { TravelConnection } from "@/lib/work/travel-types";
import type { PersonId, PersonProfile } from "@/lib/types";
import { isTriasTripConfigured } from "@/server/bus/trias/trip-service";
import {
  planBirgitTripTravel,
  planHeidiTripTravel,
  personUsesTripTravel,
} from "@/server/bus/trip-travel";

export const runtime = "nodejs";

function isPersonId(value: string): value is PersonId {
  return value === "levi" || value === "birgit" || value === "heidi";
}

function serializeWorkTravel(plan: TravelPlan) {
  return {
    mode: plan.mode,
    destinationLabel: plan.destinationLabel,
    endDestinationLabel: plan.endDestinationLabel ?? plan.destinationLabel,
    transitDestinationLabel: plan.transitDestinationLabel ?? null,
    workStart: plan.workStart,
    workEnd: plan.workEnd,
    arrivalTarget: plan.arrivalTarget,
    arrivalTargetEnd: plan.arrivalTargetEnd,
    leaveHome: plan.leaveHome,
    busDeparture: plan.busDeparture,
    arrivalAtWork: plan.arrivalAtWork,
    arrivalAtDestination: plan.arrivalAtDestination,
    preparationStart: plan.preparationStart,
    status: plan.status,
    isTestData: plan.isTestData,
    matched: plan.matched,
    message: plan.message,
    travelMinutes: plan.travelMinutes,
    walkToStopMinutes: plan.walkToStopMinutes,
    stopToWorkMinutes: plan.stopToWorkMinutes,
    preparationMinutes: plan.preparationMinutes,
    safetyBufferMinutes: plan.safetyBufferMinutes,
    legs: plan.legs ?? [],
    connections: plan.connections ?? [],
    alternativeConnection: plan.alternativeConnection ?? null,
  };
}

function upcomingFromConnections(connections: TravelConnection[]) {
  return connections.map((c) => ({
    time: c.departure || "",
    line: c.lineSummary || "?",
    destination: c.direction || c.legs.find((l) => l.type === "TRANSIT")?.to || "",
    status: c.cancelled
      ? "CANCELLED"
      : c.realtime
        ? "REALTIME"
        : "PLANNED",
    delayMinutes: c.delayMinutes ?? null,
    cancelled: c.cancelled,
    leaveHome: c.leaveHome,
    arrival: c.arrival,
    transfers: c.transfers,
    isDirect: c.isDirect,
    legs: c.legs,
  }));
}

/**
 * GET /api/bus/departures?personId=birgit
 * Prefers client-provided profile (LocalStorage) via header or POST body.
 */
export async function GET(request: Request) {
  const denied = await unauthorizedIfAnonymous(request);
  if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const personId = String(searchParams.get("personId") || "");
    if (!isPersonId(personId)) {
      return NextResponse.json({ error: "Ungültige Person." }, { status: 400 });
    }

    const seed = seedPersons.find((p) => p.id === personId);
    if (!seed) {
      return NextResponse.json({ error: "Person nicht gefunden." }, { status: 404 });
    }

    const profileHeader = request.headers.get("x-app-person");
    let person: PersonProfile = seed;
    if (profileHeader) {
      try {
        const parsed = JSON.parse(profileHeader) as PersonProfile;
        if (parsed?.id === personId) person = parsed;
      } catch {
        /* ignore bad header */
      }
    }

    return respondForPerson(person);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Busdaten gerade nicht verfügbar.",
        message: "Busdaten gerade nicht verfügbar.",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const denied = await unauthorizedIfAnonymous(request);
  if (denied) return denied;
  try {
    const body = (await request.json()) as {
      person?: PersonProfile;
      regionPreferredProvider?: string | null;
    };
    if (!body.person || !isPersonId(body.person.id)) {
      return NextResponse.json({ error: "Person fehlt." }, { status: 400 });
    }
    return respondForPerson(body.person, body.regionPreferredProvider);
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
}

function resolvePreferredProvider(
  person: PersonProfile,
  regionPreferred?: string | null,
): string {
  const personPref = person.busStop?.provider;
  if (personPref && personPref !== "auto") return personPref;
  if (regionPreferred && regionPreferred !== "auto") return regionPreferred;
  return personPref ?? regionPreferred ?? "auto";
}

async function respondForPerson(
  person: PersonProfile,
  regionPreferredProvider?: string | null,
) {
  try {
    const prefs = {
      ...DEFAULT_TRANSIT_PREFS,
      ...person.transitPrefs,
    };
    const enabled = prefs.enabled !== false;

    if (!enabled || !person.busStop) {
      const empty = friendlyBusEmptyMessage({
        hasConfig: Boolean(person.busStop),
        enabled,
      });
      return NextResponse.json({
        ok: true,
        stopName: null,
        departures: [],
        next: null,
        upcoming: [],
        workTravel: null,
        workTimeBasis: null,
        source: "local",
        isTestData: true,
        enabled,
        message: empty.description,
        emptyTitle: empty.title,
        fetchedAt: new Date().toISOString(),
      });
    }

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Single shared source of truth (same as the dashboard headline): only a
    // dated, scanned roster entry for the exact date counts as "confirmed" —
    // never the legacy recurring weekly pattern. An explicitly configured
    // "typical work time" may still drive bus planning as orientation, but
    // is carried separately (workTimeBasis) so the UI never presents it as
    // a confirmed shift.
    const workTimesOf = (r: WorkTimeResolution): { start: string; end: string } | null => {
      if (r.kind === "confirmed" && r.status === "work" && r.shift) {
        return { start: r.shift.start, end: r.shift.end };
      }
      if (r.kind === "typical") return { start: r.start, end: r.end };
      return null;
    };

    let resolution = resolveWorkTimeForDate(person, now);
    let work = workTimesOf(resolution);
    // If today's start already passed (Vienna), plan against tomorrow's shift
    // — and ONLY tomorrow's: if tomorrow is genuinely off (Frei/Urlaub/
    // Krankenstand) or has no data, there is no commute to plan, so `work`
    // must become null here rather than silently reusing today's (already
    // elapsed) shift for a day that isn't a work day.
    if (work?.start) {
      const { resolveCommuteAim } = await import("@/server/bus/trip-travel");
      const aim = resolveCommuteAim(now, work.start);
      if (aim.rolledToNextDay) {
        resolution = resolveWorkTimeForDate(person, tomorrow);
        work = workTimesOf(resolution);
      }
    } else if (
      isWorkTravelPerson(person.id) &&
      person.schedule.type === "work" &&
      Math.floor(getViennaMinutesSinceMidnight(now) / 60) >=
        DAY_CONFIG.eveningTomorrowHour
    ) {
      // No shift today (free/vacation/sick/unconfigured/unknown) and it's
      // evening — show tomorrow's commute instead of nothing, same as the
      // rest of the evening-focus dashboard.
      resolution = resolveWorkTimeForDate(person, tomorrow);
      work = workTimesOf(resolution);
    }

    const workTimeBasis: "confirmed" | "typical" | null =
      resolution.kind === "confirmed" && resolution.status === "work"
        ? "confirmed"
        : resolution.kind === "typical"
          ? "typical"
          : null;

    // Birgit/Heidi: real work-time data is required before planning any
    // commute — never fall back to a generic "desired arrival" default.
    if (
      isWorkTravelPerson(person.id) &&
      person.schedule.type === "work" &&
      !work
    ) {
      const isConfirmedOff = resolution.kind === "confirmed" && resolution.status !== "work";
      return NextResponse.json({
        ok: true,
        stopName: person.busStop.name,
        departures: [],
        next: null,
        upcoming: [],
        workTravel: null,
        workTimeBasis: null,
        source: "local",
        isTestData: true,
        enabled,
        message: isConfirmedOff
          ? "Kein Arbeitstag laut Plan — kein Bus zur Arbeit nötig."
          : "Arbeitszeit noch nicht bekannt — kein passender Bus.",
        emptyTitle: isConfirmedOff ? "Kein Arbeitstag" : "Arbeitszeit unbekannt",
        fetchedAt: new Date().toISOString(),
      });
    }

    const schoolStart =
      person.schedule.type === "school"
        ? person.schedule.week[
            (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[
              now.getDay()
            ]
          ]?.lessons?.[0]?.time
        : null;
    const targetStart =
      work?.start || prefs.desiredArrivalHHmm || schoolStart || null;

    // ——— Heidi / Birgit: TRIAS TripRequest when configured ———
    let tripFallbackWarning: string | null = null;
    if (personUsesTripTravel(person.id) && isTriasTripConfigured()) {
      // Both use the same already-resolved dated work shift (targetStart /
      // work.end) — never a separate, weaker source of truth for either person.
      const planFn = person.id === "heidi" ? planHeidiTripTravel : planBirgitTripTravel;
      const tripResult = await planFn(person, now, targetStart, work?.end ?? null);

      if (tripResult.plan && tripResult.connections.length > 0) {
        const plan = tripResult.plan;
        const next = plan.bus
          ? {
              ...plan.bus,
              fetchedAt: tripResult.fetchedAt,
              isTestData: tripResult.isTestData,
              source: "live" as const,
            }
          : null;
        return NextResponse.json({
          ok: true,
          stopName: person.busStop.name,
          departures: [],
          upcoming: upcomingFromConnections(tripResult.connections),
          next,
          workTravel: serializeWorkTravel(plan),
          workTimeBasis,
          source: tripResult.isTestData ? "local" : "live",
          provider: "verbund-steiermark",
          warning: tripResult.warning ?? null,
          isTestData: tripResult.isTestData,
          enabled: true,
          targetStart,
          leadTimeMinutes: prefs.leadTimeMinutes,
          destinationHint: prefs.destinationHint ?? null,
          fetchedAt: tripResult.fetchedAt,
          realtimeAt: plan.bus?.isRealtime ? tripResult.fetchedAt : null,
          message: null,
          emptyTitle: null,
        });
      }
      // Fall through to StopEvent / local — never pretend TripRequest succeeded.
      tripFallbackWarning =
        tripResult.warning?.trim() ||
        "Keine TripRequest-Verbindung — Fallback-Fahrplan.";
    }

    const local = departuresFromLocalStop(person.busStop);
    const preferredProvider = resolvePreferredProvider(
      person,
      regionPreferredProvider,
    );
    const query = {
      stopName: person.busStop.name,
      externalId: person.busStop.externalId,
      localDepartures: local,
      preferredLines: prefs.preferredLines,
      destinationHint: prefs.destinationHint ?? prefs.destinationStop?.name,
    };
    const provider = createBusProvider(preferredProvider, query);
    const result = await provider.getDepartures(query);

    const workTravelEligible = isWorkTravelPerson(person.id);

    const next = workTravelEligible
      ? null
      : selectRelevantDeparture(result.departures, now, {
          targetStartHHMM: targetStart,
          leadTimeMinutes: prefs.leadTimeMinutes,
          stopName: result.stopName,
          source: result.source,
          preferredLines: prefs.preferredLines,
          destinationHint: prefs.destinationHint,
        });

    const workTravel = workTravelEligible
      ? planWorkTravel({
          personId: person.id,
          workStart: targetStart,
          workEnd: work?.end ?? null,
          transitPrefs: prefs,
          departures: result.departures,
          now,
          stopName: result.stopName,
          source: result.source,
          preferredLines: prefs.preferredLines,
          destinationHint: prefs.destinationHint,
          enabled: true,
        })
      : null;

    const chosenNext = workTravelEligible
      ? workTravel?.status === "on-time" || workTravel?.status === "cancelled"
        ? workTravel.bus
        : null
      : next;

    const fetchedAt = result.fetchedAt ?? new Date().toISOString();
    const nextWithMeta = chosenNext
      ? {
          ...chosenNext,
          fetchedAt,
          realtimeAt: result.realtimeAt,
          isTestData:
            Boolean(result.isTestData) ||
            result.source === "local" ||
            Boolean(workTravel?.isTestData) ||
            Boolean(chosenNext.isTestData),
          source: result.source,
        }
      : null;

    const upcoming = result.departures
      .filter((d) => !d.cancelled)
      .slice(0, 5)
      .map((d) => ({
        time: d.realtimeTime || d.time,
        line: d.line,
        destination: d.destination,
        status: d.status,
        delayMinutes: d.delayMinutes ?? null,
        cancelled: Boolean(d.cancelled),
      }));

    const noConnection =
      workTravelEligible &&
      (workTravel?.status === "no-connection" ||
        workTravel?.status === "cancelled");

    const empty = nextWithMeta
      ? null
      : friendlyBusEmptyMessage({ hasConfig: true, enabled: true });

    return NextResponse.json({
      ok: true,
      stopName: result.stopName,
      departures: result.departures,
      upcoming,
      next: nextWithMeta,
      workTravel: workTravel
        ? serializeWorkTravel({
            ...workTravel,
            isTestData:
              Boolean(workTravel.isTestData) || result.source === "local",
          })
        : null,
      workTimeBasis: workTravel ? workTimeBasis : null,
      source: result.source,
      provider: result.provider,
      warning: [tripFallbackWarning, result.warning].filter(Boolean).join(" · ") || null,
      isTestData:
        Boolean(result.isTestData) ||
        result.source === "local" ||
        Boolean(tripFallbackWarning),
      enabled: true,
      targetStart,
      leadTimeMinutes: prefs.leadTimeMinutes,
      destinationHint: prefs.destinationHint ?? null,
      fetchedAt,
      realtimeAt: result.realtimeAt ?? null,
      message: nextWithMeta
        ? null
        : noConnection
          ? "Bitte prüfe die nächste Verbindung."
          : (empty?.description ?? "Heute keine passende Verbindung gefunden."),
      emptyTitle: nextWithMeta
        ? null
        : noConnection
          ? "Kein passender Bus"
          : (empty?.title ?? null),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Busdaten gerade nicht verfügbar.",
        message: "Busdaten gerade nicht verfügbar.",
        emptyTitle: "Kein passender Bus",
      },
      { status: 503 },
    );
  }
}
