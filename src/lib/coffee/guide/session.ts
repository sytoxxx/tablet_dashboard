import { buildGuideFlow, isCompleteSelection } from "@/lib/coffee/guide/flow";
import type {
  ExtendedMethod,
  GuideDrinkId,
  GuideSelection,
} from "@/lib/coffee/guide/types";

export const GUIDE_SESSION_STORAGE_KEY = "coffee-guide-session-v1";
/** A half-finished guide is only resumed for a few hours. */
export const GUIDE_SESSION_TTL_MS = 3 * 60 * 60 * 1000;

export type WdtChoice = "unset" | "used" | "skipped";

export type GuideState =
  | { phase: "drink" }
  | { phase: "method"; drink: "verlaengerter" }
  | {
      phase: "steps";
      selection: GuideSelection;
      index: number;
      wdt: WdtChoice;
      /** WDT mini-instructions are open. */
      wdtHow: boolean;
    }
  | { phase: "done"; selection: GuideSelection; wdt: WdtChoice };

export type GuideAction =
  | { type: "pick-drink"; drink: GuideDrinkId }
  | { type: "pick-method"; method: ExtendedMethod }
  | { type: "next" }
  | { type: "back" }
  | { type: "wdt-use" }
  | { type: "wdt-skip" }
  | { type: "restart" }
  | { type: "load"; state: GuideState };

export const INITIAL_GUIDE_STATE: GuideState = { phase: "drink" };

function startSteps(selection: GuideSelection): GuideState {
  return { phase: "steps", selection, index: 0, wdt: "unset", wdtHow: false };
}

export function guideReducer(state: GuideState, action: GuideAction): GuideState {
  switch (action.type) {
    case "restart":
      return INITIAL_GUIDE_STATE;

    case "load":
      return action.state;

    case "pick-drink": {
      if (state.phase !== "drink") return state;
      if (action.drink === "verlaengerter") {
        return { phase: "method", drink: "verlaengerter" };
      }
      return startSteps({ drink: action.drink });
    }

    case "pick-method": {
      if (state.phase !== "method") return state;
      return startSteps({ drink: state.drink, method: action.method });
    }

    case "wdt-use": {
      if (state.phase !== "steps") return state;
      return { ...state, wdt: "used", wdtHow: true };
    }

    case "wdt-skip": {
      if (state.phase !== "steps") return state;
      return advance({ ...state, wdt: "skipped", wdtHow: false });
    }

    case "next": {
      if (state.phase !== "steps") return state;
      return advance(state);
    }

    case "back": {
      if (state.phase === "method") return INITIAL_GUIDE_STATE;
      if (state.phase === "done") {
        const steps = buildGuideFlow(state.selection);
        return {
          phase: "steps",
          selection: state.selection,
          index: steps.length - 1,
          wdt: state.wdt,
          wdtHow: false,
        };
      }
      if (state.phase !== "steps") return state;
      // Leaving the WDT how-to goes back to its question first.
      if (state.wdtHow) return { ...state, wdtHow: false };
      if (state.index === 0) {
        return state.selection.drink === "verlaengerter"
          ? { phase: "method", drink: "verlaengerter" }
          : INITIAL_GUIDE_STATE;
      }
      return { ...state, index: state.index - 1, wdtHow: false };
    }
  }
}

function advance(state: Extract<GuideState, { phase: "steps" }>): GuideState {
  const steps = buildGuideFlow(state.selection);
  if (state.index + 1 >= steps.length) {
    return { phase: "done", selection: state.selection, wdt: state.wdt };
  }
  return { ...state, index: state.index + 1, wdtHow: false };
}

/* ---------------------------------- persistence ---------------------------------- */

type StoredGuide = { v: 1; updatedAt: number; state: GuideState };

export function serializeGuideState(state: GuideState, now: number): string {
  const stored: StoredGuide = { v: 1, updatedAt: now, state };
  return JSON.stringify(stored);
}

const DRINKS = new Set<string>(["espresso", "verlaengerter", "cappuccino", "latte"]);
const METHODS = new Set<string>(["auto", "manual"]);
const WDT = new Set<string>(["unset", "used", "skipped"]);

function parseSelection(raw: unknown): GuideSelection | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.drink !== "string" || !DRINKS.has(r.drink)) return null;
  const sel: GuideSelection = { drink: r.drink as GuideDrinkId };
  if (typeof r.method === "string" && METHODS.has(r.method)) {
    sel.method = r.method as ExtendedMethod;
  }
  return isCompleteSelection(sel) ? sel : null;
}

/** Returns null for stale, malformed, or inconsistent data — never a half-valid state. */
export function restoreGuideState(raw: string | null, now: number): GuideState | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Partial<StoredGuide>;
  if (p.v !== 1 || typeof p.updatedAt !== "number") return null;
  if (now - p.updatedAt > GUIDE_SESSION_TTL_MS || p.updatedAt > now + 60_000) return null;
  const s = p.state as Record<string, unknown> | undefined;
  if (!s || typeof s !== "object") return null;

  if (s.phase === "drink") return INITIAL_GUIDE_STATE;
  if (s.phase === "method") return { phase: "method", drink: "verlaengerter" };

  const selection = parseSelection(s.selection);
  if (!selection) return null;
  const wdt = typeof s.wdt === "string" && WDT.has(s.wdt) ? (s.wdt as WdtChoice) : "unset";

  if (s.phase === "done") return { phase: "done", selection, wdt };
  if (s.phase === "steps") {
    const steps = buildGuideFlow(selection);
    const index = s.index;
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= steps.length) {
      return null;
    }
    const wdtHow = s.wdtHow === true && steps[index]?.kind === "wdt";
    return { phase: "steps", selection, index, wdt, wdtHow };
  }
  return null;
}
