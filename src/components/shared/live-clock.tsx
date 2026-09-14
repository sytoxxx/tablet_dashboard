"use client";

import { useEffect, useState } from "react";
import { formatGermanDate, formatGermanTime } from "@/lib/format";

type LiveClockProps = {
  className?: string;
  showDate?: boolean;
};

export function LiveClock({ className, showDate = true }: LiveClockProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={className} aria-live="polite">
      {showDate ? (
        <p
          className="text-sm tracking-[0.16em] text-[color:var(--quiet)] uppercase"
          suppressHydrationWarning
        >
          {formatGermanDate(now)}
        </p>
      ) : null}
      <p className="font-display text-3xl tabular-nums tracking-tight sm:text-4xl">
        <time dateTime={now.toISOString()} suppressHydrationWarning>
          {formatGermanTime(now)}
        </time>
      </p>
    </div>
  );
}
