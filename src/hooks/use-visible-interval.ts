"use client";

import { useEffect, useRef, useState } from "react";

/** True when the document tab/app is visible (kiosk-friendly). */
export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(() =>
    typeof document === "undefined" ? true : document.visibilityState === "visible",
  );

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    window.addEventListener("focus", onChange);
    window.addEventListener("blur", onChange);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      window.removeEventListener("focus", onChange);
      window.removeEventListener("blur", onChange);
    };
  }, []);

  return visible;
}

/**
 * Runs `callback` on an interval only while the document is visible.
 * When becoming visible again, fires once immediately (catch-up).
 */
export function useVisibleInterval(
  callback: () => void,
  intervalMs: number,
  enabled = true,
): void {
  const visible = useDocumentVisible();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !visible) return;

    const run = () => {
      callbackRef.current();
    };
    const kickoff = window.setTimeout(run, 0);
    const id = window.setInterval(run, intervalMs);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(id);
    };
  }, [intervalMs, enabled, visible]);
}
