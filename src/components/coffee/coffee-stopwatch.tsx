"use client";

import { useEffect, useRef, useState } from "react";
import type { CoffeeRecipe } from "@/lib/coffee/types";
import { describeOptimal, verdictForDuration } from "@/lib/coffee/recipes";
import { formatTimer } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StopwatchStatus = "idle" | "running" | "paused" | "stopped";

type CoffeeStopwatchProps = {
  recipe: CoffeeRecipe;
  onStopped?: (durationSeconds: number) => void;
};

export function CoffeeStopwatch({ recipe, onStopped }: CoffeeStopwatchProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [status, setStatus] = useState<StopwatchStatus>("idle");
  const startedAtRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);

  const optimal = describeOptimal(recipe);
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const verdict =
    status === "stopped" ? verdictForDuration(elapsedSec, recipe) : null;

  useEffect(() => {
    if (status !== "running" || startedAtRef.current === null) return;
    const tick = () => {
      setElapsedMs(accumulatedRef.current + (Date.now() - (startedAtRef.current ?? Date.now())));
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [status]);

  const start = () => {
    startedAtRef.current = Date.now();
    setStatus("running");
  };

  const pause = () => {
    if (startedAtRef.current !== null) {
      accumulatedRef.current += Date.now() - startedAtRef.current;
      startedAtRef.current = null;
      setElapsedMs(accumulatedRef.current);
    }
    setStatus("paused");
  };

  const resume = () => {
    startedAtRef.current = Date.now();
    setStatus("running");
  };

  const stop = () => {
    let total = accumulatedRef.current;
    if (startedAtRef.current !== null) {
      total += Date.now() - startedAtRef.current;
      startedAtRef.current = null;
    }
    accumulatedRef.current = total;
    setElapsedMs(total);
    setStatus("stopped");
    onStopped?.(Math.floor(total / 1000));
  };

  const reset = () => {
    startedAtRef.current = null;
    accumulatedRef.current = 0;
    setElapsedMs(0);
    setStatus("idle");
  };

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-5 rounded-[1.75rem] bg-[color:var(--surface)] px-6 py-8 sm:px-8",
        status === "stopped" && "ring-2 ring-[color:var(--brand)]/35",
      )}
    >
      <p className="text-sm tracking-[0.16em] text-[color:var(--quiet)] uppercase">
        Stoppuhr
      </p>
      <p
        data-testid="coffee-stopwatch-display"
        className="font-display text-7xl tabular-nums tracking-tight sm:text-8xl"
        aria-live="polite"
      >
        {formatTimer(elapsedSec)}
      </p>

      <div className="space-y-1">
        <p className="text-lg text-[color:var(--ink)]">{optimal.label}</p>
        {optimal.detail ? (
          <p className="text-sm text-[color:var(--quiet)]">{optimal.detail}</p>
        ) : null}
      </div>

      <p className="text-[color:var(--quiet)]" data-testid="coffee-stopwatch-status">
        {status === "idle" && "Bereit — startet bei 00:00"}
        {status === "running" && "Läuft …"}
        {status === "paused" && "Pausiert"}
        {status === "stopped" && verdictLabel(verdict)}
      </p>

      <div className="flex flex-wrap gap-3 pt-1">
        {status === "idle" || status === "stopped" ? (
          <Button
            type="button"
            size="lg"
            data-testid="coffee-stopwatch-start"
            className="h-14 min-w-28 rounded-2xl px-6 text-base active:scale-[0.97]"
            onClick={() => {
              if (status === "stopped") reset();
              start();
            }}
          >
            Start
          </Button>
        ) : null}
        {status === "running" ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              data-testid="coffee-stopwatch-pause"
              className="h-14 min-w-28 rounded-2xl bg-[color:var(--surface-strong)] px-6 text-base active:scale-[0.97]"
              onClick={pause}
            >
              Pause
            </Button>
            <Button
              type="button"
              size="lg"
              data-testid="coffee-stopwatch-stop"
              className="h-14 min-w-28 rounded-2xl px-6 text-base active:scale-[0.97]"
              onClick={stop}
            >
              Stop
            </Button>
          </>
        ) : null}
        {status === "paused" ? (
          <>
            <Button
              type="button"
              size="lg"
              data-testid="coffee-stopwatch-resume"
              className="h-14 min-w-28 rounded-2xl px-6 text-base active:scale-[0.97]"
              onClick={resume}
            >
              Weiter
            </Button>
            <Button
              type="button"
              size="lg"
              data-testid="coffee-stopwatch-stop"
              className="h-14 min-w-28 rounded-2xl px-6 text-base active:scale-[0.97]"
              onClick={stop}
            >
              Stop
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="lg"
          data-testid="coffee-stopwatch-reset"
          className="h-14 min-w-28 rounded-2xl px-6 text-base active:scale-[0.97]"
          onClick={reset}
        >
          Neu
        </Button>
      </div>
    </div>
  );
}

function verdictLabel(verdict: "short" | "ok" | "long" | "unknown" | null): string {
  if (verdict === "short") return "Gestoppt — etwas kürzer als der Richtwert.";
  if (verdict === "ok") return "Gestoppt — im optimalen Bereich.";
  if (verdict === "long") return "Gestoppt — etwas länger als der Richtwert.";
  return "Gestoppt — kein Vergleichswert hinterlegt.";
}
