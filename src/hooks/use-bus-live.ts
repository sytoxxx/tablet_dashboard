"use client";

import { useCallback, useRef, useState } from "react";
import type { BusInfo, BusProviderPreference, PersonProfile } from "@/lib/types";
import { getNextBus } from "@/lib/day/bus";
import { useOnlineStatus } from "@/components/admin/offline-banner";
import { DEFAULT_TRANSIT_PREFS } from "@/lib/data/defaults";
import { useVisibleInterval } from "@/hooks/use-visible-interval";
import { formatDataAge } from "@/lib/day/relative-day";
import type { WorkTravelPlan } from "@/lib/work/travel-planner";

const BUS_POLL_MS = 60_000;

export type WorkTravelLive = Pick<
  WorkTravelPlan,
  | "mode"
  | "destinationLabel"
  | "workStart"
  | "workEnd"
  | "arrivalTarget"
  | "arrivalTargetEnd"
  | "leaveHome"
  | "busDeparture"
  | "arrivalAtWork"
  | "arrivalAtDestination"
  | "preparationStart"
  | "status"
  | "isTestData"
  | "matched"
  | "message"
  | "travelMinutes"
  | "walkToStopMinutes"
  | "stopToWorkMinutes"
  | "preparationMinutes"
  | "safetyBufferMinutes"
>;

export type BusLiveState = {
  next: BusInfo | null;
  upcoming: Array<{ time: string; line: string; destination: string }>;
  stopName: string | null;
  message: string | null;
  emptyTitle: string | null;
  warning: string | null;
  source: "live" | "local" | "cache" | null;
  fetchedAt: string | null;
  loading: boolean;
  matchedToWork?: boolean;
  arrivesInTime?: boolean | null;
  isTestData?: boolean;
  enabled: boolean;
  offline: boolean;
  unavailable: boolean;
  provider?: string | null;
  dataAgeLabel?: string | null;
  workTravel?: WorkTravelLive | null;
};

function isBusEnabled(person: PersonProfile): boolean {
  return (person.transitPrefs?.enabled ?? DEFAULT_TRANSIT_PREFS.enabled) !== false;
}

