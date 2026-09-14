"use client";

import { useEffect, useRef, useState } from "react";
import type { CoffeeDrink, CoffeeDrinkId } from "@/lib/types";
import { formatTimer } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CoffeeTimerProps = {
  drinks: CoffeeDrink[];
};

type TimerStatus = "idle" | "running" | "paused" | "done";

export function CoffeeTimer({ drinks }: CoffeeTimerProps) {
  const [selectedId, setSelectedId] = useState<CoffeeDrinkId>(
    drinks[0]?.id ?? "espresso",
  );
  const selected = drinks.find((d) => d.id === selectedId) ?? drinks[0];
  const duration = selected?.timerSeconds ?? 0;

  const [remainingMs, setRemainingMs] = useState(duration * 1000);
  const [status, setStatus] = useState<TimerStatus>("idle");
  const endsAtRef = useRef<number | null>(null);

  const selectDrink = (id: CoffeeDrinkId) => {
    const drink = drinks.find((d) => d.id === id);
    endsAtRef.current = null;
    setSelectedId(id);
    setStatus("idle");
    setRemainingMs((drink?.timerSeconds ?? 0) * 1000);
  };

  useEffect(() => {
    if (status !== "running" || endsAtRef.current === null) return;

    const tick = () => {
      const left = Math.max(0, (endsAtRef.current ?? 0) - Date.now());
      setRemainingMs(left);
      if (left <= 0) {
        endsAtRef.current = null;
        setStatus("done");
      }
    };

    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [status]);

  if (!selected) return null;

  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress =
    duration > 0 ? 1 - remainingMs / (duration * 1000) : 0;

  const start = () => {
    const base = remainingMs > 0 ? remainingMs : duration * 1000;
    endsAtRef.current = Date.now() + base;
    setRemainingMs(base);
    setStatus("running");
  };

  const stop = () => {
    if (endsAtRef.current !== null) {
      setRemainingMs(Math.max(0, endsAtRef.current - Date.now()));
    }
    endsAtRef.current = null;
    setStatus("paused");
  };

  const reset = () => {
    endsAtRef.current = null;
    setRemainingMs(duration * 1000);
    setStatus("idle");
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-3" role="tablist" aria-label="Getränke">
        {drinks.map((drink) => {
          const active = drink.id === selected.id;
          return (
            <button
              key={drink.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectDrink(drink.id)}
              className={cn(
                "min-h-14 min-w-[8.5rem] rounded-2xl px-5 text-lg transition-transform duration-150 active:scale-[0.97]",
                active
                  ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                  : "bg-[color:var(--surface)] text-[color:var(--ink)] hover:bg-[color:var(--surface-strong)]",
              )}
            >
              {drink.name}
            </button>
          );
        })}
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">{selected.name}</h2>
          <p className="text-lg leading-relaxed text-[color:var(--ink)]">{selected.prepNotes}</p>
          <p className="text-[color:var(--quiet)]">{selected.amounts}</p>
          <ol className="space-y-3 text-lg">
            {selected.steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="tabular-nums text-[color:var(--quiet)]">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col items-start gap-6 rounded-[1.75rem] bg-[color:var(--surface)] px-6 py-8 sm:px-8">
          <p className="text-sm tracking-[0.16em] text-[color:var(--quiet)] uppercase">Timer</p>
          <p
            data-testid="coffee-timer-display"
            className={cn(
              "font-display text-6xl tabular-nums tracking-tight sm:text-7xl",
              status === "done" && "text-[color:var(--brand)]",
            )}
            aria-live="polite"
          >
            {formatTimer(remainingSec)}
          </p>

          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--hairline)]"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-[color:var(--brand)] transition-[width] duration-200 ease-linear"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </div>

          <p className="text-[color:var(--quiet)]" data-testid="coffee-timer-status">
            {status === "running" && "Läuft…"}
            {status === "paused" && "Pausiert"}
            {status === "done" && (
              <span className="text-lg text-[color:var(--brand)]">
                Fertig — genieß deinen Kaffee.
              </span>
            )}
            {status === "idle" && "Bereit zum Start"}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="button"
              size="lg"
              data-testid="coffee-timer-start"
              className="h-14 min-w-28 rounded-2xl px-6 text-base active:scale-[0.97]"
              onClick={start}
              disabled={status === "running"}
            >
              Start
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              data-testid="coffee-timer-stop"
              className="h-14 min-w-28 rounded-2xl bg-[color:var(--surface-strong)] px-6 text-base active:scale-[0.97]"
              onClick={stop}
              disabled={status !== "running"}
            >
              Stop
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              data-testid="coffee-timer-reset"
              className="h-14 min-w-28 rounded-2xl px-6 text-base active:scale-[0.97]"
              onClick={reset}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
