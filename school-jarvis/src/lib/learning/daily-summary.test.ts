import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  authenticateCoffeeMorningRequest,
  getCoffeeMorningApiToken,
  getIntegrationPersonId,
} from "@/lib/auth/coffee-morning-token";
import {
  assertNoSensitiveLeak,
  validateSchoolJarvisDailySummary,
} from "@/lib/contract/validate";
import {
  MemoryLearningDataSource,
  UnavailableLearningDataSource,
  resetLearningDataSource,
  setLearningDataSource,
  type LearningSnapshot,
} from "@/lib/learning/data-source";
import {
  buildDailySummary,
  buildDailySummaryFromSnapshot,
  collectWeakTopics,
  countDueFlashcards,
  selectNextExam,
} from "@/lib/learning/summary";
import { GET } from "@/app/api/integrations/coffee/daily-summary/route";

const TOKEN = "test-coffee-morning-token";

function authEnv(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    COFFEE_MORNING_API_TOKEN: TOKEN,
    COFFEE_MORNING_PERSON_ID: "levi",
    ...overrides,
  };
}

function fixtureSnapshot(): LearningSnapshot {
  return {
    exams: [
      { personId: "levi", subject: "Physik", date: "2026-09-20" },
      { personId: "levi", subject: "Elektrotechnik", date: "2026-09-18" },
      { personId: "birgit", subject: "Irrelevant", date: "2026-09-16" },
    ],
    flashcards: [
      { personId: "levi", dueDate: "2026-09-10" },
      { personId: "levi", dueDate: "2026-09-14" },
      { personId: "levi", dueDate: "2026-09-20" },
      { personId: "heidi", dueDate: "2026-09-01" },
    ],
    weakTopics: [
      { personId: "levi", topic: "Ohmisches Gesetz" },
      { personId: "levi", topic: "Kirchhoff" },
      { personId: "levi", topic: "Ohmisches Gesetz" },
      { personId: "birgit", topic: "Pflege" },
    ],
    recommendations: [
      {
        personId: "levi",
        focusDate: "2026-09-14",
        recommendedStudyMinutes: 25,
        recommendation: "Schaltungen kurz wiederholen.",
      },
    ],
  };
}

