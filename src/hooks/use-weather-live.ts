"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PersonProfile, WeatherSnapshot } from "@/lib/types";
import { useOnlineStatus } from "@/components/admin/offline-banner";

const WEATHER_POLL_MS = 15 * 60_000;

export type WeatherLiveState = {
  weather: WeatherSnapshot | null;
  place: string | null;
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
};

export function useWeatherLive(person: PersonProfile | undefined): WeatherLiveState {
  const online = useOnlineStatus();
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

  const refresh = useCallback(async () => {
    if (!person) return;
    if (!online) {
      setState((prev) => ({
        ...(cacheRef.current ?? prev),
        error: "Offline — zuletzt gespeichertes Wetter",
        loading: false,
      }));
      return;
    }

    setState((s) => ({ ...s, loading: s.fetchedAt ? false : true }));
    try {
      const res = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person }),
      });
      const json = (await res.json()) as {
        weather?: WeatherSnapshot;
        place?: string;
        fetchedAt?: string;
        error?: string;
        ok?: boolean;
      };

      if (!res.ok && !json.weather) {
        setState({
          weather: cacheRef.current?.weather ?? {
            ...person.weather,
            source: "cache",
          },
          place: person.weatherLocation?.place ?? null,
          loading: false,
          error: "Wetter gerade nicht verfügbar.",
          fetchedAt: cacheRef.current?.fetchedAt ?? null,
        });
        return;
      }

      const next: WeatherLiveState = {
        weather: json.weather ?? null,
        place: json.place ?? person.weatherLocation?.place ?? null,
        loading: false,
        error: null,
        fetchedAt: json.fetchedAt ?? json.weather?.fetchedAt ?? null,
      };
      cacheRef.current = next;
      setState(next);
    } catch {
      setState({
        weather: cacheRef.current?.weather ?? {
          ...person.weather,
          source: "cache",
        },
        place: person.weatherLocation?.place ?? null,
        loading: false,
        error: "Wetter gerade nicht verfügbar.",
        fetchedAt: cacheRef.current?.fetchedAt ?? null,
      });
    }
  }, [person, online]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), WEATHER_POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return state;
}
