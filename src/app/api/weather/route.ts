import { NextResponse } from "next/server";
import { unauthorizedIfAnonymous } from "@/lib/auth/guard";
import { createWeatherProvider } from "@/server/weather";
import { seedPersons } from "@/data/seed";
import { DEFAULT_WEATHER_LOCATION } from "@/lib/data/defaults";
import type { PersonId, PersonProfile } from "@/lib/types";

export const runtime = "nodejs";

function isPersonId(value: string): value is PersonId {
  return value === "levi" || value === "birgit" || value === "heidi";
}

export async function GET(request: Request) {
  const denied = await unauthorizedIfAnonymous(request);
  if (denied) return denied;
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
      /* ignore */
    }
  }
  return respond(person);
}

export async function POST(request: Request) {
  const denied = await unauthorizedIfAnonymous(request);
  if (denied) return denied;
  try {
    const body = (await request.json()) as { person?: PersonProfile };
    if (!body.person || !isPersonId(body.person.id)) {
      return NextResponse.json({ error: "Person fehlt." }, { status: 400 });
    }
    return respond(body.person);
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
}

async function respond(person: PersonProfile) {
  try {
    const loc = person.weatherLocation ?? DEFAULT_WEATHER_LOCATION;
    const provider = createWeatherProvider();
    const weather = await provider.getWeather({
      place: loc.place,
      latitude: loc.latitude,
      longitude: loc.longitude,
      fallback: {
        ...person.weather,
        source: "local",
      },
    });

    return NextResponse.json({
      ok: true,
      place: loc.place,
      weather,
      provider: provider.name,
      fetchedAt: weather.fetchedAt ?? new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Wetter gerade nicht verfügbar.",
        weather: {
          ...person.weather,
          source: "cache",
          fetchedAt: new Date().toISOString(),
        },
      },
      { status: 503 },
    );
  }
}
