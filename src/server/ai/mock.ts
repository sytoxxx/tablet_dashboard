import type { PlanAiInput, PlanAiProvider } from "@/server/ai/types";
import type { PlanAnalysisResult } from "@/lib/plan-analysis/types";
import { validatePlanAnalysis } from "@/lib/plan-analysis/validate";

function mockSchool(personId: string): unknown {
  return {
    mode: "school",
    source: "mock",
    confidence: 0.78,
    warnings: [
      "Mock-Analyse: kein API-Key — Beispielstundenplan. Bitte vor dem Speichern prüfen.",
    ],
    uncertainties: [
      {
        path: "week.tue.lessons.1.room",
        reason: "Raum auf dem Bild schlecht lesbar",
      },
    ],
    draft: {
      type: "school",
      week: {
        mon: {
          lessons: [
            {
              id: `${personId}-m1`,
              time: "08:15",
              subject: "Mathematik",
              room: "B204",
              bringItems: ["Taschenrechner"],
            },
            {
              id: `${personId}-m2`,
              time: "09:05",
              subject: "Englisch",
              room: "A112",
            },
            {
              id: `${personId}-m3`,
              time: "10:10",
              subject: "Informatik",
              room: "C301",
              bringItems: ["Laptop"],
            },
          ],
        },
        tue: {
          lessons: [
            {
              id: `${personId}-t1`,
              time: "08:15",
              subject: "Deutsch",
              room: "A101",
            },
            {
              id: `${personId}-t2`,
              time: "09:50",
              subject: "Physik",
              room: "?",
              uncertain: true,
            },
            {
              id: `${personId}-t3`,
              time: "11:00",
              subject: "Geschichte",
              room: "A203",
            },
          ],
        },
        wed: {
          lessons: [
            {
              id: `${personId}-w1`,
              time: "08:15",
              subject: "Biologie",
              room: "C110",
            },
            {
              id: `${personId}-w2`,
              time: "10:10",
              subject: "Sport",
              room: "Halle",
              bringItems: ["Sportzeug"],
            },
          ],
        },
      },
    },
  };
}

const FRUEH = { label: "Frühschicht Pflege", start: "06:30", end: "14:30" };
const SPAET = { label: "Spätschicht Pflege", start: "13:30", end: "21:30" };

/** Monday of the calendar week containing `date`. */
function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Two real, dated weeks — deliberately spans two calendar weeks with mixed
 * Arbeit/Frei/Urlaub/Krankenstand and different shift times, so the demo
 * (no OPENAI_API_KEY) exercises exactly what a real monthly roster needs.
 */
function mockWork(_personId: string, referenceDate: Date): unknown {
  void _personId;
  const week1 = mondayOf(referenceDate);
  const week2 = addDays(week1, 7);

  const row = (
    date: Date,
    fields: { label: string; start?: string; end?: string; status: string },
    extra?: Record<string, unknown>,
  ) => ({
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    label: fields.label,
    start: fields.start ?? "",
    end: fields.end ?? "",
    location: fields.status === "work" ? "Station 3" : "",
    status: fields.status,
    ...extra,
  });

  return {
    mode: "work",
    source: "mock",
    confidence: 0.74,
    warnings: [
      "Mock-Analyse: kein API-Key — Beispiel-Schichtplan über zwei Wochen. Bitte vor dem Speichern prüfen.",
    ],
    uncertainties: [
      {
        path: "entries.2.location",
        reason: "Stationsnummer unsicher",
      },
    ],
    legend: { FD: "Frühschicht Pflege", SD: "Spätschicht Pflege", F: "Frei", U: "Urlaub", K: "Krankenstand" },
    draft: {
      type: "work",
      entries: [
        row(week1, { ...FRUEH, status: "work" }, {
          notes: "Übergabe 14:15",
          bringItems: ["Dienstausweis"],
        }),
        row(addDays(week1, 1), { label: "Frei", status: "free" }),
        row(addDays(week1, 2), { ...SPAET, status: "work" }, {
          location: "?",
          uncertain: true,
          notes: "Parkplatz B",
          bringItems: ["Dienstausweis"],
        }),
        row(addDays(week1, 3), { ...FRUEH, status: "work" }, { location: "Station 2" }),
        row(addDays(week1, 4), { label: "Urlaub", status: "vacation" }),
        row(week2, { ...FRUEH, status: "work" }),
        row(addDays(week2, 1), { ...FRUEH, status: "work" }),
        row(addDays(week2, 2), { label: "Krankenstand", status: "sick" }),
        row(addDays(week2, 3), { ...SPAET, status: "work" }),
        row(addDays(week2, 4), { ...FRUEH, status: "work" }),
      ],
    },
  };
}

export class MockPlanAi implements PlanAiProvider {
  readonly name = "mock" as const;

  async analyze(input: PlanAiInput): Promise<PlanAnalysisResult> {
    // Image presence is required by the API; mock ignores pixels but keeps the contract.
    void input.images;

    const payload =
      input.planType === "school"
        ? mockSchool(input.personId)
        : mockWork(input.personId, input.referenceDate);

    const validated = validatePlanAnalysis(payload, input.planType, input.referenceDate);
    if (!validated.ok) {
      throw new Error(validated.error);
    }
    return validated.result;
  }
}
