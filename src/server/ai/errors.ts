import { PHOTO_TIPS } from "@/lib/plan-analysis/photo-quality";

export type PlanAiErrorCode =
  | "not_configured"
  | "photo_unreadable"
  | "wrong_document"
  | "needs_row_choice"
  | "upstream";

/**
 * A plan analysis outcome the user must act on. Carries an HTTP status and the
 * payload the UI needs (retake tips, or the row labels to choose from) — never
 * a half-built plan.
 */
export class PlanAiError extends Error {
  constructor(
    readonly code: PlanAiErrorCode,
    message: string,
    readonly status: number,
    readonly extra: { tips?: string[]; rows?: string[]; issues?: string[] } = {},
  ) {
    super(message);
    this.name = "PlanAiError";
  }
}

export const notConfiguredError = () =>
  new PlanAiError(
    "not_configured",
    "Die KI-Planerkennung ist nicht eingerichtet (OPENAI_API_KEY fehlt). Es wird kein Beispielplan erzeugt — bitte den Plan manuell im Plan-Editor eintragen.",
    503,
  );

export const photoUnreadableError = (issues: string[] = []) =>
  new PlanAiError("photo_unreadable", "Das Foto ist leider nicht gut genug lesbar.", 422, {
    tips: PHOTO_TIPS,
    issues,
  });

export const wrongDocumentError = (expected: "work" | "school") =>
  new PlanAiError(
    "wrong_document",
    expected === "work"
      ? "Das sieht nicht nach einem Dienstplan aus. Bitte den richtigen Plan fotografieren oder oben „Stundenplan“ wählen."
      : "Das sieht nicht nach einem Stundenplan aus. Bitte den richtigen Plan fotografieren oder oben „Arbeitsplan“ wählen.",
    422,
  );

export const needsRowChoiceError = (rows: string[]) =>
  new PlanAiError(
    "needs_row_choice",
    "Ich bin nicht sicher, welche Zeile deine ist. Bitte wähle sie aus.",
    409,
    { rows },
  );
