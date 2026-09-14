import { NextResponse } from "next/server";
import type { PersonId } from "@/lib/types";
import { fetchSchoolJarvisDailySummary } from "@/lib/integrations/school-jarvis/client";
import { SCHOOL_JARVIS_UNAVAILABLE_MESSAGE } from "@/lib/integrations/school-jarvis/examples";

export const runtime = "nodejs";

function isPersonId(value: string): value is PersonId {
  return value === "levi" || value === "birgit" || value === "heidi";
}

/**
 * GET /api/integrations/coffee/school-summary?personId=levi
 *
 * Contract endpoint for later School Jarvis → Coffee Morning digest.
 * Phase 12: returns explicit unavailable (no cross-app call, no fake data).
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
        },
        { status: 400 },
      );
    }

    const result = await fetchSchoolJarvisDailySummary({
      personId,
      focusDate: focusDate ?? undefined,
    });

    return NextResponse.json(result, {
      status: result.ok ? 200 : 503,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        unavailable: true,
        message: SCHOOL_JARVIS_UNAVAILABLE_MESSAGE,
        summary: null,
      },
      { status: 503 },
    );
  }
}
