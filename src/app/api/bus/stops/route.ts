import { NextResponse } from "next/server";
import { unauthorizedIfAnonymous } from "@/lib/auth/guard";
import { searchTransitStops, getStopSearchCapability } from "@/server/bus/stop-search";

export const runtime = "nodejs";

/** GET /api/bus/stops?q=Kapfenberg — Admin stop search (TRIAS/VAO if configured). */
export async function GET(request: Request) {
  const denied = await unauthorizedIfAnonymous(request);
  if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get("q") || "");
    if (!q) {
      const cap = getStopSearchCapability();
      return NextResponse.json({
        ok: true,
        searchable: cap.searchable,
        provider: cap.provider,
        stops: [],
        message: cap.searchable
          ? "Suchbegriff eingeben."
          : "Kein Live-Zugang — Haltestellen manuell als Test-Konfiguration eintragen.",
        isTestData: !cap.searchable,
      });
    }
    const result = await searchTransitStops(q);
    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        searchable: false,
        stops: [],
        provider: null,
        message: "Haltestellen-Suche gerade nicht verfügbar.",
        isTestData: true,
      },
      { status: 503 },
    );
  }
}
