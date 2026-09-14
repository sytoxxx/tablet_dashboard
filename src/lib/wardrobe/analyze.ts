/**
 * Garment image analysis — optional suggestion only.
 * Never auto-saves. Never logs image bytes / base64.
 * Without a vision provider, returns unavailable so manual import works.
 */
import type { WardrobeAnalyzeResult } from "@/lib/wardrobe/model";

export type VisionAnalyzeInput = {
  /** Opaque handle — callers must not pass this to logs. */
  imageMimeType?: string;
  /** Byte length only — never the payload. */
  imageByteLength?: number;
};

/**
 * Analyze a garment photo into a suggestion draft.
 * Default: unavailable (no paid / required cloud vision).
 * Manual import remains fully usable.
 */
export async function analyzeGarmentImage(
  input: VisionAnalyzeInput = {},
): Promise<WardrobeAnalyzeResult> {
  // Privacy: intentionally ignore image bytes; never log them.
  void input.imageMimeType;
  void input.imageByteLength;
  return {
    ok: false,
    reason: "unavailable",
    note: "Bildanalyse ist noch nicht eingerichtet — bitte manuell ausfüllen.",
  };
}

/**
 * Build a blank suggestion shell after a photo was chosen (no vision).
 * Fields stay unknown until the user fills them.
 */
export function suggestionShellAfterPhoto(): Extract<
  WardrobeAnalyzeResult,
  { ok: true }
> {
  return {
    ok: true,
    note: "Foto gewählt — bitte Kategorie und Farbe prüfen.",
    draft: {
      garmentKind: "other",
      name: "",
      color: "unknown",
      brightness: "unknown",
      style: "unknown",
      warmth: "unknown",
      rainSuitable: null,
      comfort: "unknown",
      brand: null,
      favorite: false,
      tags: [],
      source: "suggestion",
      fromVision: false,
    },
  };
}

/** Safe error message helper — strips any accidental data-URL content. */
export function sanitizeWardrobeErrorMessage(message: string): string {
  return message
    .replace(/data:image\/[a-zA-Z+]+;base64,[a-zA-Z0-9+/=]+/g, "[image omitted]")
    .slice(0, 240);
}
