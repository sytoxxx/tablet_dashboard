import { describe, expect, it } from "vitest";
import {
  buildAnalysisFromText,
  isUnclearEntry,
  parseWorkPlanText,
  summarizeDays,
  type KnownPerson,
} from "@/lib/plan-analysis/text-import";

const PERSONS: KnownPerson[] = [
  { id: "levi", name: "Levi" },
  { id: "birgit", name: "Birgit" },
  { id: "heidi", name: "Heidi" },
];

const parse = (text: string, extra: { assumeYear?: number; assumeMonth?: number } = {}) =>
  parseWorkPlanText(text, { persons: PERSONS, ...extra });

describe("text import — the example from the brief", () => {
  const text = `Person: Heidi
Monat: Oktober 2026

01.10.2026 | 06:00-12:00
02.10.2026 | Frei
03.10.2026 | 06:00-12:00
04.10.2026 | Urlaub
05.10.2026 | 07:00-14:00`;

  it("reads person, month and every line", () => {
    const o = parse(text);
    expect(o.personId).toBe("heidi");
    expect(o.declared).toEqual({ month: 10, year: 2026 });
    expect(o.issues).toEqual([]);
    expect(o.entries.map((e) => [e.date, e.status, e.start, e.end])).toEqual([
      ["2026-10-01", "work", "06:00", "12:00"],
      ["2026-10-02", "free", "", ""],
      ["2026-10-03", "work", "06:00", "12:00"],
      ["2026-10-04", "vacation", "", ""],
      ["2026-10-05", "work", "07:00", "14:00"],
    ]);
  });

  it("tells the user which days of the month are missing instead of staying silent", () => {
    const o = parse(text);
    expect(o.missingDays).toHaveLength(26);
    const result = buildAnalysisFromText(o);
    expect(result.warnings[0]).toContain("Es fehlen 26 Tage");
    expect(result.warnings[0]).toContain("6.–31.");
  });

  it("produces the same PlanAnalysisResult shape as the photo analysis", () => {
    const r = buildAnalysisFromText(parse(text));
    expect(r.mode).toBe("work");
    expect(r.source).toBe("text");
    expect(r.draft.type).toBe("work");
    expect(r.period).toEqual({ month: 10, year: 2026, monthCertain: true, yearCertain: true });
    expect(r.uncertainties).toEqual([]);
  });
});

describe("text import — date formats", () => {
  const head = "Person: Birgit\nMonat: Oktober 2026\n";
  it.each([
    ["01.10.2026 | 06:00-12:00", "2026-10-01"],
    ["1.10.2026 | 06:00-12:00", "2026-10-01"],
    ["01.10.26 | 06:00-12:00", "2026-10-01"],
    ["2026-10-01 | 06:00-12:00", "2026-10-01"],
    ["1. Oktober 2026 | 06:00-12:00", "2026-10-01"],
    ["01. Okt 2026 | 06:00-12:00", "2026-10-01"],
    ["Do 01.10.2026 | 06:00-12:00", "2026-10-01"],
    ["Donnerstag, 01.10.2026: 06:00-12:00", "2026-10-01"],
    ["01.10. | 06:00-12:00", "2026-10-01"],
    ["1 | 06:00-12:00", "2026-10-01"],
    ["- 01.10.2026 | 06:00-12:00", "2026-10-01"],
    ["| 01.10.2026 | 06:00-12:00 | Arbeit |", "2026-10-01"],
  ])("%s", (line, iso) => {
    const o = parse(head + line);
    expect(o.issues).toEqual([]);
    expect(o.entries).toHaveLength(1);
    expect(o.entries[0]!.date).toBe(iso);
    expect(o.entries[0]!.start).toBe("06:00");
    expect(o.entries[0]!.end).toBe("12:00");
  });

  it("rejects an impossible date and shows the line", () => {
    const o = parse(head + "31.09.2026 | 06:00-12:00");
    expect(o.entries).toHaveLength(0);
    expect(o.issues).toHaveLength(1);
    expect(o.issues[0]).toMatchObject({ line: 3, text: "31.09.2026 | 06:00-12:00" });
    expect(o.issues[0]!.reason).toContain("gibt es nicht");
  });

  it("asks for the year when dates have none and the header gives none", () => {
    const o = parse("Person: Heidi\n01.10. | 06:00-12:00\n02.10. | Frei");
    expect(o.needsYear).toBe(true);
    expect(o.entries).toHaveLength(0);
    const again = parse("Person: Heidi\n01.10. | 06:00-12:00\n02.10. | Frei", { assumeYear: 2026 });
    expect(again.needsYear).toBe(false);
    expect(again.entries.map((e) => e.date)).toEqual(["2026-10-01", "2026-10-02"]);
    const r = buildAnalysisFromText(again);
    expect(r.period?.yearCertain).toBe(false); // the user chose it — the UI keeps asking to confirm
  });

  it("asks for the month when only day numbers are given and no month is declared", () => {
    const o = parse("Person: Heidi\nJahr: 2026\n1 | 06:00-12:00");
    expect(o.needsMonth).toBe(true);
    const again = parse("Person: Heidi\nJahr: 2026\n1 | 06:00-12:00", { assumeMonth: 10 });
    expect(again.entries[0]!.date).toBe("2026-10-01");
  });

  it("lets a December roster list January without a year", () => {
    const o = parse("Monat: Dezember 2026\n30.12. | 06:00-12:00\n01.01. | Frei");
    expect(o.entries.map((e) => e.date)).toEqual(["2026-12-30", "2027-01-01"]);
  });
});

