"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { useCoffeeCommand } from "@/components/coffee/coffee-command-provider";
import { CompletionView } from "@/components/coffee/guide/completion-view";
import { DrinkSelection, MethodSelection } from "@/components/coffee/guide/drink-selection";
import { GuideStepView } from "@/components/coffee/guide/guide-step-view";
import { PartHelp } from "@/components/coffee/guide/part-help";
import { Skeleton } from "@/components/shared/skeleton";
import { buildGuideFlow } from "@/lib/coffee/guide/flow";
import {
  GUIDE_SESSION_STORAGE_KEY,
  guideReducer,
  INITIAL_GUIDE_STATE,
  restoreGuideState,
  serializeGuideState,
} from "@/lib/coffee/guide/session";

/**
 * Kaffee machen — visual step-by-step assistant for the Ninja Luxe Café Premier.
 * Flow data lives in src/lib/coffee/guide; this component only renders it.
 */
export function CoffeeGuide() {
  const { ready: beansReady, data } = useCoffeeCommand();
  const [state, dispatch] = useReducer(guideReducer, INITIAL_GUIDE_STATE);
  const [restored, setRestored] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Resume after a reload — hydrate from LocalStorage after mount (deferred like the other stores).
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const saved = restoreGuideState(
          window.localStorage.getItem(GUIDE_SESSION_STORAGE_KEY),
          Date.now(),
        );
        if (saved) dispatch({ type: "load", state: saved });
      } catch {
        /* storage unavailable — start fresh */
      }
      setRestored(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      if (state.phase === "drink") {
        window.localStorage.removeItem(GUIDE_SESSION_STORAGE_KEY);
      } else {
        window.localStorage.setItem(
          GUIDE_SESSION_STORAGE_KEY,
          serializeGuideState(state, Date.now()),
        );
      }
    } catch {
      /* quota / private mode — the guide still works without resume */
    }
  }, [state, restored]);

  const steps = useMemo(
    () => (state.phase === "steps" ? buildGuideFlow(state.selection) : []),
    [state],
  );

  const activeBean = beansReady
    ? (data.beans.find((b) => b.id === data.activeBeanId) ?? null)
    : null;
  const beanGrindHint = activeBean?.grindSetting
    ? `Zuletzt für ${activeBean.name} notiert: ${activeBean.grindSetting} — nur eine Erinnerung.`
    : null;

  if (!restored) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (state.phase === "drink") {
    return (
      <DrinkSelection onPick={(drink) => dispatch({ type: "pick-drink", drink })} />
    );
  }

  if (state.phase === "method") {
    return (
      <MethodSelection
        onPick={(method) => dispatch({ type: "pick-method", method })}
        onBack={() => dispatch({ type: "back" })}
      />
    );
  }

  if (state.phase === "done") {
    return (
      <CompletionView
        selection={state.selection}
        wdt={state.wdt}
        onRestart={() => dispatch({ type: "restart" })}
        onBack={() => dispatch({ type: "back" })}
      />
    );
  }

  const step = steps[state.index];
  return (
    <>
      <GuideStepView
        key={step.id}
        step={step}
        index={state.index}
        total={steps.length}
        wdtHow={state.wdtHow}
        beanGrindHint={beanGrindHint}
        onNext={() => dispatch({ type: "next" })}
        onBack={() => dispatch({ type: "back" })}
        onWdtUse={() => dispatch({ type: "wdt-use" })}
        onWdtSkip={() => dispatch({ type: "wdt-skip" })}
        onPartHelp={() => setHelpOpen(true)}
      />
      {helpOpen && step.parts.length > 0 ? (
        <PartHelp parts={step.parts} onClose={() => setHelpOpen(false)} />
      ) : null}
    </>
  );
}
