import { NextResponse } from "next/server";
import { createBusProvider } from "@/server/bus";
import { departuresFromLocalStop, selectRelevantDeparture } from "@/lib/bus/select";
import { seedPersons } from "@/data/seed";
import { DEFAULT_TRANSIT_PREFS } from "@/lib/data/defaults";
import { getWorkShiftForDate } from "@/lib/work/schedule";
import type { PersonId, PersonProfile } from "@/lib/types";

export const runtime = "nodejs";

function isPersonId(value: string): value is PersonId {
  return value === "levi" || value === "birgit" || value === "heidi";
}

/**
 * GET /api/bus/departures?personId=birgit
 * Optional override body fields via query: stopName, externalId (admin preview).
 *
 * Client may send cached person snapshot via headers later; for now we resolve
 * seed + accept query overrides so Admin-edited LocalStorage data is passed
 * from the client as JSON body on POST for accuracy.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const personId = String(searchParams.get("personId") || "");
  if (!isPersonId(personId)) {
    return NextResponse.json({ error: "Ungültige Person." }, { status: 400 });
  }

  const seed = seedPersons.find((p) => p.id === personId);
  if (!seed) {
    return NextResponse.json({ error: "Person nicht gefunden." }, { status: 404 });
  }

  // Prefer client-provided profile snapshot (LocalStorage may differ from seed)
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
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { person?: PersonProfile };
    if (!body.person || !isPersonId(body.person.id)) {
      return NextResponse.json({ error: "Person fehlt." }, { status: 400 });
    }
    return respondForPerson(body.person);
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
}

async function respondForPerson(person: PersonProfile) {
  try {
    if (!person.busStop) {
      return NextResponse.json({
        ok: true,
        stopName: null,
        departures: [],
        next: null,
        upcoming: [],
        source: "local",
        message: "Keine Haltestelle konfiguriert.",
        fetchedAt: new Date().toISOString(),
      });
    }

    const local = departuresFromLocalStop(person.busStop);
    const preferLive = Boolean(person.busStop.externalId) || person.busStop.provider === "wienerlinien";
    const provider = createBusProvider(preferLive);
    const result = await provider.getDepartures({
      stopName: person.busStop.name,
      externalId: person.busStop.externalId,
      localDepartures: local,
    });

    const now = new Date();
    const work = getWorkShiftForDate(person, now);
    const schoolStart =
      person.schedule.type === "school"
        ? person.schedule.week[
            (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[now.getDay()]
          ]?.lessons?.[0]?.time
        : null;

    const targetStart = work?.start ?? schoolStart ?? null;
    const lead =
      person.transitPrefs?.leadTimeMinutes ?? DEFAULT_TRANSIT_PREFS.leadTimeMinutes;

    const next = selectRelevantDeparture(result.departures, now, {
      targetStartHHMM: targetStart,
      leadTimeMinutes: lead,
      stopName: result.stopName,
      source: result.source,
    });

    const upcoming = result.departures.slice(0, 5).map((d) => ({
      time: d.time,
      line: d.line,
      destination: d.destination,
    }));

    return NextResponse.json({
      ok: true,
      stopName: result.stopName,
      departures: result.departures,
      upcoming,
      next,
      source: result.source,
      provider: result.provider,
      warning: result.warning,
      targetStart,
      leadTimeMinutes: lead,
      fetchedAt: new Date().toISOString(),
      message: next
        ? null
        : "Heute keine weitere Verbindung",
    });
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