describe("text import — time formats", () => {
  const head = "Person: Heidi\nMonat: Oktober 2026\n";
  it.each([
    ["06:00-12:00", "06:00", "12:00", true],
    ["06:00 – 12:00", "06:00", "12:00", true],
    ["6:00-12:00", "06:00", "12:00", true],
    ["6-12 Uhr", "06:00", "12:00", true],
    ["06.00 bis 12.00", "06:00", "12:00", true],
    ["06:00 bis 12:00 Uhr", "06:00", "12:00", true],
    ["0600-1200", "06:00", "12:00", true],
    ["07:30-15:45", "07:30", "15:45", true],
    ["6-12", "06:00", "12:00", false],
  ])("%s", (time, start, end, confident) => {
    const o = parse(`${head}01.10.2026 | ${time}`);
    expect(o.issues).toEqual([]);
    const e = o.entries[0]!;
    expect([e.start, e.end]).toEqual([start, end]);
    expect(Boolean(e.uncertain)).toBe(!confident);
  });

  it("keeps label and location from the extra columns", () => {
    const e = parse(`${head}01.10.2026 | 06:00-12:00 | Frühdienst | Station 2`).entries[0]!;
    expect(e.label).toBe("Frühdienst");
    expect(e.location).toBe("Station 2");
    expect(e.status).toBe("work");
  });

  it("defaults the label to Arbeit — never an invented time", () => {
    const e = parse(`${head}01.10.2026 | 06:00-12:00 | Arbeit`).entries[0]!;
    expect(e.label).toBe("Arbeit");
  });

  it("rejects two time ranges in one line (split shift) with the line shown", () => {
    const o = parse(`${head}01.10.2026 | 06:00-10:00, 14:00-18:00`);
    expect(o.entries).toHaveLength(0);
    expect(o.issues[0]!.reason).toContain("Mehrere Zeiträume");
  });

  it("rejects start == end", () => {
    const o = parse(`${head}01.10.2026 | 06:00-06:00`);
    expect(o.issues).toHaveLength(1);
  });

  it("does not turn a time into a date", () => {
    const o = parse(`${head}06:00-12:00`);
    expect(o.entries).toHaveLength(0);
    expect(o.issues).toHaveLength(1);
    expect(o.issues[0]!.reason).toContain("kein Datum");
  });
});

