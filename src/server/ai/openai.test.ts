import { describe, expect, it, vi } from "vitest";
import { OpenAiPlanAi, DEFAULT_PLAN_MODEL } from "@/server/ai/openai";
import { PlanAiError } from "@/server/ai/errors";
import type { PlanAiInput } from "@/server/ai/types";

/**
 * MOCK-TESTED, NOT REAL-VISION-TESTED. No OPENAI_API_KEY exists in this
 * environment, so only the network boundary (`fetch`) is scripted. Everything
 * else is the real production code: both prompt stages, request construction,
 * the row decision, the evidence cross-checks and the full validation
 * pipeline. These tests prove the wiring and the safety nets; they say nothing
 * about how well a real model reads a real phone photo.
 */

const REF = new Date(2026, 8, 10);
const IMG = { base64: "ZmFrZQ==", mimeType: "image/jpeg" };

const completion = (obj: unknown) => ({
  ok: true,
  json: async () => ({ choices: [{ message: { content: JSON.stringify(obj) } }] }),
});

const GOOD_UNDERSTANDING = {
  quality: { verdict: "good", issues: [], wholeDocumentVisible: true },
  documentKind: "work_roster",
  period: { month: 9, year: 2026, evidence: "September 2026" },
  layout: {
    employeeLabels: ["Anna K.", "Birgit M.", "Clara S."],
    headers: ["21 Mo", "22 Di", "23 Mi"],
  },
  targetRow: { label: "Birgit M.", confidence: 0.92 },
  legend: { FD: "Frühdienst", F: "Frei" },
};

const GOOD_WORK_EXTRACTION = {
  mode: "work",
  confidence: 0.85,
  warnings: [],
  uncertainties: [],
  targetRowLabel: "Birgit M.",
  draft: {
    type: "work",
    entries: [
      {
        day: 21, month: 9, weekday: "mon", label: "Frühdienst", start: "06:00", end: "14:00",
        location: "", status: "work",
        evidence: { header: "21 Mo", cell: "FD 06:00-14:00" },
      },
      {
        day: 22, month: 9, weekday: "tue", label: "Frei", start: "", end: "", location: "",
        status: "free", evidence: { header: "22 Di", cell: "F" },
      },
    ],
  },
};

const input = (over: Partial<PlanAiInput> = {}): PlanAiInput => ({
  planType: "work",
  personId: "birgit",
  personName: "Birgit",
  images: [IMG],
  referenceDate: REF,
  ...over,
});

function provider(...responses: unknown[]) {
  const fetchMock = vi.fn();
  responses.forEach((r) => fetchMock.mockResolvedValueOnce(r));
  return { ai: new OpenAiPlanAi("test-key-not-real", "test-model", fetchMock as unknown as typeof fetch), fetchMock };
}

const bodyOf = (fetchMock: ReturnType<typeof vi.fn>, call: number) =>
  JSON.parse(fetchMock.mock.calls[call]![1].body as string);

async function expectCode(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(PlanAiError);
  expect((error as PlanAiError).code).toBe(code);
  return error as PlanAiError;
}

