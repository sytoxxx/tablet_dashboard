"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UntisEvent } from "@/lib/untis/ical";
import { buildSuccess } from "@/lib/untis/snapshot";
import { coverageOf, type UntisSnapshot } from "@/lib/school/school-day";
import { toIsoDate } from "@/lib/day/tomorrow";
import { loadUntis, saveUntis, type UntisStored } from "@/lib/untis/store";
import { useVisibleInterval } from "@/hooks/use-visible-interval";

const POLL_MS = 15 * 60_000;

export type UntisState = {
  /** "unknown" until the first answer; "not_configured" = no link anywhere. */
  status: "unknown" | "not_configured" | "ready";
  events: UntisEvent[];
  fetchedAt: number | null;
  /** Everything the dashboards need to layer real WebUntis days over the manual plan; null = no data. */
  snapshot: UntisSnapshot | null;
  /** Message of the LAST refresh when it failed — the shown data is then the previous success. */
  error: string | null;
  loading: boolean;
  refresh: () => void;
};

type ApiOk = { ok: true; fetchedAt: number; events: UntisEvent[]; warnings: string[] };
type ApiErr = { ok: false; code: string; message: string };

/**
 * Keeps Levi's WebUntis timetable fresh. A failed refresh never replaces good data: the last
 * success stays visible together with its age and the reason the refresh failed.
 */
export function useUntisTimetable(enabled: boolean): UntisState {
  const [stored, setStored] = useState<UntisStored | null>(null);
  const [status, setStatus] = useState<UntisState["status"]>("unknown");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    const read = () => setStored(loadUntis());
    read();
    window.addEventListener("coffee-morning-untis", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("coffee-morning-untis", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const current = loadUntis();
      const res = await fetch("/api/untis/timetable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(current.url ? { url: current.url } : {}),
        cache: "no-store",
      });
      const json = (await res.json()) as ApiOk | ApiErr;
      if (json.ok) {
        saveUntis({
          url: current.url,
          lastSuccess: buildSuccess(json.events, json.warnings, json.fetchedAt, toIsoDate(new Date())),
        });
        setStatus("ready");
        setError(null);
      } else if (json.code === "not_configured") {
        setStatus(current.lastSuccess ? "ready" : "not_configured");
        setError(null);
      } else {
        setStatus("ready");
        setError(json.message);
      }
    } catch {
      setStatus("ready");
      setError("Keine Verbindung zu Coffee Morning (Internet?).");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  useVisibleInterval(() => void refresh(), POLL_MS, enabled);

  const last = stored?.lastSuccess ?? null;
  const snapshot: UntisSnapshot | null = last
    ? { events: last.events, fetchedAt: last.fetchedAt, coverage: coverageOf(last.events, last.coverage) }
    : null;
  return {
    snapshot,
    status: last && status === "unknown" ? "ready" : status,
    events: last?.events ?? [],
    fetchedAt: last?.fetchedAt ?? null,
    error,
    loading,
    refresh: () => void refresh(),
  };
}
