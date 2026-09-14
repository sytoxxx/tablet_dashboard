"use client";

import { useEffect, useState } from "react";
import { formatGermanDate, formatGermanTime } from "@/lib/format";
import { useDevTime } from "@/components/providers/dev-time-provider";
import { cn } from "@/lib/utils";

type LiveClockProps = {
  className?: string;
  /** Large time on top, date underneath (morning tablet). */
  stacked?: boolean;
};

/**
 * Isolated second-tick clock — does not drive parent day-logic re-renders.
 */
export function LiveClock({ className, stacked = true }: LiveClockProps) {
  const { override } = useDevTime();
  const [live, setLive] = useState(() => new Date());

  useEffect(() => {
    if (override) return;
    const id = window.setInterval(() => setLive(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [override]);

  const now = override ?? live;

  if (stacked) {
    return (
      <div className={cn("text-right", className)} aria-live="polite">
        <p className="font-display text-5xl tabular-nums tracking-tight sm:text-6xl">
          <time dateTime={now.toISOString()} suppressHydrationWarning>
            {formatGermanTime(now)}
          </time>
        </p>
        <p
          className="mt-1 text-sm tracking-[0.16em] text-[color:var(--quiet)] uppercase"
          suppressHydrationWarning
        >
          {formatGermanDate(now)}
        </p>
      </div>
    );
  }

  return (
    <div className={className} aria-live="polite">
      <p className="text-sm tracking-[0.16em] text-[color:var(--quiet)] uppercase">
        {formatGermanDate(now)}
      </p>
      <p className="font-display text-3xl tabular-nums tracking-tight sm:text-4xl">
        <time dateTime={now.toISOString()}>{formatGermanTime(now)}</time>
      </p>
    </div>
  );
}
