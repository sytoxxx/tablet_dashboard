import { describe, expect, it } from "vitest";
import { seedPersons } from "@/data/seed";
import type { PersonProfile } from "@/lib/types";
import { buildEveningPrep } from "@/lib/evening/prep";
import { detectDayOutfitSignals } from "@/lib/outfit/day-signals";
import { defaultOutfitPreferences } from "@/lib/outfit/preferences";
import { getMorningOverview } from "@/lib/morning/overview";
import { resolveLeaveReminder } from "@/lib/morning/leave-reminder";
import { planTravel } from "@/lib/work/travel-planner";
import {
  analyzeGarmentImage,
  sanitizeWardrobeErrorMessage,
  suggestionShellAfterPhoto,
} from "@/lib/wardrobe/analyze";
import {
  applyDraftEdits,
  confirmSaveWardrobeItem,
} from "@/lib/wardrobe/confirm";
import {
  emptyImportDraft,
  draftToItem,
  type WardrobeCatalog,
  type WardrobeItem,
} from "@/lib/wardrobe/model";
import { pickOutfitForDay, scoreWardrobeItemForDay } from "@/lib/wardrobe/pick";
import {
  createMemoryWardrobeStore,
  emptyWardrobeCatalog,
} from "@/lib/wardrobe/store";
import { markOutfitWorn } from "@/lib/wardrobe/worn";
import {
  parseGarmentKind,
  parseWardrobeColor,
  WARDROBE_COLORS,
  WARDROBE_GARMENT_KINDS,
} from "@/lib/wardrobe/taxonomy";

function at(h: number, m: number, weekday = 1): Date {
  // 2026-09-14 is Monday
  return new Date(2026, 8, 14 + (weekday - 1), h, m, 0, 0);
}

function person(id: "levi" | "birgit" | "heidi"): PersonProfile {
  return seedPersons.find((p) => p.id === id)!;
}

function item(
  partial: Partial<WardrobeItem> &
    Pick<WardrobeItem, "id" | "personId" | "slot" | "garmentKind" | "name">,
): WardrobeItem {
  const now = "2026-09-01T10:00:00.000Z";
  return {
    color: "unknown",
    brightness: "unknown",
    style: "unknown",
    occasion: [],
    warmth: "unknown",
    rainSuitable: null,
    comfort: "unknown",
    brand: null,
    favorite: false,
    lastWornIso: null,
    wearCount: 0,
    active: true,
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

describe("Phase 18 wardrobe import (confirm only)", () => {
  it("adds a garment manually only after confirm", () => {
    const catalog = emptyWardrobeCatalog("levi");
    const draft = emptyImportDraft("levi", false);
    expect(catalog.items).toHaveLength(0);

    const edited = applyDraftEdits(draft, {
      name: "Rotes HTL-T-Shirt",
      garmentKind: "t-shirt",
      color: "red",
      brightness: "dark",
      tags: ["htl"],
    });
    // Still not saved
    expect(catalog.items).toHaveLength(0);

    const saved = confirmSaveWardrobeItem({ draft: edited, catalog });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.catalog.items).toHaveLength(1);
    expect(saved.item.name).toMatch(/HTL/i);
    expect(saved.item.color).toBe("red");
    expect(saved.item.brightness).toBe("dark");
  });

  it("photo import without vision still works as editable suggestion", async () => {
    const analyzed = await analyzeGarmentImage({
      imageMimeType: "image/jpeg",
      imageByteLength: 12345,
    });
    expect(analyzed.ok).toBe(false);
    if (analyzed.ok) return;
    expect(analyzed.reason).toBe("unavailable");

    const shell = suggestionShellAfterPhoto();
    expect(shell.ok).toBe(true);
    expect(shell.draft.color).toBe("unknown");
    expect(shell.draft.fromVision).toBe(false);

    const draft = {
      ...emptyImportDraft("levi", true),
      ...shell.draft,
      personId: "levi" as const,
      hasPhoto: true,
    };
    const edited = applyDraftEdits(draft, {
      name: "Blaue Jeans",
      garmentKind: "jeans",
      color: "blue",
      brightness: "dark",
    });
    const catalog = emptyWardrobeCatalog("levi");
    const saved = confirmSaveWardrobeItem({ draft: edited, catalog });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.item.garmentKind).toBe("jeans");
    expect(saved.item.slot).toBe("bottom");
  });

  it("never treats AI output as saved without confirm", async () => {
    const store = createMemoryWardrobeStore();
    const before = store.load("levi");
    await analyzeGarmentImage({ imageByteLength: 99 });
    suggestionShellAfterPhoto();
    expect(store.load("levi").items).toEqual(before.items);
  });

  it("sanitizes image data out of error messages", () => {
    const dirty =
      "fail data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB more";
    const clean = sanitizeWardrobeErrorMessage(dirty);
    expect(clean).not.toMatch(/base64,iVBOR/);
    expect(clean).toMatch(/image omitted|omitted/i);
  });
});

