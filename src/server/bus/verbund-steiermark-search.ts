import type { StopSearchHit } from "@/server/bus/types";
import {
  TRIAS_DEFAULT_TIMEOUT_MS,
  TRIAS_REQUEST_HEADERS,
} from "@/server/bus/trias/http";
import { parseTriasLocationResults } from "@/server/bus/trias/parse-locations";
import { buildTriasLocationInformationRequest } from "@/server/bus/trias/requests";

/**
 * TRIAS LocationInformationRequest — only called when VERBUND_STEIERMARK_TRIAS_URL is set.
 * Never invents stop IDs. Original StopPointRef is kept as `id`.
 */
export async function searchSteiermarkStops(query: string): Promise<StopSearchHit[]> {
  const endpoint = process.env.VERBUND_STEIERMARK_TRIAS_URL?.trim();
  if (!endpoint) return [];

  const requestor =
    process.env.VERBUND_STEIERMARK_REQUESTOR_REF?.trim() || "OpenService";
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const body = buildTriasLocationInformationRequest({
    query,
    requestor,
    timestamp: nowIso,
  });

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    TRIAS_DEFAULT_TIMEOUT_MS,
  );
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { ...TRIAS_REQUEST_HEADERS },
      body,
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Parsed only — full XML is never logged.
    const xml = await res.text();
    return parseTriasLocationResults(xml);
  } finally {
    clearTimeout(timeout);
  }
}
