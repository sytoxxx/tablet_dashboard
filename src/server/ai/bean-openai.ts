import type {
  BeanScanAiInput,
  BeanScanAiProvider,
  BeanScanResult,
} from "@/lib/coffee/scan";
import { validateBeanScanResult } from "@/lib/coffee/scan";

/**
 * OpenAI vision bean-label extractor. Requires OPENAI_API_KEY (server-only).
 * Instructed to leave unsure fields empty — never invent roaster/origin/roast.
 */
export class OpenAiBeanScanAi implements BeanScanAiProvider {
  readonly name = "openai" as const;

  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENAI_PLAN_MODEL || "gpt-4o-mini",
  ) {}

  async analyze(input: BeanScanAiInput): Promise<BeanScanResult> {
    const body = {
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract coffee bean bag label fields from photos. Only include text that is clearly legible. If unsure, leave value empty and recognized:false (UI shows Nicht erkannt). Never invent name, roaster, origin, roast, or notes. German labels OK. Return JSON only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Return JSON: { "source":"ai", "confidence":0-1, "warnings":string[], "draft":{ "name":{"value":string,"recognized":boolean}, "roaster":{"value":string,"recognized":boolean}, "origin":{"value":string,"recognized":boolean}, "roast":{"value":string,"recognized":boolean}, "notes":{"value":string,"recognized":boolean} } }`,
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

    const validated = validateBeanScanResult(parsed);
    if (!validated.ok) throw new Error(validated.error);
    return validated.result;
  }
}