describe("Phase 18 colors + categories", () => {
  it("covers required colors and garment kinds", () => {
    expect(WARDROBE_COLORS).toEqual(
      expect.arrayContaining([
        "black",
        "white",
        "grey",
        "red",
        "blue",
        "green",
        "yellow",
        "orange",
        "brown",
        "beige",
        "pink",
        "purple",
        "multicolor",
        "unknown",
      ]),
    );
    expect(WARDROBE_GARMENT_KINDS).toEqual(
      expect.arrayContaining([
        "t-shirt",
        "button-t-shirt",
        "polo",
        "shirt",
        "sweater",
        "hoodie",
        "jacket",
        "pants",
        "jeans",
        "joggers",
        "shorts",
        "shoes",
        "other",
      ]),
    );
    expect(parseWardrobeColor("Rot")).toBe("red");
    expect(parseWardrobeColor("xyz")).toBe("unknown");
    expect(parseGarmentKind("Button-T-Shirt")).toBe("button-t-shirt");
    expect(parseGarmentKind("Jogginghose")).toBe("joggers");
  });
});

describe("Phase 18 person isolation", () => {
  it("keeps Levi and Birgit wardrobes separate in memory store", () => {
    const store = createMemoryWardrobeStore();
    const leviItem = item({
      id: "l1",
      personId: "levi",
      slot: "top",
      garmentKind: "t-shirt",
      name: "Levi Shirt",
    });
    store.addItem("levi", leviItem);
    expect(store.load("levi").items).toHaveLength(1);
    expect(store.load("birgit").items).toHaveLength(0);
    expect(() =>
      store.addItem("birgit", { ...leviItem, id: "x", personId: "levi" }),
    ).toThrow(/mismatch/i);
  });
});

