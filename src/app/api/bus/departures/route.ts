import { NextResponse } from "next/server";
import { createBusProvider } from "@/server/bus";
import {
  departuresFromLocalStop,
  friendlyBusEmptyMessage,
  selectRelevantDeparture,
} from "@/lib/bus/select";
import { seedPersons } from "@/data/seed";
import { DEFAULT_TRANSIT_PREFS } from "@/lib/data/defaults";
import { getWorkShiftForDate } from "@/lib/work/schedule";
import {
  isWorkTravelPerson,
  planWorkTravel,
} from "@/lib/work/travel-planner";
import type { PersonId, PersonProfile } from "@/lib/types";

export const runtime = "nodejs";

function isPersonId(value: string): value is PersonId {
  return value === "levi" || value === "birgit" || value === "heidi";
}

/**
 * GET /api/bus/departures?personId=birgit
 * Prefers client-provided profile (LocalStorage) via header or POST body.
 */
export async function GET(request: Request) {
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
        source: "local",
        isTestData: true,
        enabled,
        message: empty.description,
        emptyTitle: empty.title,
        fetchedAt: new Date().toISOString(),
      });
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

    const now = new Date();
    const work = getWorkShiftForDate(person, now);
    const schoolStart =
      person.schedule.type === "school"
        ? person.schedule.week[
            (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[
              now.getDay()
            ]
          ]?.lessons?.[0]?.time
        : null;

    // Work shift start is authoritative for the day; desiredArrival only as fallback.
    const targetStart =
      work?.start || prefs.desiredArrivalHHmm || schoolStart || null;

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
        ? {
            workStart: workTravel.workStart,
            workEnd: workTravel.workEnd,
            leaveHome: workTravel.leaveHome,
            busDeparture: workTravel.busDeparture,
            arrivalAtWork: workTravel.arrivalAtWork,
            preparationStart: workTravel.preparationStart,
            status: workTravel.status,
            isTestData: workTravel.isTestData,
            matched: workTravel.matched,
            message: workTravel.message,
          }
        : null,
      source: result.source,
      provider: result.provider,
      warning: result.warning,
      isTestData: Boolean(result.isTestData) || result.source === "local",
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
