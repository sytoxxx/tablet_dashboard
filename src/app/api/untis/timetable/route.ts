import { NextResponse } from "next/server";
import { unauthorizedIfAnonymous } from "@/lib/auth/guard";
import { configuredUntisUrl, fetchUntisIcal, UNTIS_MESSAGES } from "@/server/untis/fetch-ical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/untis/timetable   body: { url?: string }
 *
 * Browser → Coffee Morning server → WebUntis. The iCal link comes from the request body (set up
 * on the tablet) or from the server-side env WEBUNTIS_ICAL_URL. It is never returned or logged.
 */
export async function POST(request: Request) {
  const denied = await unauthorizedIfAnonymous(request);
  if (denied) return denied;

  let url: string | null = null;
  try {
    const body = (await request.json()) as { url?: unknown };
    if (typeof body.url === "string" && body.url.trim()) url = body.url.slice(0, 2000);
  } catch {
    /* empty body → try the server-side link */
  }
  url = url ?? configuredUntisUrl();
  if (!url) {
    return NextResponse.json(
      { ok: false, code: "not_configured", message: UNTIS_MESSAGES.not_configured },
      { status: 200 },
    );
  }

  const result = await fetchUntisIcal(url);
  if (!result.ok) {
    return NextResponse.json(result, { status: 200 });
  }
  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}