describe("Phase 18 workshop + presentation + rotation", () => {
  it("prefers real HTL shirt on workshop day when present", () => {
    const catalog: WardrobeCatalog = {
      personId: "levi",
      updatedAt: "2026-09-01T00:00:00.000Z",
      items: [
        item({
          id: "htl",
          personId: "levi",
          slot: "top",
          garmentKind: "t-shirt",
          name: "Rotes HTL-T-Shirt",
          color: "red",
          tags: ["htl"],
        }),
        item({
          id: "jog",
          personId: "levi",
          slot: "bottom",
          garmentKind: "joggers",
          name: "Bequeme Jogginghose",
          comfort: "high",
        }),
        item({
          id: "shoe",
          personId: "levi",
          slot: "shoes",
          garmentKind: "shoes",
          name: "Bequeme Sneaker",
          comfort: "high",
        }),
      ],
    };
    const signals = detectDayOutfitSignals({
      person: person("levi"),
      date: at(12, 0, 3), // Wednesday
    });
    expect(signals.workshopDay).toBe(true);
    const picked = pickOutfitForDay({
      personId: "levi",
      dateIso: "2026-09-16",
      signals,
      wardrobe: catalog,
      preferences: defaultOutfitPreferences("levi"),
    });
    expect(picked.mode).toBe("workshop");
    expect(picked.pieces.find((p) => p.slot === "top")?.item?.id).toBe("htl");
    expect(picked.pieces.every((p) => p.missingPrompt === null)).toBe(true);
  });

  it("does not invent workshop pieces when wardrobe is empty", () => {
    const signals = detectDayOutfitSignals({
      person: person("levi"),
      date: at(12, 0, 3),
    });
    const picked = pickOutfitForDay({
      personId: "levi",
      dateIso: "2026-09-16",
      signals,
      wardrobe: emptyWardrobeCatalog("levi"),
      preferences: defaultOutfitPreferences("levi"),
    });
    expect(picked.mode).toBe("workshop");
    expect(picked.pieces.every((p) => p.item === null)).toBe(true);
    expect(
      picked.pieces.some((p) => /Kleiderschrank|hinzu/i.test(p.missingPrompt ?? "")),
    ).toBe(true);
  });

  it("presentation prefers button-t-shirt / polo from real wardrobe", () => {
    const catalog: WardrobeCatalog = {
      personId: "levi",
      updatedAt: "2026-09-01T00:00:00.000Z",
      items: [
        item({
          id: "plain",
          personId: "levi",
          slot: "top",
          garmentKind: "t-shirt",
          name: "Einfaches T-Shirt",
          color: "grey",
        }),
        item({
          id: "btn",
          personId: "levi",
          slot: "top",
          garmentKind: "button-t-shirt",
          name: "Schwarzes Button-T-Shirt",
          color: "black",
          brightness: "dark",
        }),
        item({
          id: "jeans",
          personId: "levi",
          slot: "bottom",
          garmentKind: "jeans",
          name: "Dunkle Jeans",
          color: "blue",
          brightness: "dark",
        }),
        item({
          id: "snk",
          personId: "levi",
          slot: "shoes",
          garmentKind: "shoes",
          name: "Schwarze Sneaker",
          color: "black",
        }),
      ],
    };
    const signals = detectDayOutfitSignals({
      person: person("levi"),
      date: at(12, 0, 2), // Tuesday Referat
    });
    expect(signals.presentation).toBe(true);
    const picked = pickOutfitForDay({
      personId: "levi",
      dateIso: "2026-09-15",
      signals,
      wardrobe: catalog,
    });
    expect(picked.mode).toBe("presentation");
    expect(picked.pieces.find((p) => p.slot === "top")?.item?.id).toBe("btn");
  });

  it("rotation prefers not recently worn items", () => {
    const recently = item({
      id: "a",
      personId: "levi",
      slot: "top",
      garmentKind: "t-shirt",
      name: "Gestern",
      lastWornIso: "2026-09-14",
      wearCount: 5,
      color: "blue",
    });
    const older = item({
      id: "b",
      personId: "levi",
      slot: "top",
      garmentKind: "t-shirt",
      name: "Länger her",
      lastWornIso: "2026-09-01",
      wearCount: 1,
      color: "green",
    });
    const scoreA = scoreWardrobeItemForDay({
      item: recently,
      onDateIso: "2026-09-15",
      rain: false,
      cold: false,
      hot: false,
    });
    const scoreB = scoreWardrobeItemForDay({
      item: older,
      onDateIso: "2026-09-15",
      rain: false,
      cold: false,
      hot: false,
    });
    expect(scoreB).toBeGreaterThan(scoreA);
  });

  it("weather prefers rain-suitable shoes when raining", () => {
    const wet = item({
      id: "rain",
      personId: "levi",
      slot: "shoes",
      garmentKind: "shoes",
      name: "Regenschuhe",
      rainSuitable: true,
    });
    const dry = item({
      id: "dry",
      personId: "levi",
      slot: "shoes",
      garmentKind: "shoes",
      name: "Stoffsneaker",
      rainSuitable: false,
    });
    expect(
      scoreWardrobeItemForDay({
        item: wet,
        onDateIso: "2026-09-15",
        rain: true,
        cold: false,
        hot: false,
      }),
    ).toBeGreaterThan(
      scoreWardrobeItemForDay({
        item: dry,
        onDateIso: "2026-09-15",
        rain: true,
        cold: false,
        hot: false,
      }),
    );
  });

  it("alternative outfit excludes previous combination", () => {
    const catalog: WardrobeCatalog = {
      personId: "levi",
      updatedAt: "2026-09-01T00:00:00.000Z",
      items: [
        item({
          id: "t1",
          personId: "levi",
          slot: "top",
          garmentKind: "t-shirt",
          name: "Top 1",
          color: "white",
          brightness: "light",
        }),
        item({
          id: "t2",
          personId: "levi",
          slot: "top",
          garmentKind: "t-shirt",
          name: "Top 2",
          color: "black",
          brightness: "dark",
          lastWornIso: "2026-09-01",
        }),
        item({
          id: "b1",
          personId: "levi",
          slot: "bottom",
          garmentKind: "jeans",
          name: "Jeans 1",
        }),
        item({
          id: "b2",
          personId: "levi",
          slot: "bottom",
          garmentKind: "pants",
          name: "Hose 2",
          lastWornIso: "2026-09-01",
        }),
        item({
          id: "s1",
          personId: "levi",
          slot: "shoes",
          garmentKind: "shoes",
          name: "Schuhe 1",
        }),
        item({
          id: "s2",
          personId: "levi",
          slot: "shoes",
          garmentKind: "shoes",
          name: "Schuhe 2",
          lastWornIso: "2026-09-01",
        }),
      ],
    };
    const signals = detectDayOutfitSignals({
      person: person("levi"),
      date: at(12, 0, 1), // Monday normal school
    });
    expect(signals.workshopDay).toBe(false);
    expect(signals.presentation).toBe(false);
    const first = pickOutfitForDay({
      personId: "levi",
      dateIso: "2026-09-14",
      signals,
      wardrobe: catalog,
    });
    const second = pickOutfitForDay({
      personId: "levi",
      dateIso: "2026-09-14",
      signals,
      wardrobe: catalog,
      excludeCombinationKey: first.combinationKey,
    });
    expect(second.combinationKey).not.toBe(first.combinationKey);
  });

  it("mark worn updates lastWorn and wearCount", () => {
    const catalog: WardrobeCatalog = {
      personId: "levi",
      updatedAt: "2026-09-01T00:00:00.000Z",
      items: [
        item({
          id: "t1",
          personId: "levi",
          slot: "top",
          garmentKind: "t-shirt",
          name: "Shirt",
        }),
        item({
          id: "b1",
          personId: "levi",
          slot: "bottom",
          garmentKind: "jeans",
          name: "Jeans",
        }),
        item({
          id: "s1",
          personId: "levi",
          slot: "shoes",
          garmentKind: "shoes",
          name: "Sneaker",
        }),
      ],
    };
    const signals = detectDayOutfitSignals({
      person: person("levi"),
      date: at(12, 0, 1),
    });
    const picked = pickOutfitForDay({
      personId: "levi",
      dateIso: "2026-09-14",
      signals,
      wardrobe: catalog,
    });
    const next = markOutfitWorn(catalog, picked, "2026-09-14");
    const wornIds = picked.pieces
      .map((p) => p.item?.id)
      .filter((id): id is string => Boolean(id));
    for (const id of wornIds) {
      const updated = next.items.find((i) => i.id === id)!;
      expect(updated.lastWornIso).toBe("2026-09-14");
      expect(updated.wearCount).toBe(1);
    }
  });
});

