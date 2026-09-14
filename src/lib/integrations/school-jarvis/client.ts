import type { PersonId } from "@/lib/types";
import type { SchoolJarvisSummaryResponse } from "@/lib/integrations/school-jarvis/types";
import { SCHOOL_JARVIS_UNAVAILABLE_MESSAGE } from "@/lib/integrations/school-jarvis/examples";
import { validateSchoolJarvisDailySummary } from "@/lib/integrations/school-jarvis/validate";

/**
 * Coffee Morning integration client (Phase 12 = contract only).
 *
 * Does NOT call School Jarvis over the network.
 * Does NOT invent learning data.
 * Later: authenticated fetch → validate → display.
 */
export async function fetchSchoolJarvisDailySummary(_input: {
  personId: PersonId;
  focusDate?: string;
}): Promise<SchoolJarvisSummaryResponse> {
  // Phase 12: no cross-app request. Explicit unavailable — never fake summaries.
  void _input;
  return {
    ok: false,
    unavailable: true,
    message: SCHOOL_JARVIS_UNAVAILABLE_MESSAGE,
    summary: null,
  };
}

/**
 * Apply a validated payload from School Jarvis (future wire-up / tests).
 * Invalid payloads are rejected — Coffee Morning must not display junk.
 */
export function acceptSchoolJarvisPayload(
  raw: unknown,
): SchoolJarvisSummaryResponse {
  const validated = validateSchoolJarvisDailySummary(raw);
  if (!validated.ok) {
    return {
      ok: false,
      unavailable: true,
      message: SCHOOL_JARVIS_UNAVAILABLE_MESSAGE,
      summary: null,
    };
  }
  if (!validated.summary.available) {
    return {
      ok: false,
      unavailable: true,
      message: SCHOOL_JARVIS_UNAVAILABLE_MESSAGE,
      summary: null,
    };
  }
  return {
    ok: true,
    source: "school-jarvis",
    summary: validated.summary,
  };
}

/** UI helper: hide School Jarvis card when unavailable / empty. */
export function shouldShowSchoolJarvisCard(
  response: SchoolJarvisSummaryResponse,
): boolean {
  return response.ok === true && response.summary.available === true;
}
