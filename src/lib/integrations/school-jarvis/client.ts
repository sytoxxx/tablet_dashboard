import type { PersonId } from "@/lib/types";
import type { SchoolJarvisSummaryResponse } from "@/lib/integrations/school-jarvis/types";
import { SCHOOL_JARVIS_UNAVAILABLE_MESSAGE } from "@/lib/integrations/school-jarvis/examples";
import { validateSchoolJarvisDailySummary } from "@/lib/integrations/school-jarvis/validate";
import {
  getSchoolJarvisServerConfig,
  isPersonAllowedForSchoolJarvis,
  resolveSchoolJarvisHandoffUrl,
  type SchoolJarvisServerConfig,
} from "@/server/school-jarvis/config";
import {
  schoolJarvisSummaryCache,
  type SchoolJarvisSummaryCache,
} from "@/server/school-jarvis/cache";
import {
  fetchSchoolJarvisRemote,
  type RemoteFetchDeps,
} from "@/server/school-jarvis/remote";

function todayIso(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function unavailable(
  message = SCHOOL_JARVIS_UNAVAILABLE_MESSAGE,
): SchoolJarvisSummaryResponse {
  return {
    ok: false,
    unavailable: true,
    message,
    summary: null,
    handoffUrl: null,
  };
}

export type FetchSchoolJarvisDeps = RemoteFetchDeps & {
  config?: SchoolJarvisServerConfig;
  cache?: SchoolJarvisSummaryCache;
  now?: () => Date;
  /** Skip cache read/write (tests). */
  bypassCache?: boolean;
};

/**
 * Coffee Morning server client → School Jarvis Integration API.
 *
 * Flow: config → person gate → cache → remote fetch → validate → cache write.
 * Never invents learning data. Secrets stay server-side.
 */
export async function fetchSchoolJarvisDailySummary(input: {
  personId: PersonId;
  focusDate?: string;
}, deps: FetchSchoolJarvisDeps = {}): Promise<SchoolJarvisSummaryResponse> {
  const config = deps.config ?? getSchoolJarvisServerConfig();
  const cache = deps.cache ?? schoolJarvisSummaryCache;
  const focusDate = input.focusDate?.trim() || todayIso(deps.now?.() ?? new Date());
  const { personId } = input;

  if (!isPersonAllowedForSchoolJarvis(personId, config)) {
    return unavailable("School Jarvis ist für diese Person nicht freigeschaltet.");
  }

  if (!config.configured) {
    return unavailable();
  }

  if (!deps.bypassCache) {
    const cached = cache.get(personId, focusDate);
    if (cached?.available) {
      return {
        ok: true,
        source: "cache",
        summary: cached,
        handoffUrl: resolveHandoff(cached, config),
      };
    }
  }

  const remote = await fetchSchoolJarvisRemote({
    personId,
    focusDate,
    config,
    deps: { fetchImpl: deps.fetchImpl },
  });

  if (!remote.ok) {
    if (
      remote.reason === "invalid_payload" ||
      remote.reason === "person_mismatch" ||
      remote.reason === "auth"
    ) {
      console.error("[school-jarvis] fetch failed:", remote.reason, remote.detail);
    }
    return unavailable();
  }

  if (!remote.summary.available) {
    return unavailable();
  }

  if (!deps.bypassCache) {
    cache.set(personId, focusDate, remote.summary, config.cacheTtlMs);
  }

  return {
    ok: true,
    source: "school-jarvis",
    summary: remote.summary,
    handoffUrl: resolveHandoff(remote.summary, config),
  };
}

function resolveHandoff(
  summary: { action: { target: string } | null; personId: PersonId; focusDate: string },
  config: SchoolJarvisServerConfig,
): string | null {
  if (!summary.action?.target) return null;
  return resolveSchoolJarvisHandoffUrl({
    template: config.handoffUrlTemplate,
    target: summary.action.target,
    personId: summary.personId,
    focusDate: summary.focusDate,
  });
}

/**
 * Apply a validated payload from School Jarvis (tests / future wire-up).
 * Invalid payloads are rejected — Coffee Morning must not display junk.
 */
export function acceptSchoolJarvisPayload(
  raw: unknown,
  options?: { expectedPersonId?: PersonId },
): SchoolJarvisSummaryResponse {
  const validated = validateSchoolJarvisDailySummary(raw);
  if (!validated.ok) {
    return unavailable();
  }
  if (
    options?.expectedPersonId &&
    validated.summary.personId !== options.expectedPersonId
  ) {
    return unavailable();
  }
  if (!validated.summary.available) {
    return unavailable();
  }
  return {
    ok: true,
    source: "school-jarvis",
    summary: validated.summary,
    handoffUrl: null,
  };
}

/** UI helper: hide School Jarvis card when unavailable / empty. */
export function shouldShowSchoolJarvisCard(
  response: SchoolJarvisSummaryResponse,
): boolean {
  return response.ok === true && response.summary.available === true;
}
