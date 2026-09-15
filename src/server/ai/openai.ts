import type { PlanAiInput, PlanAiProvider } from "@/server/ai/types";
import type { PlanAnalysisResult } from "@/lib/plan-analysis/types";
import { validatePlanAnalysis } from "@/lib/plan-analysis/validate";

/**
 * OpenAI Vision-ready provider. Requires OPENAI_API_KEY.
 * Returns structured JSON matching PlanAnalysisResult (pre-validation).
 */
export class OpenAiPlanAi implements PlanAiProvider {
  readonly name = "openai" as const;

  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENAI_PLAN_MODEL || "gpt-4o-mini",
  ) {}

  async analyze(input: PlanAiInput): Promise<PlanAnalysisResult> {
    const schemaHint =
      input.planType === "school"
        ? `Return JSON: { "mode":"school", "source":"ai", "confidence":0-1, "warnings":string[], "uncertainties":[{path,reason}], "draft":{ "type":"school", "week":{ "mon"?:{ "lessons":[{id,time,subject,room,bringItems?,uncertain?}] }, ... } } }`
        : `Return JSON: { "mode":"work", "source":"ai", "confidence":0-1, "warnings":string[], "uncertainties":[{path,reason}], "draft":{ "type":"work", "week":{ "mon"?:{ label,start,end,location,notes?,bringItems?,uncertain? }, ... } } }`;

    const body = {
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract weekly school or work schedules from images. Only include what is clearly visible or legible. Mark unclear fields with uncertain:true and list them in uncertainties. Never invent subjects, rooms, times, locations, or days. If unreadable, omit the entry and add a warning. Never output HTML. Times must be HH:MM. Weekday keys: mon,tue,wed,thu,fri,sat,sun. German labels OK. Do not replace existing schedules — you only return a draft.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Person: ${input.personName} (${input.personId}). Plan type: ${input.planType}. ${schemaHint}`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${input.mimeType};base64,${input.imageBase64}`,
              },
            },
          ],
        },
      ],
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI-Fehler (${response.status}): ${text.slice(0, 200)}`);
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Leere KI-Antwort.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("KI-Antwort war kein gültiges JSON.");
    }

    if (parsed && typeof parsed === "object") {
      (parsed as { source?: string }).source = "ai";
    }

    const validated = validatePlanAnalysis(parsed, input.planType);
    if (!validated.ok) throw new Error(validated.error);
    return validated.result;
  }
}
