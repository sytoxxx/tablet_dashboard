import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { IMAGE_SLOTS } from "@/lib/coffee/guide/parts";
import { SOURCE_CATALOG } from "@/lib/coffee/guide/steps";

const doc = readFileSync(join(process.cwd(), "docs/coffee-guide-sources.md"), "utf8");

describe("docs/coffee-guide-sources.md stays in sync with the code", () => {
  it("lists a photo file for every image slot", () => {
    for (const slot of Object.values(IMAGE_SLOTS)) {
      expect(doc, slot.file).toContain(`\`${slot.file}\``);
    }
  });

  it("documents every source the steps reference", () => {
    for (const [id, source] of Object.entries(SOURCE_CATALOG)) {
      expect(doc, id).toContain(`\`${id}\``);
      expect(doc, id).toContain(source.url);
    }
  });
});
