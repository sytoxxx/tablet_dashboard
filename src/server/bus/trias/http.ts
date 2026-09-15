/**
 * Shared TRIAS HTTP contract (Verbund Linie OGD / VDV-431).
 * Server-side only — never expose RequestorRef or response bodies to the client.
 */

/** Official Verbund Linie Steiermark TRIAS OGD endpoint (received from provider). */
export const OFFICIAL_STEIERMARK_TRIAS_URL =
  "http://ogdtrias.verbundlinie.at:8183/stv/trias";

export const TRIAS_CONTENT_TYPE = "text/xml";

export const TRIAS_REQUEST_HEADERS = {
  "Content-Type": TRIAS_CONTENT_TYPE,
  Accept: "application/xml, text/xml, */*",
} as const;

/** Default AbortController timeout for TRIAS calls (ms). */
export const TRIAS_DEFAULT_TIMEOUT_MS = 8000;
