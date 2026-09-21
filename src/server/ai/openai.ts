import type { PlanAiInput, PlanAiProvider } from "@/server/ai/types";
import type { PlanAnalysisResult } from "@/lib/plan-analysis/types";
import { validatePlanAnalysis } from "@/lib/plan-analysis/validate";
import { toIsoDate } from "@/lib/day/tomorrow";

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
    if (input.images.length === 0) throw new Error("Kein Bild zur Analyse übergeben.");
    const refIso = toIsoDate(input.referenceDate);
    const schemaHint =
      input.planType === "school"
        ? `Return JSON: { "mode":"school", "source":"ai", "confidence":0-1, "warnings":string[], "uncertainties":[{path,reason}], "draft":{ "type":"school", "week":{ "mon"?:{ "lessons":[{id,time,subject,room,bringItems?,uncertain?}] }, ... } } }`
        : `Return JSON: { "mode":"work", "source":"ai", "confidence":0-1, "warnings":string[], "uncertainties":[{path,reason}], "legend":{"<code>":"<meaning>"}?, "draft":{ "type":"work", "entries":[ { "day":1-31, "month":1-12, "year"?:number, "weekday"?:"mon".."sun", "code"?:string, label, start, end, location, status, notes?, bringItems?, uncertain? }, ... ] } }. Read the plan's OWN printed calendar dates (day-of-month + month, and year if shown, e.g. from a header like "September 2026") for every row — this may span several weeks or a whole month across multiple pages; extract every row you can see on every page, not just one week. Only omit "year" when the plan genuinely does not show one anywhere (it will be inferred from context) — never invent a day or month that isn't legible. Set "weekday" to the weekday the PLAN itself prints next to that date, if any (used only to cross-check, not authoritative). "status" is one of "work","free","vacation","sick","other". For "free"/"vacation"/"sick"/"other" days, set start/end/location to empty strings — never invent a time for a day off. Recognize explicit German labels: "FREI"/"frei" → free, "URLAUB" → vacation, "KRANKENSTAND"/"KRANK" → sick. If the document shows a legend/key mapping short codes to meanings (e.g. "F = Frei", "FD = Frühdienst"), return it verbatim in the top-level "legend" object and set "code" on every row that used one of those codes instead of writing out the meaning yourself — do not translate a code from general knowledge; only the plan's OWN legend is authoritative. If a row uses a code that is NOT explained anywhere in the document, still set "code" to that raw text, leave "label"/"status" empty/omitted, and add an uncertainty note — never guess what an unexplained code means. Only include a row when the plan actually shows something for that date (a shift, a code, OR an explicit day-off marker) — omit dates that are simply blank or not part of the plan. Times: always write "HH:MM" (24h) when you can read minutes; if only an hour is legible, still write your best "HH:MM" but set that row's "uncertain":true and add an uncertainty note quoting the raw text you saw.`;

    const body = {
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract weekly school or dated work schedules from images — possibly several pages/photos of the SAME document. Only include what is clearly visible or legible. Mark unclear fields with uncertain:true and list them in uncertainties. Never invent subjects, rooms, times, locations, dates, or the meaning of a duty code. A work-plan roster is usually dated (real day/month, sometimes several weeks or a full month on one document, sometimes spanning a month change) — extract the real calendar date for every row, not an abstract weekday pattern. For work plans, always classify each included day's status (work/free/vacation/sick/other) — an explicit day-off marker (FREI/URLAUB/KRANKENSTAND) is real information, not noise; capture it instead of omitting the day or inventing shift times for it. If a page is too blurry, dark, or low-resolution to read reliably, say so explicitly in warnings instead of guessing its content. If unreadable, omit the entry and add a warning. Never output HTML. Weekday keys: mon,tue,wed,thu,fri,sat,sun. German labels OK. Do not replace existing schedules — you only return a draft.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Person: ${input.personName} (${input.personId}). Plan type: ${input.planType}. Today's date (for context only, if the plan's year is unclear): ${refIso}. ${input.images.length > 1 ? `The following ${input.images.length} images are consecutive pages/photos of the SAME roster — read them together as one document.` : ""} ${schemaHint}`,
            },
            ...input.images.map((image, index) => [
              ...(input.images.length > 1
                ? [{ type: "text" as const, text: `Seite ${index + 1} von ${input.images.length}:` }]
                : []),
              {
                type: "image_url" as const,
                image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
              },
            ]).flat(),
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

    const validated = validatePlanAnalysis(parsed, input.planType, input.referenceDate);
    if (!validated.ok) throw new Error(validated.error);
    return validated.result;
  }
}
