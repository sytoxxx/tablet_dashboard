"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusInfo, PersonProfile } from "@/lib/types";
import { getNextBus } from "@/lib/day/bus";
import { useOnlineStatus } from "@/components/admin/offline-banner";
import { DEFAULT_TRANSIT_PREFS } from "@/lib/data/defaults";

const BUS_POLL_MS = 60_000;

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
};

function isBusEnabled(person: PersonProfile): boolean {
  return (person.transitPrefs?.enabled ?? DEFAULT_TRANSIT_PREFS.enabled) !== false;
}

export function useBusLive(person: PersonProfile | undefined): BusLiveState {
  const online = useOnlineStatus();
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
      });
      return;
    }

    if (!online) {
      setState((prev) => ({
        ...(cacheRef.current ?? prev),
        warning: "Offline — zuletzt gespeicherte Busdaten",
        source: "cache",
        loading: false,
        offline: true,
        unavailable: false,
        enabled: true,
        emptyTitle: cacheRef.current?.next ? null : "Kein passender Bus",
        message: cacheRef.current?.next
          ? cacheRef.current.message
          : "Bitte später erneut prüfen.",
      }));
      return;
    }

    setState((s) => ({ ...s, loading: s.fetchedAt ? false : true, offline: false }));
    try {
      const res = await fetch("/api/bus/departures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person }),
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
        ok?: boolean;
        error?: string;
        isTestData?: boolean;
        enabled?: boolean;
      };

      if (!res.ok || json.ok === false) {
        const fallback = getNextBus(person.busStop);
        const nextState: BusLiveState = {
          next: fallback,
          upcoming: [],
          stopName: person.busStop?.name ?? null,
          message: fallback ? null : "Bitte später erneut prüfen.",
          emptyTitle: fallback ? null : "Kein passender Bus",
          warning: "Busdaten gerade nicht verfügbar.",
          source: fallback ? "local" : "cache",
          fetchedAt: cacheRef.current?.fetchedAt ?? null,
          loading: false,
          isTestData: true,
          enabled: true,
          offline: false,
          unavailable: true,
        };
        setState(nextState);
        return;
      }

      const nextState: BusLiveState = {
        next: json.next ?? null,
        upcoming: json.upcoming ?? [],
        stopName: json.stopName ?? person.busStop?.name ?? null,
        message:
          json.message ??
          (json.next ? null : "Bitte später erneut prüfen."),
        emptyTitle: json.emptyTitle ?? (json.next ? null : "Kein passender Bus"),
        warning: json.warning ?? null,
        source: json.source ?? "local",
        fetchedAt: json.fetchedAt ?? new Date().toISOString(),
        loading: false,
        matchedToWork: json.next?.matchedToWork,
        arrivesInTime: json.next?.arrivesInTime ?? null,
        isTestData: Boolean(json.isTestData),
        enabled: json.enabled !== false,
        offline: false,
        unavailable: false,
      };
      cacheRef.current = nextState;
      setState(nextState);
    } catch {
      const fallback = getNextBus(person.busStop);
      setState({
        next: fallback ?? cacheRef.current?.next ?? null,
        upcoming: cacheRef.current?.upcoming ?? [],
        stopName: person.busStop?.name ?? cacheRef.current?.stopName ?? null,
        message: "Bitte später erneut prüfen.",
        emptyTitle: "Kein passender Bus",
        warning: "Busdaten gerade nicht verfügbar.",
        source: fallback ? "local" : "cache",
        fetchedAt: cacheRef.current?.fetchedAt ?? null,
        loading: false,
        isTestData: true,
        enabled: true,
        offline: false,
        unavailable: true,
      });
    }
  }, [person, online]);

  useEffect(() => {
    const t = window.setTimeout(() => void refresh(), 0);
    const id = window.setInterval(() => void refresh(), BUS_POLL_MS);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(id);
    };
  }, [refresh]);

  return state;
}
