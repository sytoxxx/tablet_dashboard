import {
  OFFICIAL_STEIERMARK_TRIAS_URL,
  TRIAS_DEFAULT_TIMEOUT_MS,
  TRIAS_REQUEST_HEADERS,
} from "@/server/bus/trias/http";
import { buildTriasLocationInformationRequest } from "@/server/bus/trias/requests";

/**
 * Safe server-side TRIAS connectivity probe.
 * Calls the real endpoint with a LocationInformationRequest (no stop hardcoding).
 * Never returns full XML or secrets — only structured status for Admin/tests.
 */

export type TriasConnectivityResult = {
  endpointConfigured: boolean;
  /** Hostname only — never the full URL with query/auth. */
  endpointHost: string | null;
  httpStatus: number | null;
  reachable: boolean;
  credentialsRequired: boolean;
  looksLikeTrias: boolean;
  timedOut: boolean;
  errorKind:
    | "none"
    | "not_configured"
    | "timeout"
    | "network"
    | "http"
    | "parse";
  message: string;
};

export type ProbeTriasOptions = {
  endpoint?: string;
  timeoutMs?: number;
  /** Injected for unit tests — defaults to global fetch. */
  fetchImpl?: typeof fetch;
  requestor?: string;
};

function hostOnly(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/** True when body looks like a TRIAS/VDV envelope (no full body retained). */
export function looksLikeTriasXml(body: string): boolean {
  const sample = body.slice(0, 4000);
  return (
    /<\s*Trias\b/i.test(sample) ||
    /www\.vdv\.de\/trias/i.test(sample) ||
    /<\s*ServiceDelivery\b/i.test(sample) ||
    /<\s*DeliveryPayload\b/i.test(sample)
  );
}

function credentialsRequiredFromStatus(status: number): boolean {
  return status === 401 || status === 403;
}

/**
 * Probe TRIAS reachability. Uses LocationInformationRequest so no StopPointRef
 * needs to be configured. Safe for logs via {@link toSafeConnectivitySummary}.
 */
export async function probeTriasConnectivity(
  options: ProbeTriasOptions = {},
): Promise<TriasConnectivityResult> {
  const endpoint =
    options.endpoint?.trim() ||
    process.env.VERBUND_STEIERMARK_TRIAS_URL?.trim() ||
    "";

  if (!endpoint) {
    return {
      endpointConfigured: false,
      endpointHost: null,
      httpStatus: null,
      reachable: false,
      credentialsRequired: false,
      looksLikeTrias: false,
      timedOut: false,
      errorKind: "not_configured",
      message: "VERBUND_STEIERMARK_TRIAS_URL fehlt — Probe übersprungen.",
    };
  }

  const requestor =
    options.requestor?.trim() ||
    process.env.VERBUND_STEIERMARK_REQUESTOR_REF?.trim() ||
    "OpenService";
  const timeoutMs = options.timeoutMs ?? TRIAS_DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const body = buildTriasLocationInformationRequest({
    query: "Kapfenberg",
    requestor,
    timestamp: nowIso,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { ...TRIAS_REQUEST_HEADERS },
      body,
    });

    const httpStatus = res.status;
    if (credentialsRequiredFromStatus(httpStatus)) {
      return {
        endpointConfigured: true,
        endpointHost: hostOnly(endpoint),
        httpStatus,
        reachable: true,
        credentialsRequired: true,
        looksLikeTrias: false,
        timedOut: false,
        errorKind: "http",
        message: "Credentials fehlen/erforderlich",
      };
    }

    // Read body only to classify structure — never return or log the raw XML.
    const xml = await res.text();
    const trias = looksLikeTriasXml(xml);

    if (!res.ok) {
      return {
        endpointConfigured: true,
        endpointHost: hostOnly(endpoint),
        httpStatus,
        reachable: true,
        credentialsRequired: false,
        looksLikeTrias: trias,
        timedOut: false,
        errorKind: "http",
        message: trias
          ? `TRIAS erreichbar, HTTP ${httpStatus} (Antwort als TRIAS erkannt).`
          : `Endpoint antwortet mit HTTP ${httpStatus}.`,
      };
    }

    return {
      endpointConfigured: true,
      endpointHost: hostOnly(endpoint),
      httpStatus,
      reachable: true,
      credentialsRequired: false,
      looksLikeTrias: trias,
      timedOut: false,
      errorKind: trias ? "none" : "parse",
      message: trias
        ? "TRIAS-Endpoint ohne Credentials erreichbar — Antwort als TRIAS erkannt."
        : "Endpoint erreichbar, Antwort nicht als TRIAS erkannt.",
    };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    const timedOut = name === "AbortError" || /aborted/i.test(String(err));
    return {
      endpointConfigured: true,
      endpointHost: hostOnly(endpoint),
      httpStatus: null,
      reachable: false,
      credentialsRequired: false,
      looksLikeTrias: false,
      timedOut,
      errorKind: timedOut ? "timeout" : "network",
      message: timedOut
        ? `TRIAS-Timeout nach ${timeoutMs}ms.`
        : "TRIAS-Endpoint nicht erreichbar (Netzwerkfehler).",
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * One-line summary safe for logs/Admin — no XML, no RequestorRef, no secrets.
 */
export function toSafeConnectivitySummary(
  result: TriasConnectivityResult,
): string {
  return [
    `trias_probe host=${result.endpointHost ?? "n/a"}`,
    `configured=${result.endpointConfigured}`,
    `http=${result.httpStatus ?? "n/a"}`,
    `reachable=${result.reachable}`,
    `credentialsRequired=${result.credentialsRequired}`,
    `looksLikeTrias=${result.looksLikeTrias}`,
    `timedOut=${result.timedOut}`,
    `errorKind=${result.errorKind}`,
  ].join(" ");
}

export { OFFICIAL_STEIERMARK_TRIAS_URL };
