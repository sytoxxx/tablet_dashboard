import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { exampleFullSummary } from "@/lib/integrations/school-jarvis/examples";
import {
  acceptSchoolJarvisPayload,
  fetchSchoolJarvisDailySummary,
  shouldShowSchoolJarvisCard,
} from "@/lib/integrations/school-jarvis/client";
import { isSchoolJarvisUiPerson } from "@/lib/integrations/school-jarvis/persons";
import {
  getSchoolJarvisServerConfig,
  resolveSchoolJarvisHandoffUrl,
  type SchoolJarvisServerConfig,
} from "@/server/school-jarvis/config";
import { SchoolJarvisSummaryCache } from "@/server/school-jarvis/cache";

function testConfig(
  overrides: Partial<SchoolJarvisServerConfig> = {},
): SchoolJarvisServerConfig {
  return {
    configured: true,
    baseUrl: "https://school-jarvis.test",
    summaryPath: "/api/integrations/coffee/daily-summary",
    apiToken: "test-token",
    handoffUrlTemplate:
      "https://school-jarvis.test/learn?target={target}&personId={personId}",
    timeoutMs: 2_000,
    cacheTtlMs: 60_000,
    allowedPersons: ["levi"],
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("School Jarvis live integration", () => {
  let cache: SchoolJarvisSummaryCache;

  beforeEach(() => {
    cache = new SchoolJarvisSummaryCache(() => Date.now());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a valid summary from School Jarvis", async () => {
    const summary = exampleFullSummary("levi", "2026-09-14");
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(summary));

    const result = await fetchSchoolJarvisDailySummary(
      { personId: "levi", focusDate: "2026-09-14" },
      { config: testConfig(), cache, fetchImpl, bypassCache: true },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe("school-jarvis");
    expect(result.summary.personId).toBe("levi");
    expect(result.summary.action?.target).toBe("recommended-learning");
    expect(result.handoffUrl).toContain("recommended-learning");
    expect(shouldShowSchoolJarvisCard(result)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("personId=levi");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-token",
    );
  });

  it("rejects an invalid summary payload", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ available: true, personId: "levi" }));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await fetchSchoolJarvisDailySummary(
      { personId: "levi", focusDate: "2026-09-14" },
      { config: testConfig(), cache, fetchImpl, bypassCache: true },
    );

    expect(result.ok).toBe(false);
    expect(result.summary).toBeNull();
    expect(err).toHaveBeenCalled();
  });

  it("treats School Jarvis 404 as unavailable", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 404));
    const result = await fetchSchoolJarvisDailySummary(
      { personId: "levi", focusDate: "2026-09-14" },
      { config: testConfig(), cache, fetchImpl, bypassCache: true },
    );
    expect(result.ok).toBe(false);
    expect(result.summary).toBeNull();
  });

  it("treats School Jarvis 500 as unavailable", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: "boom" }, 500));
    const result = await fetchSchoolJarvisDailySummary(
      { personId: "levi", focusDate: "2026-09-14" },
      { config: testConfig(), cache, fetchImpl, bypassCache: true },
    );
    expect(result.ok).toBe(false);
  });

  it("treats timeout as unavailable", async () => {
    const fetchImpl = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
          });
        }),
    );

    const result = await fetchSchoolJarvisDailySummary(
      { personId: "levi", focusDate: "2026-09-14" },
      {
        config: testConfig({ timeoutMs: 20 }),
        cache,
        fetchImpl,
        bypassCache: true,
      },
    );
    expect(result.ok).toBe(false);
  });

  it("returns unavailable when configuration is missing", async () => {
    const fetchImpl = vi.fn();
    const result = await fetchSchoolJarvisDailySummary(
      { personId: "levi", focusDate: "2026-09-14" },
      {
        config: testConfig({
          configured: false,
          baseUrl: null,
          apiToken: null,
        }),
        cache,
        fetchImpl,
      },
    );
    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("treats auth errors as unavailable without leaking details", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 401));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await fetchSchoolJarvisDailySummary(
      { personId: "levi", focusDate: "2026-09-14" },
      { config: testConfig(), cache, fetchImpl, bypassCache: true },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).not.toMatch(/token|secret|bearer/i);
    expect(err).toHaveBeenCalled();
  });

  it("serves a valid cache hit without calling School Jarvis again", async () => {
    const summary = exampleFullSummary("levi", "2026-09-14");
    const fetchImpl = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse(summary)));

    const first = await fetchSchoolJarvisDailySummary(
      { personId: "levi", focusDate: "2026-09-14" },
      { config: testConfig({ cacheTtlMs: 60_000 }), cache, fetchImpl },
    );
    expect(first.ok).toBe(true);

    const second = await fetchSchoolJarvisDailySummary(
      { personId: "levi", focusDate: "2026-09-14" },
      { config: testConfig({ cacheTtlMs: 60_000 }), cache, fetchImpl },
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.source).toBe("cache");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("refetches when the cache has expired", async () => {
    let now = 1_000_000;
    const ttlCache = new SchoolJarvisSummaryCache(() => now);
    const summary = exampleFullSummary("levi", "2026-09-14");
    const fetchImpl = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse(summary)));
    const config = testConfig({ cacheTtlMs: 1_000 });

    const first = await fetchSchoolJarvisDailySummary(
      { personId: "levi", focusDate: "2026-09-14" },
      { config, cache: ttlCache, fetchImpl },
    );
    expect(first.ok).toBe(true);
    now += 2_000;
    const second = await fetchSchoolJarvisDailySummary(
      { personId: "levi", focusDate: "2026-09-14" },
      { config, cache: ttlCache, fetchImpl },
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.source).toBe("school-jarvis");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("rejects foreign person data for Levi requests", async () => {
    const foreign = exampleFullSummary("birgit", "2026-09-14");
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(foreign));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await fetchSchoolJarvisDailySummary(
      { personId: "levi", focusDate: "2026-09-14" },
      { config: testConfig(), cache, fetchImpl, bypassCache: true },
    );
    expect(result.ok).toBe(false);
    expect(err).toHaveBeenCalled();
  });

  it("does not call School Jarvis for Birgit or Heidi", async () => {
    const fetchImpl = vi.fn();
    for (const personId of ["birgit", "heidi"] as const) {
      const result = await fetchSchoolJarvisDailySummary(
        { personId, focusDate: "2026-09-14" },
        { config: testConfig(), cache, fetchImpl },
      );
      expect(result.ok).toBe(false);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("allows Levi in the UI person gate and blocks others", () => {
    expect(isSchoolJarvisUiPerson("levi")).toBe(true);
    expect(isSchoolJarvisUiPerson("birgit")).toBe(false);
    expect(isSchoolJarvisUiPerson("heidi")).toBe(false);
  });

  it("resolves recommended-learning handoff without hardcoding hosts in UI", () => {
    const url = resolveSchoolJarvisHandoffUrl({
      template:
        "https://school-jarvis.test/learn?target={target}&personId={personId}",
      target: "recommended-learning",
      personId: "levi",
    });
    expect(url).toBe(
      "https://school-jarvis.test/learn?target=recommended-learning&personId=levi",
    );
  });

  it("acceptSchoolJarvisPayload rejects mismatched persons", () => {
    const accepted = acceptSchoolJarvisPayload(exampleFullSummary("birgit"), {
      expectedPersonId: "levi",
    });
    expect(accepted.ok).toBe(false);
  });

  it("reads env config without hardcoding secrets", () => {
    const cfg = getSchoolJarvisServerConfig({
      SCHOOL_JARVIS_BASE_URL: "https://sj.example/",
      SCHOOL_JARVIS_API_TOKEN: "secret",
      SCHOOL_JARVIS_ALLOWED_PERSONS: "levi",
    });
    expect(cfg.configured).toBe(true);
    expect(cfg.baseUrl).toBe("https://sj.example");
    expect(cfg.apiToken).toBe("secret");
    expect(cfg.allowedPersons).toEqual(["levi"]);

    const missing = getSchoolJarvisServerConfig({});
    expect(missing.configured).toBe(false);
  });

  it("accepts envelope responses from School Jarvis", async () => {
    const summary = exampleFullSummary("levi", "2026-09-14");
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, summary }),
    );
    const result = await fetchSchoolJarvisDailySummary(
      { personId: "levi", focusDate: "2026-09-14" },
      { config: testConfig(), cache, fetchImpl, bypassCache: true },
    );
    expect(result.ok).toBe(true);
  });
});
