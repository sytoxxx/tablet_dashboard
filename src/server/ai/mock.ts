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

function mockWork(_personId: string): unknown {
  void _personId;
  return {
    mode: "work",
    source: "mock",
    confidence: 0.74,
    warnings: [
      "Mock-Analyse: kein API-Key — Beispiel-Schichtplan. Bitte vor dem Speichern prüfen.",
    ],
    uncertainties: [
      {
        path: "week.wed.location",
        reason: "Stationsnummer unsicher",
      },
    ],
    draft: {
      type: "work",
      week: {
        mon: {
          label: "Frühschicht Pflege",
          start: "06:30",
          end: "14:30",
          location: "Station 3",
          notes: "Übergabe 14:15",
          bringItems: ["Dienstausweis"],
        },
        tue: {
          label: "Frühschicht Pflege",
          start: "06:30",
          end: "14:30",
          location: "Station 3",
          bringItems: ["Dienstausweis", "Brotzeit"],
        },
        wed: {
          label: "Spätschicht Pflege",
          start: "13:30",
          end: "21:30",
          location: "?",
          uncertain: true,
          notes: "Parkplatz B",
          bringItems: ["Dienstausweis"],
        },
        thu: {
          label: "Frühschicht Pflege",
          start: "06:30",
          end: "14:30",
          location: "Station 2",
        },
        fri: {
          label: "Frühschicht Pflege",
          start: "06:30",
          end: "14:30",
          location: "Station 3",
        },
      },
    },
  };
}

export class MockPlanAi implements PlanAiProvider {
  readonly name = "mock" as const;

  async analyze(input: PlanAiInput): Promise<PlanAnalysisResult> {
    // Image presence is required by the API; mock ignores pixels but keeps the contract.
    void input.imageBase64;
    void input.mimeType;

    const payload =
      input.planType === "school"
        ? mockSchool(input.personId)
        : mockWork(input.personId);

    const validated = validatePlanAnalysis(payload, input.planType);
    if (!validated.ok) {
      throw new Error(validated.error);
    }
    return validated.result;
  }
}
