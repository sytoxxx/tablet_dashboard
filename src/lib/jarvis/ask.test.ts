import { describe, expect, it } from "vitest";
import { askJarvis } from "@/lib/jarvis/ask";
import { classifyJarvisIntent } from "@/lib/jarvis/intents";
import { withAiAnswer } from "@/server/jarvis/phrase";
import { seedAppData, seedPersons } from "@/data/seed";
import type { PersonProfile } from "@/lib/types";

function person(id: "levi" | "birgit" | "heidi"): PersonProfile {
  const p = seedPersons.find((x) => x.id === id);
  if (!p) throw new Error(id);
  return structuredClone(p);
}

const MON_MORNING = new Date(2026, 8, 14, 7, 0, 0, 0);
const SAT_MORNING = new Date(2026, 8, 19, 8, 0, 0, 0);

describe("classifyJarvisIntent", () => {
  it("maps supported questions", () => {
    expect(classifyJarvisIntent("Was steht heute an?")).toBe("day_overview");
    expect(classifyJarvisIntent("Was muss ich mitnehmen?")).toBe("bring");
    expect(classifyJarvisIntent("Wann muss ich los?")).toBe("leave_time");
    expect(classifyJarvisIntent("Welcher Bus kommt als nächstes?")).toBe("bus");
    expect(classifyJarvisIntent("Wie wird das Wetter?")).toBe("weather");
    expect(classifyJarvisIntent("Was habe ich als Nächstes?")).toBe(
      "next_activity",
    );
    expect(classifyJarvisIntent("Was ist heute wichtig?")).toBe("important");
    expect(classifyJarvisIntent("Wie sieht mein Morgen aus?")).toBe(
      "morning_brief",
    );
  });

  it("empty and unknown", () => {
    expect(classifyJarvisIntent("")).toBe("empty");
    expect(classifyJarvisIntent("   ")).toBe("empty");
    expect(classifyJarvisIntent("Wer hat die Champions League gewonnen?")).toBe(
      "unknown",
    );
  });
});