describe("Phase 18 evening prep + digital wardrobe", () => {
  it("uses real wardrobe items in evening prep when provided", () => {
    const catalog: WardrobeCatalog = {
      personId: "levi",
      updatedAt: "2026-09-01T00:00:00.000Z",
      items: [
        item({
          id: "btn",
          personId: "levi",
          slot: "top",
          garmentKind: "button-t-shirt",
          name: "Schwarzes Button-T-Shirt",
          color: "black",
        }),
        item({
          id: "jeans",
          personId: "levi",
          slot: "bottom",
          garmentKind: "jeans",
          name: "Dunkle Jeans",
          color: "blue",
        }),
        item({
          id: "snk",
          personId: "levi",
          slot: "shoes",
          garmentKind: "shoes",
          name: "Schwarze Sneaker",
          color: "black",
        }),
      ],
    };
    // Monday evening → Tuesday Referat
    const prep = buildEveningPrep({
      person: person("levi"),
      now: at(19, 0, 1),
      digitalWardrobe: catalog,
    });
    expect(prep.pickedOutfit).not.toBeNull();
    expect(prep.wardrobeReady).toBe(true);
    expect(prep.outfit.pieces.some((p) => /Button/i.test(p.label))).toBe(true);
    expect(prep.items.find((i) => i.kind === "perfume")?.detail).toMatch(
      /nicht eingerichtet/i,
    );
  });

  it("does not invent perfume or fake garments", () => {
    const prep = buildEveningPrep({
      person: person("levi"),
      now: at(19, 0, 0),
      digitalWardrobe: emptyWardrobeCatalog("levi"),
    });
    expect(prep.wardrobeReady).toBe(false);
    expect(prep.outfit.pieces).toEqual([]);
    expect(prep.items.find((i) => i.kind === "perfume")?.detail).toMatch(
      /nicht eingerichtet/i,
    );
  });
});

describe("Phase 18 no regressions", () => {
  it("Phase-16 leave reminder still works", () => {
    const travel = planTravel({
      personId: "levi",
      mode: "walking",
      arrivalTarget: "07:45",
      arrivalTargetEnd: "07:50",
      destinationLabel: "HTL",
      transitPrefs: {
        leadTimeMinutes: 10,
        walkToStopMinutes: 10,
        preparationMinutes: 5,
        safetyBufferMinutes: 0,
        travelMode: "walking",
      },
      now: at(6, 0),
    });
    const cue = resolveLeaveReminder({
      personId: "levi",
      dateIso: "2026-09-14",
      now: at(7, 32),
      travel,
      timelineState: "leave_soon",
    });
    expect(cue.soundDue).toBe(true);
  });

  it("Levi / Birgit / Heidi morning overview still builds", () => {
    for (const id of ["levi", "birgit", "heidi"] as const) {
      const o = getMorningOverview(id, at(7, 20), {
        person: person(id),
      });
      expect(o.personId).toBe(id);
    }
  });

  it("draftToItem never invents confident unknown attributes", () => {
    const draft = emptyImportDraft("levi", false);
    const built = draftToItem(draft, "x", "2026-09-14T12:00:00.000Z");
    expect(built.color).toBe("unknown");
    expect(built.brightness).toBe("unknown");
    expect(built.rainSuitable).toBeNull();
  });
});
