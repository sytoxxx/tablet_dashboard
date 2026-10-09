import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDE_PARTS, IMAGE_SLOTS } from "@/lib/coffee/guide/parts";
import { COMMON_STEPS, ROUTE_STEPS, SOURCE_CATALOG } from "@/lib/coffee/guide/steps";
import { buildGuideFlow } from "@/lib/coffee/guide/flow";

const dir = join(process.cwd(), "public/coffee-guide");

function pngSize(file: string) {
  const buf = readFileSync(join(dir, file));
  expect(buf.subarray(0, 8).toString("hex"), `${file} is a PNG`).toBe("89504e470d0a1a0a");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("guide images are real, local and sharp", () => {
  it("has a PNG for every slot, large enough to stay sharp on the tablet", () => {
    for (const slot of Object.values(IMAGE_SLOTS)) {
      expect(existsSync(join(dir, slot.file)), slot.file).toBe(true);
      const { width, height } = pngSize(slot.file);
      expect(Math.max(width, height), slot.file).toBeGreaterThanOrEqual(900);
      expect(Math.min(width, height), slot.file).toBeGreaterThanOrEqual(500);
    }
  });

  it("has no unused image files", () => {
    const used = new Set(Object.values(IMAGE_SLOTS).map((s) => s.file));
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".png"))) {
      expect(used.has(f), f).toBe(true);
    }
  });

  it("names a documented source for every slot", () => {
    for (const slot of Object.values(IMAGE_SLOTS)) {
      expect(Object.keys(SOURCE_CATALOG), slot.id).toContain(slot.source);
    }
  });

  it("every step and every part resolves to an existing slot", () => {
    const steps = [...COMMON_STEPS, ...Object.values(ROUTE_STEPS).flat()];
    for (const step of steps) expect(IMAGE_SLOTS[step.image], step.id).toBeDefined();
    for (const part of Object.values(GUIDE_PARTS)) expect(IMAGE_SLOTS[part.image], part.id).toBeDefined();
  });

  it("every flow step has an image, an alt text and never a placeholder", () => {
    for (const sel of [
      { drink: "espresso" },
      { drink: "verlaengerter", method: "auto" },
      { drink: "verlaengerter", method: "manual" },
      { drink: "cappuccino" },
      { drink: "latte" },
    ] as const) {
      for (const step of buildGuideFlow(sel)) {
        expect(IMAGE_SLOTS[step.image].alt.length, `${sel.drink}/${step.id}`).toBeGreaterThan(10);
      }
    }
  });

  it("milk drinks show their own jug line and froth style", () => {
    const img = (drink: "cappuccino" | "latte", id: string) =>
      buildGuideFlow({ drink }).find((s) => s.id === id)!.image;
    expect(img("cappuccino", "milk-jug")).toBe("jug-line-cappuccino");
    expect(img("latte", "milk-jug")).toBe("jug-line-latte");
    expect(img("cappuccino", "froth-select")).toBe("froth-select-thick");
    expect(img("latte", "froth-select")).toBe("froth-select-thin");
  });
});
