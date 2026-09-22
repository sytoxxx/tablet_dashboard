"use client";

import { useEffect, useState } from "react";
import { formatCompactDate, formatGermanDate, formatGermanTime } from "@/lib/format";
import { useDevTime } from "@/components/providers/dev-time-provider";
import { cn } from "@/lib/utils";

const shortTimeFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

type LiveClockProps = {
  className?: string;
  /** Large time on top, date underneath (morning tablet). */
  stacked?: boolean;
  /** HH:MM only — denser header companion to weather glance. */
  compact?: boolean;
};

/**
 * Isolated second-tick clock — does not drive parent day-logic re-renders.
 */
export function LiveClock({
  className,
  stacked = true,
  compact = false,
}: LiveClockProps) {
  const { override } = useDevTime();
  const [live, setLive] = useState(() => new Date());

  useEffect(() => {
    if (override) return;
    const id = window.setInterval(() => setLive(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [override]);

  const now = override ?? live;
  const timeLabel = compact
    ? shortTimeFormatter.format(now)
    : formatGermanTime(now);

  if (compact) {
    return (
      <div className={cn("text-right", className)} aria-live="polite">
        <p className="font-sans text-7xl leading-none font-bold tabular-nums tracking-tight text-[color:var(--ink)] sm:text-8xl landscape-tablet:text-8xl">
          <time dateTime={now.toISOString()} suppressHydrationWarning>
            {timeLabel}
          </time>
        </p>
        <p
          className="mt-2 text-sm tracking-[0.1em] text-[color:var(--quiet)] uppercase landscape-tablet:text-sm"
          suppressHydrationWarning
        >
          {formatCompactDate(now)}
        </p>
      </div>
    );
  }

  if (stacked) {
    return (
      <div className={cn("text-right", className)} aria-live="polite">
        <p className="font-display text-5xl tabular-nums tracking-tight sm:text-6xl">
          <time dateTime={now.toISOString()} suppressHydrationWarning>
            {timeLabel}
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
        <time dateTime={now.toISOString()}>{timeLabel}</time>
      </p>
    </div>
  );
}
