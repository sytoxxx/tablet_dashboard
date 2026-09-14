"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CoffeeDrink, CoffeeDrinkId } from "@/lib/types";
import { formatTimer } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CoffeeTimerProps = {
  drinks: CoffeeDrink[];
};

export function CoffeeTimer({ drinks }: CoffeeTimerProps) {
  const [selectedId, setSelectedId] = useState<CoffeeDrinkId>(
    drinks[0]?.id ?? "espresso",
  );
  const selected = drinks.find((d) => d.id === selectedId) ?? drinks[0];

  const [remaining, setRemaining] = useState(selected?.timerSeconds ?? 0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const selectDrink = (id: CoffeeDrinkId) => {
    clearTick();
    const drink = drinks.find((d) => d.id === id);
    setSelectedId(id);
    setRunning(false);
    setDone(false);
    setRemaining(drink?.timerSeconds ?? 0);
  };

  useEffect(() => {
    if (!running) {
      clearTick();
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTick();
          setRunning(false);
          setDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTick;
  }, [running, clearTick]);

  if (!selected) {
    return null;
  }

  const progress =
    selected.timerSeconds > 0 ? 1 - remaining / selected.timerSeconds : 0;

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
            className={cn(
              "font-display text-6xl tabular-nums tracking-tight sm:text-7xl",
              done && "text-[color:var(--brand)]",
            )}
            aria-live="polite"
          >
            {formatTimer(remaining)}
          </p>

          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--hairline)]"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-[color:var(--brand)] transition-[width] duration-1000 ease-linear"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </div>

          {done ? (
            <p className="text-lg text-[color:var(--brand)]">Fertig — genieß deinen Kaffee.</p>
          ) : (
            <p className="text-[color:var(--quiet)]">
              {running ? "Läuft…" : "Bereit zum Start"}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="button"
              size="lg"
              className="h-14 min-w-28 rounded-2xl px-6 text-base active:scale-[0.97]"
              onClick={() => {
                if (remaining === 0) setRemaining(selected.timerSeconds);
                setDone(false);
                setRunning(true);
              }}
              disabled={running}
            >
              Start
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 min-w-28 rounded-2xl bg-[color:var(--surface-strong)] px-6 text-base active:scale-[0.97]"
              onClick={() => setRunning(false)}
              disabled={!running}
            >
              Stop
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-14 min-w-28 rounded-2xl px-6 text-base active:scale-[0.97]"
              onClick={() => {
                clearTick();
                setRunning(false);
                setDone(false);
                setRemaining(selected.timerSeconds);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