describe("OpenAiPlanAi — two-stage pipeline (network scripted)", () => {
  it("throws before any network call when no images were provided", async () => {
    const { ai, fetchMock } = provider();
    await expect(ai.analyze(input({ images: [] }))).rejects.toThrow("Kein Bild");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses a strong default vision model", () => {
    expect(DEFAULT_PLAN_MODEL).toBe("gpt-4o");
  });

  it("builds both requests: endpoint, auth, model, JSON mode, high-detail images", async () => {
    const { ai, fetchMock } = provider(completion(GOOD_UNDERSTANDING), completion(GOOD_WORK_EXTRACTION));
    await ai.analyze(input());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer test-key-not-real");
    for (const call of [0, 1]) {
      const body = bodyOf(fetchMock, call);
      expect(body.model).toBe("test-model");
      expect(body.response_format).toEqual({ type: "json_object" });
      const images = body.messages[1].content.filter((c: { type: string }) => c.type === "image_url");
      expect(images).toHaveLength(1);
      expect(images[0].image_url.detail).toBe("high");
      expect(images[0].image_url.url).toBe("data:image/jpeg;base64,ZmFrZQ==");
    }
  });

  it("stage 2 is restricted to the chosen row and quotes the document analysis", async () => {
    const { ai, fetchMock } = provider(completion(GOOD_UNDERSTANDING), completion(GOOD_WORK_EXTRACTION));
    await ai.analyze(input());
    const stage2 = bodyOf(fetchMock, 1).messages[1].content[0].text as string;
    expect(stage2).toContain('ONLY the row labelled "Birgit M."');
    expect(stage2).toContain("Anna K.");
    expect(stage2).toContain("evidence");
  });

  it("sends every page as its own image block with 'Seite N von M' markers", async () => {
    const { ai, fetchMock } = provider(completion(GOOD_UNDERSTANDING), completion(GOOD_WORK_EXTRACTION));
    await ai.analyze(
      input({
        images: [
          { base64: "cGFnZTE=", mimeType: "image/jpeg" },
          { base64: "cGFnZTI=", mimeType: "image/png" },
        ],
      }),
    );
    const content = bodyOf(fetchMock, 0).messages[1].content as { type: string; text?: string; image_url?: { url: string } }[];
    expect(content.filter((c) => c.type === "image_url").map((c) => c.image_url!.url)).toEqual([
      "data:image/jpeg;base64,cGFnZTE=",
      "data:image/png;base64,cGFnZTI=",
    ]);
    expect(content.filter((c) => c.type === "text" && /^Seite \d von 2:$/.test(c.text ?? ""))).toHaveLength(2);
  });

  it("happy path: multi-employee roster -> only the chosen row, year taken from the document header", async () => {
    const { ai } = provider(completion(GOOD_UNDERSTANDING), completion(GOOD_WORK_EXTRACTION));
    const result = await ai.analyze(input());
    expect(result.source).toBe("ai");
    if (result.draft.type !== "work") throw new Error("expected work draft");
    expect(result.draft.entries).toHaveLength(2);
    expect(result.draft.entries[0]).toMatchObject({ date: "2026-09-21", start: "06:00", end: "14:00", location: "", uncertain: false });
    expect(result.draft.entries[1]).toMatchObject({ date: "2026-09-22", status: "free" });
    // rows carried no year; the header said "September 2026" -> certain, no clarification question needed
    expect(result.period).toMatchObject({ month: 9, year: 2026, yearCertain: true });
    expect(result.legend).toEqual({ FD: "Frühdienst", F: "Frei" });
  });

  it("a roster without a location column does not make every shift 'unsicher'", async () => {
    const { ai } = provider(completion(GOOD_UNDERSTANDING), completion(GOOD_WORK_EXTRACTION));
    const result = await ai.analyze(input());
    if (result.draft.type !== "work") throw new Error();
    expect(result.draft.entries.filter((e) => e.uncertain)).toHaveLength(0);
    expect(result.uncertainties).toHaveLength(0);
  });

  describe("stage 1 refusals — no extraction happens", () => {
    it("unreadable photo -> photo_unreadable with retake tips (1 call only)", async () => {
      const { ai, fetchMock } = provider(
        completion({ ...GOOD_UNDERSTANDING, quality: { verdict: "unreadable", issues: ["blurry"], wholeDocumentVisible: true } }),
      );
      const error = await expectCode(ai.analyze(input()), "photo_unreadable");
      expect(error.status).toBe(422);
      expect(error.message).toBe("Das Foto ist leider nicht gut genug lesbar.");
      expect(error.extra.tips?.length).toBeGreaterThan(3);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("part of the plan cut off -> photo_unreadable (missing days would be saved silently otherwise)", async () => {
      const { ai, fetchMock } = provider(
        completion({ ...GOOD_UNDERSTANDING, quality: { verdict: "good", issues: [], wholeDocumentVisible: false } }),
      );
      const error = await expectCode(ai.analyze(input()), "photo_unreadable");
      expect(error.extra.issues).toContain("cropped");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("a malformed/empty stage-1 answer is treated as unreadable, never as fine", async () => {
      const { ai } = provider(completion({}));
      await expectCode(ai.analyze(input()), "photo_unreadable");
    });

    it("school timetable uploaded as work plan -> wrong_document", async () => {
      const { ai } = provider(completion({ ...GOOD_UNDERSTANDING, documentKind: "school_timetable" }));
      await expectCode(ai.analyze(input()), "wrong_document");
    });

    it("not a plan at all -> wrong_document", async () => {
      const { ai } = provider(completion({ ...GOOD_UNDERSTANDING, documentKind: "other" }));
      await expectCode(ai.analyze(input()), "wrong_document");
    });
  });

  describe("which row is mine?", () => {
    it("low model confidence -> needs_row_choice listing every printed row, nothing extracted", async () => {
      const { ai, fetchMock } = provider(
        completion({ ...GOOD_UNDERSTANDING, targetRow: { label: "Birgit M.", confidence: 0.4 } }),
      );
      const error = await expectCode(ai.analyze(input()), "needs_row_choice");
      expect(error.status).toBe(409);
      expect(error.extra.rows).toEqual(["Anna K.", "Birgit M.", "Clara S."]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("no matching row -> needs_row_choice, never 'the first row'", async () => {
      const { ai } = provider(completion({ ...GOOD_UNDERSTANDING, targetRow: { label: null, confidence: 0 } }));
      await expectCode(ai.analyze(input()), "needs_row_choice");
    });

    it("a label the model invented (not printed in the document) is not accepted", async () => {
      const { ai } = provider(completion({ ...GOOD_UNDERSTANDING, targetRow: { label: "Birgit Muster", confidence: 0.95 } }));
      await expectCode(ai.analyze(input()), "needs_row_choice");
    });

    it("the user's explicit choice wins over the model's pick", async () => {
      const { ai, fetchMock } = provider(
        completion(GOOD_UNDERSTANDING),
        completion({ ...GOOD_WORK_EXTRACTION, targetRowLabel: "Clara S." }),
      );
      await ai.analyze(input({ rowLabel: "clara s" }));
      expect(bodyOf(fetchMock, 1).messages[1].content[0].text).toContain('ONLY the row labelled "Clara S."');
    });

    it("an explicit choice that is not in this document asks again", async () => {
      const { ai } = provider(completion(GOOD_UNDERSTANDING));
      await expectCode(ai.analyze(input({ rowLabel: "Dora X." })), "needs_row_choice");
    });

    it("a remembered hint is used only when the document still has it and the model does not disagree", async () => {
      const unsure = { ...GOOD_UNDERSTANDING, targetRow: { label: null, confidence: 0 } };
      const ok = provider(completion(unsure), completion(GOOD_WORK_EXTRACTION));
      await ok.ai.analyze(input({ rowHint: "Birgit M." }));
      expect(bodyOf(ok.fetchMock, 1).messages[1].content[0].text).toContain('ONLY the row labelled "Birgit M."');

      const gone = provider(completion(unsure));
      await expectCode(gone.ai.analyze(input({ rowHint: "Dora X." })), "needs_row_choice");

      const disagree = provider(completion({ ...GOOD_UNDERSTANDING, targetRow: { label: "Clara S.", confidence: 0.9 } }), completion({ ...GOOD_WORK_EXTRACTION, targetRowLabel: "Clara S." }));
      await disagree.ai.analyze(input({ rowHint: "Birgit M." }));
      expect(bodyOf(disagree.fetchMock, 1).messages[1].content[0].text).toContain('ONLY the row labelled "Clara S."');
    });

    it("a single-person document needs no row choice", async () => {
      const single = { ...GOOD_UNDERSTANDING, layout: { employeeLabels: [], headers: ["21 Mo"] }, targetRow: { label: null, confidence: 0 } };
      const { ai } = provider(completion(single), completion({ ...GOOD_WORK_EXTRACTION, targetRowLabel: null }));
      const result = await ai.analyze(input());
      expect(result.draft.type).toBe("work");
    });

    it("if stage 2 reports a different row than the one chosen, the result is rejected", async () => {
      const { ai } = provider(completion(GOOD_UNDERSTANDING), completion({ ...GOOD_WORK_EXTRACTION, targetRowLabel: "Anna K." }));
      await expectCode(ai.analyze(input()), "needs_row_choice");
    });
  });

  describe("wrong-assignment protection (evidence cross-checks)", () => {
    const extractionWith = (entries: unknown[]) => ({
      ...GOOD_WORK_EXTRACTION,
      draft: { type: "work", entries },
    });

    it("flags a value whose quoted date header belongs to a different day", async () => {
      const { ai } = provider(
        completion(GOOD_UNDERSTANDING),
        completion(
          extractionWith([
            { day: 22, month: 9, label: "Frühdienst", start: "06:00", end: "14:00", status: "work", evidence: { header: "21 Mo", cell: "06:00-14:00" } },
          ]),
        ),
      );
      const result = await ai.analyze(input());
      if (result.draft.type !== "work") throw new Error();
      expect(result.draft.entries[0]).toMatchObject({ uncertain: true });
      expect(result.draft.entries[0]!.evidenceIssue).toContain("passt nicht zum Tag 22");
      expect(result.uncertainties.some((u) => u.reason.includes("falsch zugeordnet"))).toBe(true);
    });

    it("flags a quoted weekday that contradicts the resolved date", async () => {
      const { ai } = provider(
        completion(GOOD_UNDERSTANDING),
        completion(
          extractionWith([
            { day: 21, month: 9, label: "Frühdienst", start: "06:00", end: "14:00", status: "work", evidence: { header: "21 Di", cell: "06:00-14:00" } },
          ]),
        ),
      );
      const result = await ai.analyze(input());
      if (result.draft.type !== "work") throw new Error();
      expect(result.draft.entries[0]!.uncertain).toBe(true);
      expect(result.draft.entries[0]!.evidenceIssue).toContain("Wochentag");
    });

    it("flags times that are not in the quoted cell text", async () => {
      const { ai } = provider(
        completion(GOOD_UNDERSTANDING),
        completion(
          extractionWith([
            { day: 21, month: 9, label: "Spätdienst", start: "13:00", end: "21:00", status: "work", evidence: { header: "21 Mo", cell: "SD 14:00-22:00" } },
          ]),
        ),
      );
      const result = await ai.analyze(input());
      if (result.draft.type !== "work") throw new Error();
      expect(result.draft.entries[0]!.evidenceIssue).toContain("passt nicht zu den Zeiten");
    });

    it("flags rows that quote no evidence at all", async () => {
      const { ai } = provider(
        completion(GOOD_UNDERSTANDING),
        completion(extractionWith([{ day: 21, month: 9, label: "Frühdienst", start: "06:00", end: "14:00", status: "work" }])),
      );
      const result = await ai.analyze(input());
      if (result.draft.type !== "work") throw new Error();
      expect(result.draft.entries[0]!.uncertain).toBe(true);
      expect(result.draft.entries[0]!.evidenceIssue).toContain("Keine Belegangabe");
    });

    it("an evidence flag survives a year correction (revalidation keeps the reason)", async () => {
      const { revalidateWorkDraftForYear } = await import("@/lib/plan-analysis/revalidate");
      const { ai } = provider(
        completion(GOOD_UNDERSTANDING),
        completion(extractionWith([{ day: 21, month: 9, label: "X", start: "06:00", end: "14:00", status: "work", evidence: { header: "29 Mo", cell: "06:00-14:00" } }])),
      );
      const result = await ai.analyze(input());
      if (result.draft.type !== "work") throw new Error();
      const re = revalidateWorkDraftForYear(result.draft.entries, 2026);
      expect(re.entries[0]!.uncertain).toBe(true);
      expect(re.uncertainties.some((u) => u.reason.includes("Datumsspalte"))).toBe(true);
    });
  });

  it("a month roster shown for December may list early January with the next year", async () => {
    const { ai } = provider(
      completion({ ...GOOD_UNDERSTANDING, period: { month: 12, year: 2026, evidence: "Dezember 2026" } }),
      completion({
        ...GOOD_WORK_EXTRACTION,
        draft: {
          type: "work",
          entries: [
            { day: 30, month: 12, label: "Frei", status: "free", evidence: { header: "30 Mi", cell: "F" } },
            { day: 2, month: 1, label: "Frei", status: "free", evidence: { header: "2 Sa", cell: "F" } },
          ],
        },
      }),
    );
    const result = await ai.analyze(input({ referenceDate: new Date(2026, 11, 20) }));
    if (result.draft.type !== "work") throw new Error();
    expect(result.draft.entries.map((e) => e.date)).toEqual(["2026-12-30", "2027-01-02"]);
  });

  it("a merely 'poor' photo is analysed but capped in confidence and warned about", async () => {
    const { ai } = provider(
      completion({ ...GOOD_UNDERSTANDING, quality: { verdict: "poor", issues: ["glare"], wholeDocumentVisible: true } }),
      completion({ ...GOOD_WORK_EXTRACTION, confidence: 0.95 }),
    );
    const result = await ai.analyze(input());
    expect(result.confidence).toBeLessThanOrEqual(0.5);
    expect(result.warnings[0]).toContain("eingeschränkt lesbar");
  });

  describe("school timetable", () => {
    const SCHOOL_UNDERSTANDING = {
      quality: { verdict: "good", issues: [], wholeDocumentVisible: true },
      documentKind: "school_timetable",
      layout: { headers: ["Mo", "Di", "Mi", "Do", "Fr"], timeSlots: ["1. 08:00-08:50", "2. 08:55-09:45"] },
    };
    const school = (lessons: Record<string, unknown[]>) => ({
      mode: "school",
      confidence: 0.8,
      warnings: [],
      uncertainties: [],
      draft: { type: "school", week: Object.fromEntries(Object.entries(lessons).map(([k, v]) => [k, { lessons: v }])) },
    });

    it("clean grid: lessons keep their weekday and start time, nothing flagged", async () => {
      const { ai } = provider(
        completion(SCHOOL_UNDERSTANDING),
        completion(
          school({
            mon: [
              { id: "a", time: "08:00", subject: "Mathematik", room: "B204", evidence: { dayHeader: "Mo", slot: "1. 08:00-08:50" } },
              { id: "b", time: "08:55", subject: "Englisch", room: "A112", evidence: { dayHeader: "Mo", slot: "2. 08:55-09:45" } },
            ],
          }),
        ),
      );
      const result = await ai.analyze(input({ planType: "school", personName: "Levi", personId: "levi" }));
      if (result.draft.type !== "school") throw new Error();
      expect(result.draft.week.mon!.lessons.map((l) => [l.time, l.subject, l.uncertain])).toEqual([
        ["08:00", "Mathematik", false],
        ["08:55", "Englisch", false],
      ]);
    });

    it("flags a lesson filed under a weekday that contradicts its quoted column header", async () => {
      const { ai } = provider(
        completion(SCHOOL_UNDERSTANDING),
        completion(school({ tue: [{ id: "a", time: "08:00", subject: "Mathematik", room: "B204", evidence: { dayHeader: "Mo", slot: "1. 08:00-08:50" } }] })),
      );
      const result = await ai.analyze(input({ planType: "school" }));
      if (result.draft.type !== "school") throw new Error();
      expect(result.draft.week.tue!.lessons[0]!.uncertain).toBe(true);
      expect(result.uncertainties.some((u) => u.reason.includes("passt nicht zum Wochentag"))).toBe(true);
    });

    it("flags a start time that is not the quoted slot's time, and duplicate start times", async () => {
      const { ai } = provider(
        completion(SCHOOL_UNDERSTANDING),
        completion(
          school({
            mon: [
              { id: "a", time: "09:00", subject: "Mathematik", room: "B204", evidence: { dayHeader: "Mo", slot: "1. 08:00-08:50" } },
              { id: "b", time: "09:00", subject: "Englisch", room: "A112", evidence: { dayHeader: "Mo", slot: "2. 08:55-09:45" } },
            ],
          }),
        ),
      );
      const result = await ai.analyze(input({ planType: "school" }));
      const reasons = result.uncertainties.map((u) => u.reason).join(" | ");
      expect(reasons).toContain("passt nicht zur Startzeit");
      expect(reasons).toContain("Mehrere Stunden beginnen um 09:00");
    });

    it("work plan uploaded as timetable -> wrong_document", async () => {
      const { ai } = provider(completion({ ...SCHOOL_UNDERSTANDING, documentKind: "work_roster" }));
      await expectCode(ai.analyze(input({ planType: "school" })), "wrong_document");
    });
  });

  describe("transport errors are honest", () => {
    it("401 -> a clear error naming the status", async () => {
      const { ai } = provider({ ok: false, status: 401, text: async () => "invalid_api_key" });
      await expect(ai.analyze(input())).rejects.toThrow(/OpenAI-Fehler \(401\)/);
    });

    it("a missing model points at OPENAI_PLAN_MODEL", async () => {
      const { ai } = provider({ ok: false, status: 404, text: async () => "model_not_found" });
      await expect(ai.analyze(input())).rejects.toThrow(/OPENAI_PLAN_MODEL/);
    });

    it("retries once on 429 and then succeeds", async () => {
      const { ai, fetchMock } = provider(
        { ok: false, status: 429, text: async () => "rate" },
        completion(GOOD_UNDERSTANDING),
        completion(GOOD_WORK_EXTRACTION),
      );
      await ai.analyze(input());
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("an empty response is an error, not an empty-but-valid plan", async () => {
      const { ai } = provider({ ok: true, json: async () => ({ choices: [] }) });
      await expect(ai.analyze(input())).rejects.toThrow("Leere KI-Antwort");
    });

    it("non-JSON content is an error, not a guess", async () => {
      const { ai } = provider({ ok: true, json: async () => ({ choices: [{ message: { content: "not json {" } }] }) });
      await expect(ai.analyze(input())).rejects.toThrow("kein gültiges JSON");
    });

    it("a network failure is reported as unreachable", async () => {
      const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
      const ai = new OpenAiPlanAi("k", "m", fetchMock as unknown as typeof fetch);
      await expect(ai.analyze(input())).rejects.toThrow("nicht erreichbar");
    });

    it("a draft with no valid dated rows is rejected, not saved as empty", async () => {
      const { ai } = provider(
        completion(GOOD_UNDERSTANDING),
        completion({ ...GOOD_WORK_EXTRACTION, draft: { type: "work", entries: [] } }),
      );
      await expect(ai.analyze(input())).rejects.toThrow();
    });
  });
});
