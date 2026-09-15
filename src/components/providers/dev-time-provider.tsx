"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  dateFromSituation,
  MOCK_SITUATIONS,
  type MockSituationKey,
} from "@/lib/day/mock-situations";
import { DAY_CONFIG } from "@/lib/day/config";

type DevTimeContextValue = {
  enabled: boolean;
  override: Date | null;
  setOverride: (date: Date | null) => void;
  applySituation: (key: MockSituationKey) => void;
  clear: () => void;
  now: Date;
};

const DevTimeContext = createContext<DevTimeContextValue | null>(null);

function readEnabledFlag(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_DEV_TIME === "1") return true;
  const params = new URLSearchParams(window.location.search);
  return params.get("devTime") === "1";
}

function subscribeEnabled(onStoreChange: () => void) {
  // Query changes are rare; listen to popstate for SPA navigations.
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

export function DevTimeProvider({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(
    subscribeEnabled,
    readEnabledFlag,
    () => false,
  );
  const [override, setOverride] = useState<Date | null>(null);
  const [tick, setTick] = useState(() => new Date());

  useEffect(() => {
    if (override) return;
    const id = window.setInterval(
      () => setTick(new Date()),
      DAY_CONFIG.dayLogicIntervalMs,
    );
    return () => window.clearInterval(id);
  }, [override]);

  const applySituation = useCallback((key: MockSituationKey) => {
    setOverride(dateFromSituation(key));
  }, []);

  const clear = useCallback(() => setOverride(null), []);

  const value = useMemo<DevTimeContextValue>(
    () => ({
      enabled,
      override,
      setOverride,
      applySituation,
      clear,
      now: override ?? tick,
    }),
    [enabled, override, applySituation, clear, tick],
  );

  return <DevTimeContext.Provider value={value}>{children}</DevTimeContext.Provider>;
}

export function useDevTime(): DevTimeContextValue {
  const ctx = useContext(DevTimeContext);
  if (!ctx) {
    return {
      enabled: false,
      override: null,
      setOverride: () => undefined,
      applySituation: () => undefined,
      clear: () => undefined,
      now: new Date(),
    };
  }
  return ctx;
}

export function DevTimePanel() {
  const { enabled, override, applySituation, clear } = useDevTime();
  if (!enabled) return null;

  return (
    <aside className="fixed bottom-4 left-4 z-50 max-w-xs rounded-2xl bg-[color:var(--ink)] p-3 text-xs text-[color:var(--surface)] shadow-lg">
      <p className="mb-2 font-semibold tracking-wide uppercase">Dev-Zeit</p>
      <p className="mb-2 opacity-80">
        {override ? override.toLocaleString("de-DE") : "Live-Gerät"}
      </p>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(MOCK_SITUATIONS) as MockSituationKey[]).map((key) => (
          <button
            key={key}
            type="button"
            className="rounded-lg bg-white/10 px-2 py-1 hover:bg-white/20"
            onClick={() => applySituation(key)}
          >
            {MOCK_SITUATIONS[key].label}
          </button>
        ))}
        <button
          type="button"
          className="rounded-lg bg-white/10 px-2 py-1 hover:bg-white/20"
          onClick={clear}
        >
          Reset
        </button>
      </div>
    </aside>
  );
}
