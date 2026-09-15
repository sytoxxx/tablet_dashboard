import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  ACTIVE_PERSON_STORAGE_KEY,
  clearActivePersonId,
  getActivePersonId,
  setActivePersonId,
} from "@/lib/profile/active-person";
import { isPersonId } from "@/components/providers/data-provider";

describe("active person profile switch", () => {
  const mem = new Map<string, string>();

  beforeEach(() => {
    mem.clear();
    // Minimal localStorage stub for node tests
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => mem.get(k) ?? null,
        setItem: (k: string, v: string) => {
          mem.set(k, v);
        },
        removeItem: (k: string) => {
          mem.delete(k);
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
  });

  afterEach(() => {
    clearActivePersonId();
  });

  it("stores Levi / Birgit / Heidi without mixing ids", () => {
    setActivePersonId("levi");
    expect(getActivePersonId()).toBe("levi");
    expect(isPersonId(getActivePersonId()!)).toBe(true);

    setActivePersonId("birgit");
    expect(getActivePersonId()).toBe("birgit");
    expect(mem.get(ACTIVE_PERSON_STORAGE_KEY)).toBe("birgit");

    setActivePersonId("heidi");
    expect(getActivePersonId()).toBe("heidi");
  });

  it("rejects invalid stored values", () => {
    mem.set(ACTIVE_PERSON_STORAGE_KEY, "unknown");
    expect(getActivePersonId()).toBeNull();
  });
});
