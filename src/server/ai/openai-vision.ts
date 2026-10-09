import type { PlanAiImage } from "@/server/ai/types";
import { PlanAiError } from "@/server/ai/errors";

export type VisionRequest = {
  apiKey: string;
  model: string;
  system: string;
  text: string;
  images: PlanAiImage[];
  /** Injected for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
};

const ENDPOINT = "https://api.openai.com/v1/chat/completions";
const TIMEOUT_MS = 90_000;

/**
 * One vision call that must return a JSON object. Shared by every plan type
 * and every stage. Images are always sent at `detail: "high"`: dense tables
 * with small print are unreadable at the default (low-resolution) setting.
 * Retries once on 429/5xx; anything else surfaces honestly.
 */
export async function visionJson(req: VisionRequest): Promise<unknown> {
  const doFetch = req.fetchImpl ?? fetch;
  const content: unknown[] = [{ type: "text", text: req.text }];
  req.images.forEach((image, index) => {
    if (req.images.length > 1) content.push({ type: "text", text: `Seite ${index + 1} von ${req.images.length}:` });
    content.push({
      type: "image_url",
      image_url: { url: `data:${image.mimeType};base64,${image.base64}`, detail: "high" },
    });
  });
  const body = JSON.stringify({
    model: req.model,
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content },
    ],
  });

  let lastStatus = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await doFetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${req.apiKey}`, "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });
      if (!response.ok) {
        lastStatus = response.status;
        const detail = (await response.text()).slice(0, 200);
        if ((response.status === 429 || response.status >= 500) && attempt === 0) continue;
        const hint =
          response.status === 404 || /model/i.test(detail)
            ? " (Modell prüfen: OPENAI_PLAN_MODEL)"
            : "";
        throw new PlanAiError("upstream", `OpenAI-Fehler (${response.status})${hint}: ${detail}`, 502);
      }
      const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const text = json.choices?.[0]?.message?.content;
      if (!text) throw new PlanAiError("upstream", "Leere KI-Antwort.", 502);
      try {
        return JSON.parse(text);
      } catch {
        throw new PlanAiError("upstream", "KI-Antwort war kein gültiges JSON.", 502);
      }
    } catch (error) {
      if (error instanceof PlanAiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new PlanAiError("upstream", "Die KI-Analyse hat zu lange gedauert. Bitte erneut versuchen.", 504);
      }
      throw new PlanAiError("upstream", "KI-Dienst nicht erreichbar.", 502);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new PlanAiError("upstream", `OpenAI-Fehler (${lastStatus}).`, 502);
}
