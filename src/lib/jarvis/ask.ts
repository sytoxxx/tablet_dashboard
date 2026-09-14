import type { AppData, PersonId, PersonProfile } from "@/lib/types";
import {
  getMorningOverview,
  type GetMorningOverviewOptions,
  type MorningOverviewLive,
} from "@/lib/morning/overview";
import type { MorningOverview } from "@/lib/morning/types";
import { classifyJarvisIntent } from "@/lib/jarvis/intents";
import {
  buildDeterministicAnswer,
  factsFromOverview,
} from "@/lib/jarvis/answers";
import type { JarvisAskInput, JarvisResponse } from "@/lib/jarvis/types";

export type AskJarvisOptions = {
  data?: AppData;
  person?: PersonProfile;
  /** Precomputed overview (tests / server reuse). */
  overview?: MorningOverview;
  live?: MorningOverviewLive;
  dayView?: GetMorningOverviewOptions["dayView"];
};

/**
 * Personal morning assistant — truth comes only from getMorningOverview.
 * No own bus/weather/day logic. Voice-ready: pass STT text as `question`.
 */
export function askJarvis(
  personId: PersonId,
  question: string,
  now: Date = new Date(),
  options?: AskJarvisOptions,
): JarvisResponse {
  const input: JarvisAskInput = { personId, question, now };
  const intent = classifyJarvisIntent(input.question);

  const overview =
    options?.overview ??
    getMorningOverview(personId, now, {
      data: options?.data,
      person: options?.person,
      live: options?.live,
      dayView: options?.dayView,
    });

  if (overview.personId !== personId) {
    throw new Error("Jarvis: Personen-Mismatch — keine Vermischung erlaubt.");
  }

  const facts = factsFromOverview(overview);
  const deterministicAnswer = buildDeterministicAnswer(intent, facts);

  return {
    personId,
    question: question.trim(),
    intent,
    answer: deterministicAnswer,
    deterministicAnswer,
    source: "deterministic",
    facts,
    answeredAt: new Date().toISOString(),
  };
}
