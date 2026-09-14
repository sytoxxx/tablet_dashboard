"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusInfo, PersonProfile } from "@/lib/types";
import { getNextBus } from "@/lib/day/bus";
import { useOnlineStatus } from "@/components/admin/offline-banner";

const BUS_POLL_MS = 60_000;

export type BusLiveState = {
  next: BusInfo | null;
  upcoming: Array<{ time: string; line: string; destination: string }>;
  stopName: string | null;
  message: string | null;
  warning: string | null;
  source: "live" | "local" | "cache" | null;
  fetchedAt: string | null;
  loading: boolean;
  matchedToWork?: boolean;
  arrivesInTime?: boolean | null;
};

export function useBusLive(person: PersonProfile | undefined): BusLiveState {
  const online = useOnlineStatus();
  const [state, setState] = useState<BusLiveState>(() => ({
    next: person ? getNextBus(person.busStop) : null,
    upcoming: [],
    stopName: person?.busStop?.name ?? null,
    message: null,
    warning: null,
    source: "local",
    fetchedAt: null,
    loading: false,
  }));
  const cacheRef = useRef<BusLiveState | null>(null);

  const refresh = useCallback(async () => {
    if (!person) return;
    if (!online) {
      setState((prev) => ({
        ...(cacheRef.current ?? prev),
        warning: "Offline — zuletzt gespeicherte Busdaten",
        source: "cache",
        loading: false,
      }));
      return;
    }

    setState((s) => ({ ...s, loading: s.fetchedAt ? false : true }));
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
        warning?: string | null;
        source?: BusLiveState["source"];
        fetchedAt?: string;
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || json.ok === false) {
        const fallback = getNextBus(person.busStop);
        const nextState: BusLiveState = {
          next: fallback,
          upcoming: [],
          stopName: person.busStop?.name ?? null,
          message: fallback ? null : "Busdaten gerade nicht verfügbar.",
          warning: "Busdaten gerade nicht verfügbar.",
          source: fallback ? "local" : "cache",
          fetchedAt: cacheRef.current?.fetchedAt ?? null,
          loading: false,
        };
        setState(nextState);
        return;
      }

      const nextState: BusLiveState = {
        next: json.next ?? null,
        upcoming: json.upcoming ?? [],
        stopName: json.stopName ?? person.busStop?.name ?? null,
        message: json.message ?? (json.next ? null : "Heute keine weitere Verbindung"),
        warning: json.warning ?? null,
        source: json.source ?? "local",
        fetchedAt: json.fetchedAt ?? new Date().toISOString(),
        loading: false,
        matchedToWork: json.next?.matchedToWork,
        arrivesInTime: json.next?.arrivesInTime ?? null,
      };
      cacheRef.current = nextState;
      setState(nextState);
    } catch {
      const fallback = getNextBus(person.busStop);
      setState({
        next: fallback ?? cacheRef.current?.next ?? null,
        upcoming: cacheRef.current?.upcoming ?? [],
        stopName: person.busStop?.name ?? cacheRef.current?.stopName ?? null,
        message: "Busdaten gerade nicht verfügbar.",
        warning: "Busdaten gerade nicht verfügbar.",
        source: fallback ? "local" : "cache",
        fetchedAt: cacheRef.current?.fetchedAt ?? null,
        loading: false,
      });
    }
  }, [person, online]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), BUS_POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return state;
}
