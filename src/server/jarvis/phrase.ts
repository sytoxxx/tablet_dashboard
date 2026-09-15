import type { JarvisFacts, JarvisResponse } from "@/lib/jarvis/types";

/**
 * Optional OpenAI polish — receives ONLY structured JarvisFacts.
 * Must not invent bus/weather/calendar fields.
 * Falls back to deterministicAnswer on any error / missing key.
 */
export async function phraseJarvisWithOpenAi(input: {
  apiKey: string;
  model?: string;
  question: string;
  deterministicAnswer: string;
  facts: JarvisFacts;
}): Promise<string | null> {
  const model = input.model || process.env.OPENAI_JARVIS_MODEL || "gpt-4o-mini";

  const system = [
    "Du bist Jarvis, ein kurzer persönlicher Morgenassistent auf Deutsch.",
    "Formuliere die Antwort natürlich und knapp (max. 3 kurze Sätze).",
    "Du darfst NUR die mitgelieferten Fakten verwenden.",
    "Erfinde keine Buszeiten, Verspätungen, Wetterwerte, Termine oder Aufgaben.",
    "Wenn eine Information fehlt oder der deterministische Text das sagt, bleib dabei.",
    "Testdaten niemals als Live-Daten bezeichnen.",
    "Kein Markdown, keine Aufzählungszeichen, keine Emojis außer wenn in den Fakten.",
  ].join(" ");

  const body = {
    model,
    temperature: 0.3,
    max_tokens: 220,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify({
          question: input.question,
          deterministicAnswer: input.deterministicAnswer,
          facts: input.facts,
          instruction:
            "Schreibe eine gesprochene Antwort. Bleib inhaltlich bei deterministicAnswer und facts.",
        }),
      },
    ],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    // Guard: reject empty or absurdly long inventiveness
    if (content.length < 3 || content.length > 600) return null;
    return content.replace(/^["“]|["”]$/g, "").trim();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function withAiAnswer(
  base: JarvisResponse,
  aiText: string | null,
): JarvisResponse {
  if (!aiText) return base;
  return {
    ...base,
    answer: aiText,
    source: "ai",
  };
}