describe("text import — statuses", () => {
  const head = "Person: Heidi\nMonat: Oktober 2026\n";
  it.each([
    ["Frei", "free", "Frei"],
    ["frei", "free", "Frei"],
    ["Dienstfrei", "free", "Frei"],
    ["Urlaub", "vacation", "Urlaub"],
    ["Urlaubstag", "vacation", "Urlaub"],
    ["Krankenstand", "sick", "Krankenstand"],
    ["Krank", "sick", "Krankenstand"],
  ])("%s", (word, status, label) => {
    const e = parse(`${head}01.10.2026 | ${word}`).entries[0]!;
    expect(e.status).toBe(status);
    expect(e.label).toBe(label);
    expect(e.start).toBe("");
    expect(e.end).toBe("");
    expect(e.uncertain).toBeFalsy();
  });

  it("keeps a remark next to the status as a note", () => {
    const e = parse(`${head}01.10.2026 | Urlaub (genehmigt)`).entries[0]!;
    expect(e.status).toBe("vacation");
    expect(e.notes).toBe("genehmigt");
  });

  it("refuses a status combined with a time", () => {
    const o = parse(`${head}01.10.2026 | Urlaub 06:00-12:00`);
    expect(o.entries).toHaveLength(0);
    expect(o.issues).toHaveLength(1);
  });

  it("marks Unklar as an entry the user must resolve", () => {
    const o = parse(`${head}15.10.2026 | Unklar`);
    const e = o.entries[0]!;
    expect(isUnclearEntry(e)).toBe(true);
    expect(e.uncertain).toBe(true);
    const r = buildAnalysisFromText(o);
    expect(r.uncertainties.some((u) => u.reason.includes("Unklar"))).toBe(true);
  });

  it("night shifts: with times they are work that ends the next day", () => {
    const e = parse(`${head}01.10.2026 | 22:00-06:00 | Nachtdienst`).entries[0]!;
    expect(e.status).toBe("work");
    expect(e.label).toBe("Nachtdienst");
    expect([e.start, e.end]).toEqual(["22:00", "06:00"]);
    expect(e.notes).toContain("Folgetag");
    expect(e.uncertain).toBeFalsy();
  });

  it("an overnight range without the word Nachtdienst must be confirmed", () => {
    const o = parse(`${head}01.10.2026 | 22:00-06:00`);
    expect(o.entries[0]!.uncertain).toBe(true);
    expect(buildAnalysisFromText(o).uncertainties.some((u) => u.reason.includes("Nachtdienst?"))).toBe(true);
  });

  it("a night shift without times is not guessed — times stay empty and flagged", () => {
    const e = parse(`${head}01.10.2026 | Nachtdienst`).entries[0]!;
    expect(e.status).toBe("work");
    expect(e.start).toBe("");
    expect(e.timeUnclear).toBe(true);
    expect(e.uncertain).toBe(true);
  });

  it("an unknown short code becomes a question, not a shift", () => {
    const o = parse(`${head}01.10.2026 | FD\n02.10.2026 | FD`);
    expect(o.entries.every((e) => e.unresolvedCode && e.status === "other")).toBe(true);
    expect(buildAnalysisFromText(o).unknownCodes).toEqual(["FD"]);
  });

  it("unknown free text is reported with its line", () => {
    const o = parse(`${head}01.10.2026 | irgendwas komisches hier`);
    expect(o.entries).toHaveLength(0);
    expect(o.issues[0]).toMatchObject({ line: 3 });
  });

  it("a date without anything after it is reported", () => {
    const o = parse(`${head}01.10.2026 |`);
    expect(o.issues).toHaveLength(1);
    expect(o.issues[0]!.reason).toContain("fehlt die Angabe");
  });
});

describe("text import — header, person and period", () => {
  it("finds the person in different spellings", () => {
    expect(parse("Name: Birgit\n01.10.2026 | Frei").personId).toBe("birgit");
    expect(parse("Mitarbeiterin: heidi\n01.10.2026 | Frei").personId).toBe("heidi");
    expect(parse("Person: Heidi | Monat: Oktober 2026\n01.10.2026 | Frei").personId).toBe("heidi");
  });

  it("reports an unknown person instead of guessing", () => {
    const o = parse("Person: Susanne\n01.10.2026 | Frei");
    expect(o.personId).toBeNull();
    expect(o.personProblem).toBe("unknown");
  });

  it("returns no person when the text names nobody", () => {
    const o = parse("01.10.2026 | Frei");
    expect(o.personText).toBeNull();
    expect(o.personId).toBeNull();
    expect(o.personProblem).toBeNull();
  });

  it.each([
    ["Monat: Oktober 2026", 10, 2026],
    ["Monat: 10/2026", 10, 2026],
    ["Monat: 10.2026", 10, 2026],
    ["Monat: Okt. 2026", 10, 2026],
    ["Dienstplan Oktober 2026", 10, 2026],
    ["Oktober 2026", 10, 2026],
    ["Monat: März 2027", 3, 2027],
  ])("%s", (headerLine, month, year) => {
    const o = parse(`${headerLine}\n01.${String(month).padStart(2, "0")}.${year} | Frei`);
    expect(o.declared).toEqual({ month, year });
    expect(o.issues).toEqual([]);
  });

  it("rejects an unreadable month header", () => {
    const o = parse("Monat: Blubber\n01.10.2026 | Frei");
    expect(o.issues[0]!.reason).toContain("kein Monat");
  });

  it("flags entries outside the declared month (wrong month)", () => {
    const o = parse("Person: Heidi\nMonat: Oktober 2026\n30.09.2026 | Frei\n01.10.2026 | Frei");
    const r = buildAnalysisFromText(o);
    const wrong = r.draft.type === "work" ? r.draft.entries.find((e) => e.date === "2026-09-30")! : null;
    expect(wrong!.uncertain).toBe(true);
    expect(r.uncertainties.some((u) => u.reason.includes("außerhalb"))).toBe(true);
  });
});

