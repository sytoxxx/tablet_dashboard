import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAiPlanAi } from "@/server/ai/openai";

/**
 * STATIC verification of the real OpenAI production path — no OPENAI_API_KEY
 * is available in this environment (checked: not in process.env, not in any
 * .env file), so this suite mocks only the network boundary (`fetch`) and
 * exercises every other line of the real `OpenAiPlanAi` class exactly as
 * production does: request construction, header/body shape, and — critically
 * — piping a realistic OpenAI response through the REAL `validatePlanAnalysis`
 * pipeline. This is NOT a substitute for a live call against a real photo;
 * it proves the code path is wired correctly, not that real-world image
 * quality will be recognized well. See the session report for what remains
 * genuinely unverified without a real key.
 */

const REF = new Date(2026, 8, 10);

function realisticChatCompletion(contentObj: unknown) {
  return {
    id: "chatcmpl-test",
    choices: [{ message: { content: JSON.stringify(contentObj) } }],
  };
}

const REALISTIC_WORK_RESPONSE = {
  mode: "work",
  source: "ai",
  confidence: 0.81,
  warnings: [],
  uncertainties: [],
  legend: { FD: "Frühdienst", F: "Frei" },
  draft: {
    type: "work",
    entries: [
      { day: 21, month: 9, year: 2026, weekday: "mon", label: "Frühschicht", start: "06:00", end: "14:00", location: "Station 3", status: "work" },
      { day: 22, month: 9, year: 2026, weekday: "tue", label: "Frei", status: "free" },
      { day: 23, month: 9, year: 2026, weekday: "wed", code: "FD", label: "", status: "" },
    ],
  },
};

describe("OpenAiPlanAi — real production path, network mocked (no live key available)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws before any network call when no images were provided", async () => {
    const provider = new OpenAiPlanAi("test-key-not-real");
    await expect(
      provider.analyze({
        planType: "work",
        personId: "birgit",
        personName: "Birgit",
        images: [],
        referenceDate: REF,
      }),
    ).rejects.toThrow("Kein Bild");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("builds the real request: endpoint, auth header, model, single image_url block", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => realisticChatCompletion(REALISTIC_WORK_RESPONSE),
    });
    const provider = new OpenAiPlanAi("test-key-not-real", "gpt-4o-mini");
    await provider.analyze({
      planType: "work",
      personId: "birgit",
      personName: "Birgit",
      images: [{ base64: "ZmFrZQ==", mimeType: "image/jpeg" }],
      referenceDate: REF,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer test-key-not-real");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.response_format).toEqual({ type: "json_object" });
    const userContent = body.messages[1].content;
    const imageBlocks = userContent.filter((c: { type: string }) => c.type === "image_url");
    expect(imageBlocks).toHaveLength(1);
    expect(imageBlocks[0].image_url.url).toBe("data:image/jpeg;base64,ZmFrZQ==");
  });

  it("sends every page as its own image_url block, in order, with 'Seite N von M' markers", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => realisticChatCompletion(REALISTIC_WORK_RESPONSE),
    });
    const provider = new OpenAiPlanAi("test-key-not-real");
    await provider.analyze({
      planType: "work",
      personId: "birgit",
      personName: "Birgit",
      images: [
        { base64: "cGFnZTE=", mimeType: "image/jpeg" },
        { base64: "cGFnZTI=", mimeType: "image/png" },
        { base64: "cGFnZTM=", mimeType: "image/jpeg" },
      ],
      referenceDate: REF,
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body);
    const userContent = body.messages[1].content as { type: string; text?: string; image_url?: { url: string } }[];
    const imageBlocks = userContent.filter((c) => c.type === "image_url");
    expect(imageBlocks.map((b) => b.image_url!.url)).toEqual([
      "data:image/jpeg;base64,cGFnZTE=",
      "data:image/png;base64,cGFnZTI=",
      "data:image/jpeg;base64,cGFnZTM=",
    ]);
    const pageMarkers = userContent.filter((c) => c.type === "text" && /^Seite \d von 3:$/.test(c.text ?? ""));
    expect(pageMarkers.map((m) => m.text)).toEqual(["Seite 1 von 3:", "Seite 2 von 3:", "Seite 3 von 3:"]);
  });

  it("pipes a realistic response through the REAL validation pipeline end to end", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => realisticChatCompletion(REALISTIC_WORK_RESPONSE),
    });
    const provider = new OpenAiPlanAi("test-key-not-real");
    const result = await provider.analyze({
      planType: "work",
      personId: "birgit",
      personName: "Birgit",
      images: [{ base64: "ZmFrZQ==", mimeType: "image/jpeg" }],
      referenceDate: REF,
    });

    expect(result.source).toBe("ai");
    expect(result.draft.type).toBe("work");
    if (result.draft.type !== "work") return;
    expect(result.draft.entries).toHaveLength(3);
    expect(result.draft.entries.find((e) => e.date === "2026-09-21")).toMatchObject({
      status: "work",
      start: "06:00",
      end: "14:00",
    });
    expect(result.draft.entries.find((e) => e.date === "2026-09-22")).toMatchObject({
      status: "free",
    });
    // The bare "FD" code with no times resolves via the legend the model itself returned.
    const legendEntry = result.draft.entries.find((e) => e.date === "2026-09-23");
    expect(legendEntry).toMatchObject({ code: "FD", label: "Frühdienst" });
    expect(result.legend).toEqual({ FD: "Frühdienst", F: "Frei" });
    expect(result.period).toMatchObject({ month: 9, year: 2026, yearCertain: true });
  });

  it("surfaces a clear German error on a non-ok HTTP response instead of throwing a raw fetch error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "invalid_api_key",
    });
    const provider = new OpenAiPlanAi("test-key-not-real");
    await expect(
      provider.analyze({
        planType: "work",
        personId: "birgit",
        personName: "Birgit",
        images: [{ base64: "ZmFrZQ==", mimeType: "image/jpeg" }],
        referenceDate: REF,
      }),
    ).rejects.toThrow(/OpenAI-Fehler \(401\)/);
  });

  it("throws on an empty response instead of treating it as an empty-but-valid plan", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ choices: [] }) });
    const provider = new OpenAiPlanAi("test-key-not-real");
    await expect(
      provider.analyze({
        planType: "work",
        personId: "birgit",
        personName: "Birgit",
        images: [{ base64: "ZmFrZQ==", mimeType: "image/jpeg" }],
        referenceDate: REF,
      }),
    ).rejects.toThrow("Leere KI-Antwort");
  });

  it("throws instead of guessing when the model's content isn't valid JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "not json at all {" } }] }),
    });
    const provider = new OpenAiPlanAi("test-key-not-real");
    await expect(
      provider.analyze({
        planType: "work",
        personId: "birgit",
        personName: "Birgit",
        images: [{ base64: "ZmFrZQ==", mimeType: "image/jpeg" }],
        referenceDate: REF,
      }),
    ).rejects.toThrow("kein gültiges JSON");
  });

  it("rejects (never silently accepts) a response whose draft fails real validation", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        realisticChatCompletion({
          mode: "work",
          confidence: 0.9,
          warnings: [],
          uncertainties: [],
          draft: { type: "work", entries: [] }, // no valid dated entries at all
        }),
    });
    const provider = new OpenAiPlanAi("test-key-not-real");
    await expect(
      provider.analyze({
        planType: "work",
        personId: "birgit",
        personName: "Birgit",
        images: [{ base64: "ZmFrZQ==", mimeType: "image/jpeg" }],
        referenceDate: REF,
      }),
    ).rejects.toThrow();
  });
});
