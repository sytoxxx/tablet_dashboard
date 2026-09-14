import { NextResponse } from "next/server";
import { getBusStatusSnapshot } from "@/server/bus/status";

export const runtime = "nodejs";

/**
 * GET /api/bus/status — Admin-only capability/status (no secrets).
 * Optional query: lastSuccessAt, lastError, preferredProvider
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const snapshot = getBusStatusSnapshot({
      online: true,
      lastSuccessAt: searchParams.get("lastSuccessAt"),
      lastError: searchParams.get("lastError"),
      preferredProvider: searchParams.get("preferredProvider"),
    });
    return NextResponse.json({ ok: true, ...snapshot });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "offline",
        statusLabel: "Offline",
        message: "Status gerade nicht verfügbar.",
      },
      { status: 503 },
    );
  }
}
