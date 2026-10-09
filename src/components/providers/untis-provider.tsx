"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useUntisTimetable, type UntisState } from "@/hooks/use-untis-timetable";

const NOOP: UntisState = {
  status: "not_configured",
  events: [],
  fetchedAt: null,
  snapshot: null,
  error: null,
  loading: false,
  refresh: () => {},
};

const Ctx = createContext<UntisState>(NOOP);

/** One WebUntis refresher for the whole app: home (auto profile), Levi's dashboard, evening view. */
export function UntisProvider({ children }: { children: ReactNode }) {
  const state = useUntisTimetable(true);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useUntis(): UntisState {
  return useContext(Ctx);
}