describe("text import — nothing is dropped silently", () => {
  it("accounts for every non-empty line", () => {
    const text = [
      "Hier ist deine Liste:",
      "Person: Heidi",
      "Monat: Oktober 2026",
      "",
      "| Datum | Zeit | Dienst |",
      "|---|---|---|",
      "01.10.2026 | 06:00-12:00",
      "02.10.2026 | ???",
      "kaputt 12 zeile",
      "03.10.2026 | Frei",
    ].join("\n");
    const o = parse(text);
    expect(o.entries.map((e) => e.date)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    // prose without digits → note, a digit line without a date → blocking issue
    expect(o.notes.map((n) => n.text)).toEqual(["Hier ist deine Liste:"]);
    expect(o.issues.map((i) => i.line)).toEqual([9]);
    const lineOf = (entryDate: string) => o.entries.find((e) => e.date === entryDate)!;
    expect(lineOf("2026-10-02").label).toBe("Unklar");
  });

  it("handles markdown tables, bold markers, bullets and Windows line breaks", () => {
    const text = "**Person:** Heidi\r\n**Monat:** Oktober 2026\r\n\r\n- 01.10.2026 | 06:00-12:00\r\n* 02.10.2026 | **Frei**\r\n";
    const o = parse(text);
    expect(o.issues).toEqual([]);
    expect(o.personId).toBe("heidi");
    expect(o.entries).toHaveLength(2);
  });

  it("removes an exact duplicate but says so", () => {
    const o = parse("Monat: Oktober 2026\n01.10.2026 | 06:00-12:00\n01.10.2026 | 06:00-12:00");
    expect(o.entries).toHaveLength(1);
    expect(o.notes.some((n) => n.text.includes("Doppelte Zeile"))).toBe(true);
  });

  it("keeps two different entries for one date and flags both for the user", () => {
    const o = parse("Monat: Oktober 2026\n01.10.2026 | 06:00-12:00\n01.10.2026 | Frei");
    expect(o.entries).toHaveLength(2);
    const r = buildAnalysisFromText(o);
    expect(r.draft.type === "work" && r.draft.entries.every((e) => e.uncertain)).toBe(true);
    expect(r.uncertainties.some((u) => u.reason.includes("doppelt"))).toBe(true);
  });

  it("flags a weekday that does not match the date", () => {
    const o = parse("Monat: Oktober 2026\nMo 01.10.2026 | 06:00-12:00"); // 1.10.2026 is a Thursday
    expect(o.entries[0]!.uncertain).toBe(true);
    expect(buildAnalysisFromText(o).uncertainties.some((u) => u.reason.includes("Wochentag"))).toBe(true);
    const ok = parse("Monat: Oktober 2026\nDo 01.10.2026 | 06:00-12:00");
    expect(ok.entries[0]!.uncertain).toBeFalsy();
  });
});

describe("text import — a complete month", () => {
  it("reads 31 days with every kind of entry and finds nothing missing", () => {
    const lines = ["Person: Heidi", "Monat: Oktober 2026", ""];
    for (let d = 1; d <= 31; d++) {
      const dd = String(d).padStart(2, "0");
      const kind = d % 7;
      const text =
        kind === 0 ? "Frei" : kind === 1 ? "06:00-12:00 | Arbeit" : kind === 2 ? "Urlaub" : kind === 3 ? "07:00-14:00" : kind === 4 ? "22:00-06:00 | Nachtdienst" : kind === 5 ? "Krankenstand" : "6-14 Uhr";
      lines.push(`${dd}.10.2026 | ${text}`);
    }
    const o = parse(lines.join("\n"));
    expect(o.issues).toEqual([]);
    expect(o.entries).toHaveLength(31);
    expect(o.missingDays).toEqual([]);
    const r = buildAnalysisFromText(o);
    expect(r.warnings).toEqual([]);
    expect(r.uncertainties).toEqual([]);
  });
});

describe("summarizeDays", () => {
  it("compresses ranges", () => {
    expect(summarizeDays(["2026-10-03", "2026-10-17", "2026-10-18", "2026-10-19", "2026-10-30"])).toBe("3., 17.–19., 30.");
  });
});
