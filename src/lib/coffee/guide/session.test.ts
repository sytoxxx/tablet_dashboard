import { describe, expect, it } from "vitest";
import { buildGuideFlow } from "@/lib/coffee/guide/flow";
import {
  GUIDE_SESSION_TTL_MS,
  guideReducer,
  INITIAL_GUIDE_STATE,
  restoreGuideState,
  serializeGuideState,
  type GuideAction,
  type GuideState,
} from "@/lib/coffee/guide/session";
import type { GuideSelection } from "@/lib/coffee/guide/types";

function run(state: GuideState, ...actions: GuideAction[]): GuideState {
  return actions.reduce(guideReducer, state);
}

function walkToEnd(sel: GuideSelection): number {
  let state: GuideState = INITIAL_GUIDE_STATE;
  state = run(state, { type: "pick-drink", drink: sel.drink });
  if (sel.method) state = run(state, { type: "pick-method", method: sel.method });
  let visited = 0;
  while (state.phase === "steps") {
    const step = buildGuideFlow(state.selection)[state.index];
    visited += 1;
    state = step.kind === "wdt" ? run(state, { type: "wdt-skip" }) : run(state, { type: "next" });
  }
  expect(state.phase).toBe("done");
  return visited;
}

describe("guide reducer", () => {
  it("walks every flow from the drink picker to completion", () => {
    expect(walkToEnd({ drink: "espresso" })).toBe(buildGuideFlow({ drink: "espresso" }).length);
    expect(walkToEnd({ drink: "verlaengerter", method: "auto" })).toBe(
      buildGuideFlow({ drink: "verlaengerter", method: "auto" }).length,
    );
    expect(walkToEnd({ drink: "verlaengerter", method: "manual" })).toBe(
      buildGuideFlow({ drink: "verlaengerter", method: "manual" }).length,
    );
    expect(walkToEnd({ drink: "cappuccino" })).toBe(buildGuideFlow({ drink: "cappuccino" }).length);
    expect(walkToEnd({ drink: "latte" })).toBe(buildGuideFlow({ drink: "latte" }).length);
  });

  it("asks for the method before starting a Verlängerter", () => {
    const s = run(INITIAL_GUIDE_STATE, { type: "pick-drink", drink: "verlaengerter" });
    expect(s).toEqual({ phase: "method", drink: "verlaengerter" });
    const started = run(s, { type: "pick-method", method: "manual" });
    expect(started).toMatchObject({ phase: "steps", index: 0 });
  });

  it("goes back step by step, then to the method picker or drink picker", () => {
    let s = run(INITIAL_GUIDE_STATE, { type: "pick-drink", drink: "espresso" }, { type: "next" });
    expect(s).toMatchObject({ index: 1 });
    s = run(s, { type: "back" });
    expect(s).toMatchObject({ index: 0 });
    expect(run(s, { type: "back" })).toEqual(INITIAL_GUIDE_STATE);

    const v = run(
      INITIAL_GUIDE_STATE,
      { type: "pick-drink", drink: "verlaengerter" },
      { type: "pick-method", method: "auto" },
    );
    expect(run(v, { type: "back" })).toEqual({ phase: "method", drink: "verlaengerter" });
    expect(run(v, { type: "back" }, { type: "back" })).toEqual(INITIAL_GUIDE_STATE);
  });

  it("goes back from the completion screen into the last step", () => {
    const sel: GuideSelection = { drink: "espresso" };
    const last = buildGuideFlow(sel).length - 1;
    const done: GuideState = { phase: "done", selection: sel, wdt: "skipped" };
    expect(run(done, { type: "back" })).toMatchObject({ phase: "steps", index: last });
  });

  it("WDT: 'verwenden' shows the how-to, 'weiter' continues, 'überspringen' skips", () => {
    const sel: GuideSelection = { drink: "espresso" };
    const wdtIndex = buildGuideFlow(sel).findIndex((s) => s.kind === "wdt");
    const atWdt: GuideState = { phase: "steps", selection: sel, index: wdtIndex, wdt: "unset", wdtHow: false };

    const used = run(atWdt, { type: "wdt-use" });
    expect(used).toMatchObject({ index: wdtIndex, wdt: "used", wdtHow: true });
    // back leaves the how-to, not the step
    expect(run(used, { type: "back" })).toMatchObject({ index: wdtIndex, wdtHow: false });
    const afterUsed = run(used, { type: "next" });
    expect(afterUsed).toMatchObject({ index: wdtIndex + 1, wdt: "used", wdtHow: false });

    const skipped = run(atWdt, { type: "wdt-skip" });
    expect(skipped).toMatchObject({ index: wdtIndex + 1, wdt: "skipped" });
  });

  it("restart returns to the drink picker", () => {
    const s = run(INITIAL_GUIDE_STATE, { type: "pick-drink", drink: "latte" }, { type: "restart" });
    expect(s).toEqual(INITIAL_GUIDE_STATE);
  });

  it("ignores actions that do not fit the current phase", () => {
    expect(run(INITIAL_GUIDE_STATE, { type: "next" })).toEqual(INITIAL_GUIDE_STATE);
    expect(run(INITIAL_GUIDE_STATE, { type: "pick-method", method: "auto" })).toEqual(
      INITIAL_GUIDE_STATE,
    );
  });
});

