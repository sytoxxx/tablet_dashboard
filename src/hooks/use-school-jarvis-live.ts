"use client";

import { useCallback, useState } from "react";
import type { PersonId } from "@/lib/types";
import type {
  SchoolJarvisDailySummary,
  SchoolJarvisSummaryResponse,
} from "@/lib/integrations/school-jarvis/types";
import { isSchoolJarvisUiPerson } from "@/lib/integrations/school-jarvis/persons";
import { useVisibleInterval } from "@/hooks/use-visible-interval";

const POLL_MS = 2 * 60_000;

export type SchoolJarvisLiveState = {
  summary: SchoolJarvisDailySummary | null;
  handoffUrl: string | null;
  loading: boolean;
  available: boolean;
};

const EMPTY: SchoolJarvisLiveState = {
  summary: null,
  handoffUrl: null,
  loading: false,
  available: false,
};

/**
 * Browser hook: calls Coffee Morning API only (never School Jarvis directly).
 * Only mounts polling for eligible persons (currently Levi).
 * Uses the same visibility-aware interval pattern as bus/weather.
 */
export function useSchoolJarvisLive(personId: PersonId): SchoolJarvisLiveState {
  const eligible = isSchoolJarvisUiPerson(personId);
  const [state, setState] = useState<SchoolJarvisLiveState>(EMPTY);

  const refresh = useCallback(async () => {
    if (!eligible) {
      setState(EMPTY);
      return;
    }

    setState((s) => ({
      ...s,
      loading: s.summary ? false : true,
    }));

    try {
      const params = new URLSearchParams({ personId });
      const res = await fetch(
        `/api/integrations/coffee/school-summary?${params.toString()}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as SchoolJarvisSummaryResponse;

      if (!json.ok || !json.summary?.available) {
        setState(EMPTY);
        return;
      }

      setState({
        summary: json.summary,
        handoffUrl: json.handoffUrl,
        loading: false,
        available: true,
      });
    } catch {
      // Keep Coffee Morning working — hide card silently.
      setState(EMPTY);
    }
  }, [eligible, personId]);

  useVisibleInterval(refresh, POLL_MS, eligible);

  if (!eligible) return EMPTY;
  return state;
}