export function useBusLive(
  person: PersonProfile | undefined,
  options?: { regionPreferredProvider?: BusProviderPreference | null },
): BusLiveState {
  const online = useOnlineStatus();
  const regionPreferredProvider = options?.regionPreferredProvider ?? null;
  const enabled = person ? isBusEnabled(person) : true;
  const [state, setState] = useState<BusLiveState>(() => ({
    next: person && enabled ? getNextBus(person.busStop) : null,
    upcoming: [],
    stopName: person?.busStop?.name ?? null,
    message: null,
    emptyTitle: null,
    warning: null,
    source: "local",
    fetchedAt: null,
    loading: false,
    isTestData: true,
    enabled,
    offline: false,
    unavailable: false,
    provider: null,
    dataAgeLabel: null,
    workTravel: null,
  }));
  const cacheRef = useRef<BusLiveState | null>(null);

  const refresh = useCallback(async () => {
    if (!person) return;
    const busOn = isBusEnabled(person);

    if (!busOn) {
      setState({
        next: null,
        upcoming: [],
        stopName: null,
        message: "Heute bleibst du in der Nähe.",
        emptyTitle: "Kein Bus nötig",
        warning: null,
        source: "local",
        fetchedAt: new Date().toISOString(),
        loading: false,
        enabled: false,
        offline: false,
        unavailable: false,
        isTestData: true,
        provider: null,
        dataAgeLabel: null,
        workTravel: null,
      });
      return;
    }

    if (!online) {
      const cached = cacheRef.current;
      const age = formatDataAge(cached?.fetchedAt ?? null);
      const cachedNext = cached?.next
        ? {
            ...cached.next,
            source: "cache" as const,
            isRealtime: false,
            isTestData: true,
          }
        : null;
      setState((prev) => ({
        ...(cached ?? prev),
        next: cachedNext ?? prev.next,
        warning: age
          ? `Offline — Daten zuletzt aktualisiert ${age}`
          : "Offline — zuletzt gespeicherte Busdaten",
        source: "cache",
        loading: false,
        offline: true,
        unavailable: false,
        enabled: true,
        isTestData: true,
        emptyTitle: cachedNext || cached?.next ? null : "Keine Busdaten verfügbar",
        message: cachedNext || cached?.next
          ? age
            ? `Daten zuletzt aktualisiert ${age}`
            : cached?.message ?? null
          : "Keine Busdaten verfügbar",
        dataAgeLabel: age,
        workTravel: cached?.workTravel
          ? { ...cached.workTravel, isTestData: true }
          : null,
      }));
      return;
    }

    setState((s) => ({ ...s, loading: s.fetchedAt ? false : true, offline: false }));
    try {
      const res = await fetch("/api/bus/departures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person,
          regionPreferredProvider,
        }),
      });
      const json = (await res.json()) as {
        next?: BusInfo | null;
        upcoming?: BusLiveState["upcoming"];
        stopName?: string | null;
        message?: string | null;
        emptyTitle?: string | null;
        warning?: string | null;
        source?: BusLiveState["source"];
        fetchedAt?: string;
        realtimeAt?: string | null;
        ok?: boolean;
        error?: string;
        isTestData?: boolean;
        enabled?: boolean;
        provider?: string;
        workTravel?: WorkTravelLive | null;
      };

      if (!res.ok || json.ok === false) {
        const fallback = getNextBus(person.busStop);
        const cached = cacheRef.current;
        const age = formatDataAge(cached?.fetchedAt);
        const cachedNext = cached?.next
          ? {
              ...cached.next,
              source: "cache" as const,
              isRealtime: false,
              isTestData: true,
            }
          : null;
        setState({
          next: fallback ?? cachedNext,
          upcoming: cached?.upcoming ?? [],
          stopName: person.busStop?.name ?? cached?.stopName ?? null,
          message:
            fallback || cachedNext
              ? age
                ? `Daten zuletzt aktualisiert ${age}`
                : null
              : "Keine Busdaten verfügbar",
          emptyTitle: fallback || cachedNext ? null : "Keine Busdaten verfügbar",
          warning: "Busdaten gerade nicht verfügbar.",
          source: fallback ? "local" : "cache",
          fetchedAt: cached?.fetchedAt ?? null,
          loading: false,
          isTestData: true,
          enabled: true,
          offline: false,
          unavailable: true,
          provider: cached?.provider ?? null,
          dataAgeLabel: age,
          workTravel: cached?.workTravel
            ? { ...cached.workTravel, isTestData: true }
            : null,
        });
        return;
      }

      const fetchedAt = json.fetchedAt ?? new Date().toISOString();
      const nextState: BusLiveState = {
        next: json.next ?? null,
        upcoming: json.upcoming ?? [],
        stopName: json.stopName ?? person.busStop?.name ?? null,
        message: json.message ?? (json.next ? null : "Bitte später erneut prüfen."),
        emptyTitle: json.emptyTitle ?? (json.next ? null : "Kein passender Bus"),
        warning: json.warning ?? null,
        source: json.source ?? "local",
        fetchedAt,
        loading: false,
        matchedToWork: json.next?.matchedToWork,
        arrivesInTime: json.next?.arrivesInTime ?? null,
        isTestData: Boolean(json.isTestData),
        enabled: json.enabled !== false,
        offline: false,
        unavailable: false,
        provider: json.provider ?? null,
        dataAgeLabel: null,
        workTravel: json.workTravel ?? null,
      };
      cacheRef.current = nextState;
      try {
        sessionStorage.setItem(
          "coffee-morning-bus-meta",
          JSON.stringify({
            at: fetchedAt,
            provider: json.provider ?? null,
            isTestData: Boolean(json.isTestData),
            warning: json.warning ?? null,
            realtimeAt: json.realtimeAt ?? null,
          }),
        );
      } catch {
        /* ignore */
      }
      setState(nextState);
    } catch {
      const fallback = getNextBus(person.busStop);
      const cached = cacheRef.current;
      const cachedNext = cached?.next
        ? {
            ...cached.next,
            source: "cache" as const,
            isRealtime: false,
            isTestData: true,
          }
        : null;
      setState({
        next: fallback ?? cachedNext,
        upcoming: cached?.upcoming ?? [],
        stopName: person.busStop?.name ?? cached?.stopName ?? null,
        message: "Keine Busdaten verfügbar",
        emptyTitle: "Keine Busdaten verfügbar",
        warning: "Busdaten gerade nicht verfügbar.",
        source: fallback ? "local" : "cache",
        fetchedAt: cached?.fetchedAt ?? null,
        loading: false,
        isTestData: true,
        enabled: true,
        offline: false,
        unavailable: true,
        provider: cached?.provider ?? null,
        dataAgeLabel: formatDataAge(cached?.fetchedAt),
        workTravel: cached?.workTravel
          ? { ...cached.workTravel, isTestData: true }
          : null,
      });
    }
  }, [person, online, regionPreferredProvider]);

  useVisibleInterval(refresh, BUS_POLL_MS, Boolean(person));

  return state;
}
