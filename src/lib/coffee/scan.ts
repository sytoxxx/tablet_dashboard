/**
 * Bean label scan draft — uncertain fields stay empty / "Nicht erkannt".
 * Never treat mock or low-confidence values as facts until the user confirms.
 */
export type BeanScanField = {
  value: string;
  /** Empty or unsure → show as Nicht erkannt in UI. */
  recognized: boolean;
};

export type BeanScanDraft = {
  name: BeanScanField;
  roaster: BeanScanField;
  origin: BeanScanField;
  roast: BeanScanField;
  notes: BeanScanField;
};

export type BeanScanResult = {
  source: "ai" | "mock";
  confidence: number;
  warnings: string[];
  draft: BeanScanDraft;
};

export type BeanScanAiInput = {
  imageBase64: string;
  mimeType: string;
};

export interface BeanScanAiProvider {
  readonly name: "mock" | "openai";
  analyze(input: BeanScanAiInput): Promise<BeanScanResult>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function fieldFrom(raw: unknown, max: number): BeanScanField {
  if (typeof raw === "string") {
    const value = raw.replace(/[<>]/g, "").trim().slice(0, max);
    if (!value || /^nicht erkannt$/i.test(value) || value === "?" || value === "—") {
      return { value: "", recognized: false };
    }
    return { value, recognized: true };
  }
  if (isRecord(raw)) {
    const value =
      typeof raw.value === "string"
        ? raw.value.replace(/[<>]/g, "").trim().slice(0, max)
        : "";
    const recognized =
      typeof raw.recognized === "boolean"
        ? raw.recognized && !!value
        : !!value && !/^nicht erkannt$/i.test(value);
    if (!recognized || !value) return { value: "", recognized: false };
    return { value, recognized: true };
  }
  return { value: "", recognized: false };
}

export function emptyBeanScanDraft(): BeanScanDraft {
  return {
    name: { value: "", recognized: false },
    roaster: { value: "", recognized: false },
    origin: { value: "", recognized: false },
    roast: { value: "", recognized: false },
    notes: { value: "", recognized: false },
  };
}

export function validateBeanScanResult(
  raw: unknown,
): { ok: true; result: BeanScanResult } | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: "Ungültige Scan-Antwort." };
  const source = raw.source === "ai" || raw.source === "mock" ? raw.source : "mock";
  const confidence =
    typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
      ? Math.max(0, Math.min(1, raw.confidence))
      : 0;
  const warnings = Array.isArray(raw.warnings)
    ? raw.warnings
        .filter((w): w is string => typeof w === "string")
        .map((w) => w.slice(0, 200))
        .slice(0, 12)
    : [];

  const draftRaw = isRecord(raw.draft) ? raw.draft : {};
  const draft: BeanScanDraft = {
    name: fieldFrom(draftRaw.name, 80),
    roaster: fieldFrom(draftRaw.roaster, 80),
    origin: fieldFrom(draftRaw.origin, 80),
    roast: fieldFrom(draftRaw.roast, 40),
    notes: fieldFrom(draftRaw.notes, 400),
  };

  return {
    ok: true,
    result: { source, confidence, warnings, draft },
  };
}

export function displayScanValue(field: BeanScanField): string {
  return field.recognized && field.value ? field.value : "Nicht erkannt";
}
