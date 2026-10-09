import type { PlanAiInput, PlanAiProvider } from "@/server/ai/types";
import type { PlanAnalysisResult } from "@/lib/plan-analysis/types";
import { validatePlanAnalysis } from "@/lib/plan-analysis/validate";
import { toIsoDate } from "@/lib/day/tomorrow";
import { PlanAiError, needsRowChoiceError } from "@/server/ai/errors";
import { visionJson } from "@/server/ai/openai-vision";
import {
  assertUsable,
  decideTargetRow,
  EXTRACT_SCHOOL_SYSTEM,
  EXTRACT_WORK_SYSTEM,
  extractSchoolPrompt,
  extractWorkPrompt,
  normalizeLabel,
  parseUnderstanding,
  understandPrompt,
  UNDERSTAND_SYSTEM,
} from "@/server/ai/plan-understanding";

/** Default model: dense table photos need a strong vision model; override with OPENAI_PLAN_MODEL. */
export const DEFAULT_PLAN_MODEL = "gpt-4o";

/**
 * OpenAI Vision provider, two stages per analysis:
 *  1. UNDERSTAND — judge photo quality, document kind, month/year, date
 *     headers, person rows, legend. Unusable photo / wrong document /
 *     unclear row => a question to the user, no extraction.
 *  2. EXTRACT — read only the chosen row (or the school grid), quoting the
 *     header and cell text for every value, then run the deterministic
 *     validation (dates, weekdays, evidence, plausibility, legend codes).
 * Requires OPENAI_API_KEY. Returns structured data matching PlanAnalysisResult.
 */
export class OpenAiPlanAi implements PlanAiProvider {
  readonly name = "openai" as const;

  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENAI_PLAN_MODEL || DEFAULT_PLAN_MODEL,
    private readonly fetchImpl?: typeof fetch,
  ) {}

  async analyze(input: PlanAiInput): Promise<PlanAnalysisResult> {
    if (input.images.length === 0) throw new Error("Kein Bild zur Analyse übergeben.");
    const referenceIso = toIsoDate(input.referenceDate);
    const call = (system: string, text: string) =>
      visionJson({
        apiKey: this.apiKey,
        model: this.model,
        system,
        text,
        images: input.images,
        fetchImpl: this.fetchImpl,
      });

    // Stage 1 — understand the document before reading anything out of it.
    const understanding = parseUnderstanding(
      await call(
        UNDERSTAND_SYSTEM,
        understandPrompt(input.planType, {
          personName: input.personName,
          rowLabel: input.rowLabel,
          rowHint: input.rowHint,
          referenceIso,
        }),
      ),
    );
    assertUsable(understanding, input.planType);

    // Stage 2 — extract with the verified structure as context.
    let raw: unknown;
    let targetRow: string | null = null;
    if (input.planType === "work") {
      targetRow = decideTargetRow(understanding, {
        rowLabel: input.rowLabel,
        rowHint: input.rowHint,
      });
      raw = await call(
        EXTRACT_WORK_SYSTEM,
        extractWorkPrompt(understanding, {
          personName: input.personName,
          personId: input.personId,
          referenceIso,
          targetRow,
          pageCount: input.images.length,
        }),
      );
      // The model must name the row it used; a different row means the values may belong to someone else.
      const echoed =
        raw && typeof raw === "object" ? (raw as { targetRowLabel?: unknown }).targetRowLabel : null;
      if (
        targetRow &&
        (typeof echoed !== "string" || normalizeLabel(echoed) !== normalizeLabel(targetRow))
      ) {
        throw needsRowChoiceError(understanding.layout.employeeLabels);
      }
    } else {
      raw = await call(
        EXTRACT_SCHOOL_SYSTEM,
        extractSchoolPrompt(understanding, {
          personName: input.personName,
          personId: input.personId,
          referenceIso,
          pageCount: input.images.length,
        }),
      );
    }

    if (!raw || typeof raw !== "object") throw new PlanAiError("upstream", "Ungültige KI-Antwort.", 502);
    const payload = raw as Record<string, unknown>;
    payload.source = "ai";
    // Prefer the legend read in stage 1 when stage 2 did not repeat it.
    if (input.planType === "work" && !payload.legend && Object.keys(understanding.legend).length) {
      payload.legend = understanding.legend;
    }

    const validated = validatePlanAnalysis(payload, input.planType, input.referenceDate, {
      requireEvidence: true,
      declaredPeriod: understanding.period,
    });
    if (!validated.ok) throw new Error(validated.error);

    const result = validated.result;
    if (understanding.quality.verdict === "poor") {
      result.confidence = Math.min(result.confidence, 0.5);
      result.warnings.unshift(
        `Das Foto ist nur eingeschränkt lesbar${
          understanding.quality.issues.length ? ` (${understanding.quality.issues.join(", ")})` : ""
        } — bitte alles genau prüfen.`,
      );
    }
    return result;
  }
}
