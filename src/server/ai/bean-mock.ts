import type {
  BeanScanAiInput,
  BeanScanAiProvider,
  BeanScanResult,
} from "@/lib/coffee/scan";
import { emptyBeanScanDraft, validateBeanScanResult } from "@/lib/coffee/scan";

/**
 * Mock bean scan — never invents confident bag-label facts.
 * Returns empty / unrecognized fields so the user must fill them in.
 */
export class MockBeanScanAi implements BeanScanAiProvider {
  readonly name = "mock" as const;

  async analyze(input: BeanScanAiInput): Promise<BeanScanResult> {
    void input.imageBase64;
    void input.mimeType;

    const validated = validateBeanScanResult({
      source: "mock",
      confidence: 0,
      warnings: [
        "Mock-Scan: kein API-Key — keine Bohnendaten erfunden. Bitte Felder selbst prüfen und ausfüllen.",
      ],
      draft: emptyBeanScanDraft(),
    });
    if (!validated.ok) throw new Error(validated.error);
    return validated.result;
  }
}