describe("Coffee Morning token auth", () => {
  it("rejects missing token with 401", () => {
    const result = authenticateCoffeeMorningRequest(null, authEnv());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(401);
    expect(result.error).toBe("missing_token");
  });

  it("rejects invalid token with 401", () => {
    const result = authenticateCoffeeMorningRequest(
      "Bearer wrong-token",
      authEnv(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(401);
    expect(result.error).toBe("invalid_token");
  });

  it("accepts valid bearer token", () => {
    const result = authenticateCoffeeMorningRequest(
      `Bearer ${TOKEN}`,
      authEnv(),
    );
    expect(result.ok).toBe(true);
  });

  it("reports not configured when ENV secret is missing", () => {
    const result = authenticateCoffeeMorningRequest(`Bearer ${TOKEN}`, {});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(503);
    expect(getCoffeeMorningApiToken({})).toBeNull();
  });

  it("defaults integration person to levi", () => {
    expect(getIntegrationPersonId({})).toBe("levi");
  });
});

describe("daily summary builder", () => {
  it("selects the soonest upcoming exam for Levi", () => {
    const next = selectNextExam(fixtureSnapshot(), "levi", "2026-09-14");
    expect(next).toEqual({
      subject: "Elektrotechnik",
      date: "2026-09-18",
      daysUntil: 4,
    });
  });

  it("counts due flashcards correctly", () => {
    expect(countDueFlashcards(fixtureSnapshot(), "levi", "2026-09-14")).toBe(2);
  });

  it("collects distinct weak topics for Levi only", () => {
    expect(collectWeakTopics(fixtureSnapshot(), "levi")).toEqual([
      "Ohmisches Gesetz",
      "Kirchhoff",
    ]);
  });

  it("builds a contract-valid available summary", () => {
    const summary = buildDailySummaryFromSnapshot({
      personId: "levi",
      focusDate: "2026-09-14",
      snapshot: fixtureSnapshot(),
    });
    const validated = validateSchoolJarvisDailySummary(summary);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    expect(validated.summary.available).toBe(true);
    expect(validated.summary.action?.target).toBe("recommended-learning");
    expect(assertNoSensitiveLeak(validated.summary)).toEqual([]);
  });

  it("returns unavailable when snapshot is empty (no invented data)", () => {
    const summary = buildDailySummaryFromSnapshot({
      personId: "levi",
      focusDate: "2026-09-14",
      snapshot: {
        exams: [],
        flashcards: [],
        weakTopics: [],
        recommendations: [],
      },
    });
    expect(summary.available).toBe(false);
    expect(summary.nextExam).toBeNull();
    expect(summary.today).toBeNull();
    expect(summary.learning).toBeNull();
    expect(summary.action).toBeNull();
  });

  it("returns unavailable when data source is temporarily down", async () => {
    const summary = await buildDailySummary({
      personId: "levi",
      focusDate: "2026-09-14",
      source: new UnavailableLearningDataSource(),
    });
    expect(summary.available).toBe(false);
  });
});

describe("GET /api/integrations/coffee/daily-summary", () => {
  const prevToken = process.env.COFFEE_MORNING_API_TOKEN;
  const prevPerson = process.env.COFFEE_MORNING_PERSON_ID;

  beforeEach(() => {
    process.env.COFFEE_MORNING_API_TOKEN = TOKEN;
    process.env.COFFEE_MORNING_PERSON_ID = "levi";
    setLearningDataSource(new MemoryLearningDataSource(fixtureSnapshot()));
  });

  afterEach(() => {
    if (prevToken === undefined) delete process.env.COFFEE_MORNING_API_TOKEN;
    else process.env.COFFEE_MORNING_API_TOKEN = prevToken;
    if (prevPerson === undefined) delete process.env.COFFEE_MORNING_PERSON_ID;
    else process.env.COFFEE_MORNING_PERSON_ID = prevPerson;
    resetLearningDataSource();
  });

  async function call(opts: {
    token?: string | null;
    personId?: string;
    focusDate?: string;
  }) {
    const url = new URL("http://127.0.0.1/api/integrations/coffee/daily-summary");
    url.searchParams.set("personId", opts.personId ?? "levi");
    url.searchParams.set("focusDate", opts.focusDate ?? "2026-09-14");
    const headers = new Headers();
    if (opts.token !== null) {
      headers.set("authorization", `Bearer ${opts.token ?? TOKEN}`);
    }
    return GET(new Request(url, { headers }));
  }

  it("valid token → 200 with contract body", async () => {
    const res = await call({});
    expect(res.status).toBe(200);
    const body = await res.json();
    const validated = validateSchoolJarvisDailySummary(body);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    expect(validated.summary.personId).toBe("levi");
    expect(validated.summary.nextExam?.subject).toBe("Elektrotechnik");
    expect(validated.summary.learning?.dueFlashcards).toBe(2);
    expect(validated.summary.learning?.weakTopics).toEqual([
      "Ohmisches Gesetz",
      "Kirchhoff",
    ]);
    expect(assertNoSensitiveLeak(validated.summary)).toEqual([]);
  });

  it("missing token → 401", async () => {
    const res = await call({ token: null });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("unauthorized");
    expect(JSON.stringify(body).toLowerCase()).not.toContain(TOKEN.toLowerCase());
  });

  it("wrong token → 401", async () => {
    const res = await call({ token: "nope" });
    expect(res.status).toBe(401);
  });

  it("does not return sensitive or internal fields", async () => {
    const res = await call({});
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual([
      "action",
      "available",
      "focusDate",
      "learning",
      "nextExam",
      "personId",
      "today",
    ]);
    expect(body).not.toHaveProperty("exams");
    expect(body).not.toHaveProperty("flashcards");
    expect(body).not.toHaveProperty("documents");
    expect(body).not.toHaveProperty("debug");
  });

  it("empty learning store → clean unavailable", async () => {
    setLearningDataSource(
      new MemoryLearningDataSource({
        exams: [],
        flashcards: [],
        weakTopics: [],
        recommendations: [],
      }),
    );
    const res = await call({});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(false);
    expect(body.nextExam).toBeNull();
    expect(body.today).toBeNull();
    expect(body.learning).toBeNull();
    expect(body.action).toBeNull();
  });

  it("non-integration person stays unavailable without foreign data", async () => {
    const res = await call({ personId: "birgit" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(false);
    expect(body.personId).toBe("birgit");
    expect(body.nextExam).toBeNull();
  });
});
