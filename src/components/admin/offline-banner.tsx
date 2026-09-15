"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, getOnline, () => true);
  if (online) return null;
  return (
    <div
      role="status"
      className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      Offline – zuletzt gespeicherte Daten
    </div>
  );
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, getOnline, () => true);
}
