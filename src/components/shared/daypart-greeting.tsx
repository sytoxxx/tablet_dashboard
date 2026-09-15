"use client";

import { useEffect, useState } from "react";
import { useDevTime } from "@/components/providers/dev-time-provider";
import {
  greetingSnapshot,
  msUntilNextGreetingBucket,
  type GreetingBucket,
} from "@/lib/day/greeting";
import { cn } from "@/lib/utils";

/**
 * Greeting that only re-renders when the time-of-day bucket changes —
 * not on every clock second.
 */
export function DaypartGreeting({
  name,
  className,
  style,
}: {
  /** When omitted, shows emoji + salutation only (home picker). */
  name?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { override } = useDevTime();
  const [bucket, setBucket] = useState<GreetingBucket>(() =>
    greetingSnapshot(override ?? new Date()).key,
  );
  const [line, setLine] = useState(() => {
    const snap = greetingSnapshot(override ?? new Date());
    return name?.trim()
      ? snap.line(name.trim())
      : `${snap.emoji} ${snap.salutation}`;
  });

  useEffect(() => {
    const apply = (now: Date) => {
      const snap = greetingSnapshot(now);
      setBucket((prev) => (prev === snap.key ? prev : snap.key));
      setLine(
        name?.trim()
          ? snap.line(name.trim())
          : `${snap.emoji} ${snap.salutation}`,
      );
    };

    if (override) {
      apply(override);
      return;
    }

    apply(new Date());
    let timer: number | null = null;
    const schedule = () => {
      const wait = msUntilNextGreetingBucket(new Date());
      timer = window.setTimeout(() => {
        apply(new Date());
        schedule();
      }, wait);
    };
    schedule();
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [name, override]);

  return (
    <h1
      className={cn(className)}
      style={style}
      data-greeting-bucket={bucket}
    >
      {line}
    </h1>
  );
}

/** Soft atmosphere class for evening/night — readability first. */
export function daypartShellClass(bucket: GreetingBucket): string {
  if (bucket === "evening") return "daypart-evening";
  if (bucket === "night") return "daypart-evening daypart-night";
  return "";
}

export function useGreetingBucket(): GreetingBucket {
  const { override } = useDevTime();
  const [bucket, setBucket] = useState<GreetingBucket>(() =>
    greetingSnapshot(override ?? new Date()).key,
  );

  useEffect(() => {
    if (override) {
      setBucket(greetingSnapshot(override).key);
      return;
    }
    const apply = () => {
      const next = greetingSnapshot(new Date()).key;
      setBucket((prev) => (prev === next ? prev : next));
    };
    apply();
    let timer: number | null = null;
    const schedule = () => {
      timer = window.setTimeout(() => {
        apply();
        schedule();
      }, msUntilNextGreetingBucket(new Date()));
    };
    schedule();
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [override]);

  return bucket;
}