describe("guide session persistence (reload during the guide)", () => {
  const NOW = 1_800_000_000_000;
  const mid: GuideState = {
    phase: "steps",
    selection: { drink: "cappuccino" },
    index: 5,
    wdt: "skipped",
    wdtHow: false,
  };

  it("restores a mid-guide state exactly", () => {
    expect(restoreGuideState(serializeGuideState(mid, NOW), NOW + 1000)).toEqual(mid);
  });

  it("restores the method picker, the completion screen and the WDT how-to", () => {
    const method: GuideState = { phase: "method", drink: "verlaengerter" };
    expect(restoreGuideState(serializeGuideState(method, NOW), NOW)).toEqual(method);

    const done: GuideState = { phase: "done", selection: { drink: "latte" }, wdt: "used" };
    expect(restoreGuideState(serializeGuideState(done, NOW), NOW)).toEqual(done);

    const sel: GuideSelection = { drink: "espresso" };
    const wdtIndex = buildGuideFlow(sel).findIndex((s) => s.kind === "wdt");
    const how: GuideState = { phase: "steps", selection: sel, index: wdtIndex, wdt: "used", wdtHow: true };
    expect(restoreGuideState(serializeGuideState(how, NOW), NOW)).toEqual(how);
  });

  it("drops stale sessions", () => {
    expect(
      restoreGuideState(serializeGuideState(mid, NOW), NOW + GUIDE_SESSION_TTL_MS + 1),
    ).toBeNull();
  });

  it("rejects malformed or inconsistent data instead of guessing", () => {
    expect(restoreGuideState(null, NOW)).toBeNull();
    expect(restoreGuideState("not json", NOW)).toBeNull();
    expect(restoreGuideState(JSON.stringify({ v: 2, updatedAt: NOW, state: mid }), NOW)).toBeNull();
    const outOfRange = { ...mid, index: 99 };
    expect(restoreGuideState(serializeGuideState(outOfRange as GuideState, NOW), NOW)).toBeNull();
    const noMethod = { phase: "steps", selection: { drink: "verlaengerter" }, index: 0, wdt: "unset", wdtHow: false };
    expect(restoreGuideState(serializeGuideState(noMethod as unknown as GuideState, NOW), NOW)).toBeNull();
    const badDrink = { ...mid, selection: { drink: "tee" } };
    expect(restoreGuideState(serializeGuideState(badDrink as unknown as GuideState, NOW), NOW)).toBeNull();
  });

  it("does not reopen the WDT how-to on a step that is not the WDT step", () => {
    const odd = { ...mid, wdtHow: true } as GuideState;
    expect(restoreGuideState(serializeGuideState(odd, NOW), NOW)).toMatchObject({ wdtHow: false });
  });
});