describe("askJarvis", () => {
  it("day overview for Levi school morning", () => {
    const r = askJarvis("levi", "Was steht heute an?", MON_MORNING, {
      person: person("levi"),
      data: seedAppData,
    });
    expect(r.personId).toBe("levi");
    expect(r.intent).toBe("day_overview");
    expect(r.source).toBe("deterministic");
    expect(r.answer).toMatch(/Levi/i);
    expect(r.answer).toMatch(/Mathematik|08:15/);
    expect(r.facts.summary).toBeTruthy();
  });

  it("bring list", () => {
    const r = askJarvis("levi", "Was muss ich mitnehmen?", MON_MORNING, {
      person: person("levi"),
      data: seedAppData,
    });
    expect(r.intent).toBe("bring");
    expect(r.answer.toLowerCase()).toMatch(/laptop|mathematik|sport/);
  });

  it("next activity", () => {
    const r = askJarvis("levi", "Was habe ich als Nächstes?", MON_MORNING, {
      person: person("levi"),
      data: seedAppData,
    });
    expect(r.intent).toBe("next_activity");
    expect(r.answer).toMatch(/Mathematik|08:15|Als Nächstes/);
  });

  it("bus planned / testdata", () => {
    const r = askJarvis("birgit", "Welcher Bus kommt als nächstes?", MON_MORNING, {
      person: person("birgit"),
      data: seedAppData,
      live: {
        busEnabled: true,
        busIsTestData: true,
        bus: {
          line: "1",
          destination: "Europaplatz [TEST]",
          departure: "07:32",
          stopName: "Start",
          minutesUntil: 30,
          source: "local",
          isTestData: true,
          arrivesInTime: true,
        },
      },
    });
    expect(r.intent).toBe("bus");
    expect(r.answer).toMatch(/07:32/);
    expect(r.answer).toMatch(/Testdaten/i);
    expect(r.answer.toLowerCase()).not.toContain("live");
  });

  it("bus delayed realtime", () => {
    const r = askJarvis("birgit", "Welcher Bus kommt als nächstes?", MON_MORNING, {
      person: person("birgit"),
      data: seedAppData,
      live: {
        busEnabled: true,
        busIsTestData: false,
        bus: {
          line: "1",
          destination: "Bruck",
          departure: "07:41",
          scheduledDeparture: "07:32",
          realtimeDeparture: "07:41",
          delayMinutes: 9,
          isRealtime: true,
          source: "live",
          isTestData: false,
          stopName: "Start",
          minutesUntil: 20,
          arrivesInTime: true,
          matchedToWork: true,
        },
      },
    });
    expect(r.answer).toMatch(/07:41/);
    expect(r.answer).toMatch(/9 Minuten Verspätung/);
  });

  it("bus cancelled", () => {
    const r = askJarvis("birgit", "Welcher Bus kommt als nächstes?", MON_MORNING, {
      person: person("birgit"),
      data: seedAppData,
      live: {
        busEnabled: true,
        bus: {
          line: "1",
          destination: "Bruck",
          departure: "05:32",
          scheduledDeparture: "05:32",
          stopName: "Start",
          minutesUntil: 0,
          cancelled: true,
          source: "live",
        },
      },
    });
    expect(r.answer).toMatch(/fällt aus/i);
  });

  it("weather", () => {
    const r = askJarvis("levi", "Wie wird das Wetter?", MON_MORNING, {
      person: person("levi"),
      data: seedAppData,
    });
    expect(r.intent).toBe("weather");
    expect(r.answer).toMatch(/Grad/);
  });

  it("important tasks", () => {
    const r = askJarvis("levi", "Was ist heute wichtig?", MON_MORNING, {
      person: person("levi"),
      data: seedAppData,
    });
    expect(r.intent).toBe("important");
    expect(r.answer.toLowerCase()).toMatch(/wichtig|hausaufgaben|schultasche/);
  });

  it("empty question", () => {
    const r = askJarvis("levi", "  ", MON_MORNING, {
      person: person("levi"),
      data: seedAppData,
    });
    expect(r.intent).toBe("empty");
    expect(r.answer.length).toBeGreaterThan(10);
  });

  it("unknown question", () => {
    const r = askJarvis("levi", "Erzähl einen Witz", MON_MORNING, {
      person: person("levi"),
      data: seedAppData,
    });
    expect(r.intent).toBe("unknown");
    expect(r.answer).toMatch(/keine Daten/i);
  });

  it("empty day", () => {
    const levi = person("levi");
    levi.appointments = [];
    const r = askJarvis("levi", "Was steht heute an?", SAT_MORNING, {
      person: levi,
      data: seedAppData,
    });
    expect(r.answer).toMatch(/nichts Festes|nichts geplant/i);
  });

  it("Birgit work day stays person-specific", () => {
    const r = askJarvis("birgit", "Was steht heute an?", MON_MORNING, {
      person: person("birgit"),
      data: seedAppData,
    });
    expect(r.personId).toBe("birgit");
    expect(r.answer).toMatch(/Birgit/);
    expect(r.answer).toMatch(/Frühschicht|Arbeit/i);
    expect(r.facts.displayName).toBe("Birgit");
  });

  it("Heidi uses Heidi data only", () => {
    const r = askJarvis("heidi", "Was habe ich als Nächstes?", MON_MORNING, {
      person: person("heidi"),
      data: seedAppData,
    });
    expect(r.personId).toBe("heidi");
    expect(r.facts.displayName).toBe("Heidi");
    expect(r.answer).not.toMatch(/Mathematik/);
  });

  it("missing weather facts → honest fallback", () => {
    const levi = person("levi");
    const r = askJarvis("levi", "Wie wird das Wetter?", MON_MORNING, {
      person: levi,
      data: seedAppData,
      live: { weather: null },
    });
    expect(r.answer).toMatch(/keine Wetterdaten/i);
  });

  it("leave time uses bus departure", () => {
    const r = askJarvis("birgit", "Wann muss ich los?", MON_MORNING, {
      person: person("birgit"),
      data: seedAppData,
      live: {
        busEnabled: true,
        bus: {
          line: "1",
          destination: "Bruck",
          departure: "05:32",
          stopName: "Start",
          minutesUntil: 20,
          arrivesInTime: true,
          source: "local",
          isTestData: true,
        },
      },
    });
    expect(r.intent).toBe("leave_time");
    expect(r.answer).toMatch(/05:32/);
  });

  it("leave time for Levi uses walking plan — never a school bus", () => {
    const r = askJarvis("levi", "Wann muss ich los?", MON_MORNING, {
      person: person("levi"),
      data: seedAppData,
    });
    expect(r.intent).toBe("leave_time");
    expect(r.answer).toMatch(/07:35/);
    expect(r.answer.toLowerCase()).toMatch(/losgeh/);
    expect(r.answer.toLowerCase()).not.toMatch(/bus/);
    expect(r.facts.travel?.mode).toBe("walking");
    expect(r.facts.travel?.busDeparture).toBeNull();
  });

  it("AI polish wrapper marks source ai only when text present", () => {
    const base = askJarvis("levi", "Was steht heute an?", MON_MORNING, {
      person: person("levi"),
      data: seedAppData,
    });
    expect(withAiAnswer(base, null).source).toBe("deterministic");
    const polished = withAiAnswer(base, "Guten Morgen Levi. Kurz und klar.");
    expect(polished.source).toBe("ai");
    expect(polished.deterministicAnswer).toBe(base.deterministicAnswer);
    expect(polished.answer).toBe("Guten Morgen Levi. Kurz und klar.");
  });
});
