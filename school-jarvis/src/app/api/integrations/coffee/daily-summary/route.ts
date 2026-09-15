import { NextResponse } from "next/server";
import {
  authenticateCoffeeMorningRequest,
  getIntegrationPersonId,
} from "@/lib/auth/coffee-morning-token";
import type { CoffeePersonId } from "@/lib/contract/types";
import { buildDailySummary, todayIso } from "@/lib/learning/summary";

export const runtime = "nodejs";

function isPersonId(value: string): value is CoffeePersonId {
  return value === "levi" || value === "birgit" || value === "heidi";
}

/**
 * GET /api/integrations/coffee/daily-summary?personId=levi&focusDate=YYYY-MM-DD
 *
 * Server-to-server only. Bearer COFFEE_MORNING_API_TOKEN required.
 * Returns SchoolJarvisDailySummary — never documents, history, or internals.
 */
export async function GET(request: Request) {
  const auth = authenticateCoffeeMorningRequest(
    request.headers.get("authorization"),
  );

  if (!auth.ok) {
    if (auth.error === "not_configured") {
      return NextResponse.json(
        { available: false },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const personParam = String(searchParams.get("personId") || "");
    const focusDate =
      searchParams.get("focusDate")?.trim() || todayIso();

    const integrationPerson = getIntegrationPersonId();

    if (!isPersonId(personParam)) {
      return NextResponse.json(
        {
          available: false,
          personId: integrationPerson,
          focusDate,
          nextExam: null,
          today: null,
          learning: null,
          action: null,
        },
        { status: 400 },
      );
    }

    // Phase 14: only Levi (or configured integration person).
    if (personParam !== integrationPerson) {
      return NextResponse.json(
        {
          available: false,
          personId: personParam,
          focusDate,
          nextExam: null,
          today: null,
          learning: null,
          action: null,
        },
        { status: 200 },
      );
    }

    const summary = await buildDailySummary({
      personId: personParam,
      focusDate,
    });

    return NextResponse.json(summary, { status: 200 });
  } catch {
    return NextResponse.json({ available: false }, { status: 200 });
  }
}
