"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PersonProfile, WeatherSnapshot } from "@/lib/types";
import { useOnlineStatus } from "@/components/admin/offline-banner";
import { useVisibleInterval } from "@/hooks/use-visible-interval";

const WEATHER_POLL_MS = 15 * 60_000;

export type WeatherLiveState = {
  weather: WeatherSnapshot | null;
  place: string | null;
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
};

function weatherKey(person: PersonProfile | undefined): string {
  if (!person) return "";
  const loc = person.weatherLocation;
  return [
    person.id,
    loc?.latitude ?? "",
    loc?.longitude ?? "",
    person.weather?.temperatureC ?? "",
    person.weather?.afternoonTempC ?? "",
  ].join("|");
}

/**
 * Live weather with 15‑min poll. Stable across person object identity churn —
 * only person id / location / seed fingerprint retriggers fetch.
 */
export function useWeatherLive(person: PersonProfile | undefined): WeatherLiveState {
  const online = useOnlineStatus();
  const key = weatherKey(person);
  const personRef = useRef(person);
  const abortRef = useRef<AbortController | null>(null);
  const keyRef = useRef(key);

  useEffect(() => {
    personRef.current = person;
  }, [person]);

  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  const [state, setState] = useState<WeatherLiveState>(() => ({
    weather: person?.weather
      ? { ...person.weather, source: "local" }
      : null,
    place: person?.weatherLocation?.place ?? null,
    loading: false,
    error: null,
    fetchedAt: null,
  }));
  const cacheRef = useRef<WeatherLiveState | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const refresh = useCallback(async () => {
    const current = personRef.current;
    const requestKey = keyRef.current;
    if (!current) return;
    if (!online) {
      setState((prev) => ({
        ...(cacheRef.current ?? prev),
        error: "Offline — zuletzt gespeichertes Wetter",
        loading: false,
      }));
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setState((s) => ({ ...s, loading: s.fetchedAt ? false : true }));
    try {
      const res = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person: current }),
        signal: ac.signal,
      });
      if (keyRef.current !== requestKey) return;
      const json = (await res.json()) as {
        weather?: WeatherSnapshot;
        place?: string;
        fetchedAt?: string;
        error?: string;
        ok?: boolean;
      };
      if (keyRef.current !== requestKey) return;

      if (!res.ok && !json.weather) {
        setState({
          weather: cacheRef.current?.weather ?? {
            ...current.weather,
            source: "cache",
          },
          place: current.weatherLocation?.place ?? null,
          loading: false,
          error: "Wetter momentan nicht verfügbar.",
          fetchedAt: cacheRef.current?.fetchedAt ?? null,
        });
        return;
      }

      const next: WeatherLiveState = {
        weather: json.weather ?? null,
        place: json.place ?? current.weatherLocation?.place ?? null,
        loading: false,
        error: null,
        fetchedAt: json.fetchedAt ?? json.weather?.fetchedAt ?? null,
      };
      cacheRef.current = next;
      if (keyRef.current !== requestKey) return;
      setState(next);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (keyRef.current !== requestKey) return;
      setState({
        weather: cacheRef.current?.weather ?? {
          ...current.weather,
          source: "cache",
        },
        place: current.weatherLocation?.place ?? null,
        loading: false,
        error: "Wetter momentan nicht verfügbar.",
        fetchedAt: cacheRef.current?.fetchedAt ?? null,
      });
    }
  }, [online]);

  // Reset local seed when switching person / location — without refetch spam on identity churn.
  useEffect(() => {
    abortRef.current?.abort();
    const current = personRef.current;
    if (!current) return;
    cacheRef.current = null;
    setState({
      weather: current.weather
        ? { ...current.weather, source: "local" }
        : null,
      place: current.weatherLocation?.place ?? null,
      loading: false,
      error: null,
      fetchedAt: null,
    });
  }, [key]);

  useVisibleInterval(refresh, WEATHER_POLL_MS, Boolean(person) && Boolean(key));

  return state;
}
