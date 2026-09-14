import { NextResponse } from "next/server";
import type { PersonId } from "@/lib/types";
import { fetchSchoolJarvisDailySummary } from "@/lib/integrations/school-jarvis/client";
import { SCHOOL_JARVIS_UNAVAILABLE_MESSAGE } from "@/lib/integrations/school-jarvis/examples";
import {
  getSchoolJarvisServerConfig,
  isPersonAllowedForSchoolJarvis,
} from "@/server/school-jarvis/config";

export const runtime = "nodejs";

function isPersonId(value: string): value is PersonId {
  return value === "levi" || value === "birgit" || value === "heidi";
}

/**
 * GET /api/integrations/coffee/school-summary?personId=levi&focusDate=YYYY-MM-DD
 *
 * Browser → Coffee Morning server → School Jarvis (server-to-server).
 * No tokens in the client response.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const personId = String(searchParams.get("personId") || "");
    const focusDate = searchParams.get("focusDate") || undefined;

    if (!isPersonId(personId)) {
      return NextResponse.json(
        {
          ok: false,
          unavailable: true,
          message: "Ungültige Person.",
          summary: null,
          handoffUrl: null,
        },
        { status: 400 },
      );
    }

    const config = getSchoolJarvisServerConfig();
    if (!isPersonAllowedForSchoolJarvis(personId, config)) {
      return NextResponse.json(
        {
          ok: false,
          unavailable: true,
          message: "School Jarvis ist für diese Person nicht freigeschaltet.",
          summary: null,
          handoffUrl: null,
        },
        { status: 403 },
      );
    }

    const result = await fetchSchoolJarvisDailySummary({
      personId,
      focusDate: focusDate ?? undefined,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 503 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        unavailable: true,
        message: SCHOOL_JARVIS_UNAVAILABLE_MESSAGE,
        summary: null,
        handoffUrl: null,
      },
      { status: 503 },
    );
  }
}
