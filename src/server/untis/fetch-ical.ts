/**
 * Server-side download of a WebUntis iCal subscription link.
 *
 * The link is a secret (anyone who has it can read the timetable) and the server fetches an
 * address a user typed — so: https only, host must be a WebUntis host, no credentials in the
 * URL, no private/loopback addresses, every redirect re-checked, short timeout, size cap. The
 * link itself is never logged and never echoed back in an error.
 */
import { parseIcal, type IcalParseResult } from "@/lib/untis/ical";

export type UntisErrorCode =
  | "not_configured"
  | "invalid_url"
  | "not_allowed_host"
  | "expired"
  | "not_ical"
  | "network"
  | "timeout"
  | "upstream"
  | "too_large";

export type UntisFetchResult =
  | ({ ok: true; fetchedAt: number } & IcalParseResult)
  | { ok: false; code: UntisErrorCode; message: string };

export const UNTIS_MESSAGES: Record<UntisErrorCode, string> = {
  not_configured: "WebUntis ist noch nicht verbunden.",
  invalid_url: "Das ist kein gültiger Link. Er beginnt mit https:// oder webcal://.",
  not_allowed_host:
    "Dieser Link gehört nicht zu WebUntis (die Adresse endet nicht auf webuntis.com). Bitte den Link aus WebUntis kopieren.",
  expired:
    "WebUntis lehnt den Link ab. Er ist abgelaufen oder wurde deaktiviert — bitte in WebUntis einen neuen iCal-Link erzeugen.",
  not_ical:
    "Unter diesem Link liegt kein Stundenplan, sondern eine andere Seite (vermutlich eine Anmeldeseite). Bitte den iCal-Link aus WebUntis kopieren.",
  network: "WebUntis ist gerade nicht erreichbar (Netzwerkfehler).",
  timeout: "WebUntis antwortet nicht rechtzeitig.",
  upstream: "WebUntis meldet einen Fehler. Später noch einmal versuchen.",
  too_large: "Die Antwort von WebUntis ist ungewöhnlich groß und wurde verworfen.",
};

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;

function extraHosts(env: Record<string, string | undefined>): string[] {
  return (env.WEBUNTIS_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function isIpLiteral(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[");
}

export function validateUntisUrl(
  raw: string,
  env: Record<string, string | undefined> = process.env,
): { ok: true; url: URL } | { ok: false; code: "invalid_url" | "not_allowed_host" } {
  const trimmed = raw.trim().replace(/^webcal:\/\//i, "https://").replace(/^webcals:\/\//i, "https://");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, code: "invalid_url" };
  }
  if (url.protocol !== "https:" || url.username || url.password) return { ok: false, code: "invalid_url" };
  if (url.port && url.port !== "443") return { ok: false, code: "invalid_url" };
  const host = url.hostname.toLowerCase();
  if (isIpLiteral(host) || host === "localhost") return { ok: false, code: "not_allowed_host" };
  const allowed =
    host === "webuntis.com" ||
    host.endsWith(".webuntis.com") ||
    extraHosts(env).some((h) => host === h || host.endsWith(`.${h}`));
  if (!allowed) return { ok: false, code: "not_allowed_host" };
  return { ok: true, url };
}

type FetchFn = typeof fetch;

export async function fetchUntisIcal(
  rawUrl: string,
  options: { env?: Record<string, string | undefined>; fetchImpl?: FetchFn; now?: () => number } = {},
): Promise<UntisFetchResult> {
  const env = options.env ?? process.env;
  const doFetch = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;

  let current = validateUntisUrl(rawUrl, env);
  if (!current.ok) return fail(current.code);
  let url = current.url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await doFetch(url.toString(), {
        redirect: "manual",
        signal: ctrl.signal,
        cache: "no-store",
        headers: { accept: "text/calendar, text/plain;q=0.8, */*;q=0.1", "user-agent": "CoffeeMorning/1.0" },
      });
    } catch (e) {
      clearTimeout(timer);
      return fail(e instanceof Error && e.name === "AbortError" ? "timeout" : "network");
    }
    clearTimeout(timer);

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return fail("upstream");
      current = validateUntisUrl(new URL(loc, url).toString(), env);
      if (!current.ok) return fail("not_allowed_host");
      url = current.url;
      continue;
    }
    if (res.status === 401 || res.status === 403 || res.status === 404 || res.status === 410) return fail("expired");
    if (res.status >= 500) return fail("upstream");
    if (!res.ok) return fail("upstream");

    const declared = Number(res.headers.get("content-length") ?? "0");
    if (declared > MAX_BYTES) return fail("too_large");
    let text: string;
    try {
      text = await res.text();
    } catch {
      return fail("network");
    }
    if (text.length > MAX_BYTES) return fail("too_large");
    if (!/^\s*BEGIN:VCALENDAR/i.test(text)) return fail("not_ical");

    const parsed = parseIcal(text);
    return { ok: true, fetchedAt: now(), ...parsed };
  }
  return fail("upstream");
}

function fail(code: UntisErrorCode): UntisFetchResult {
  return { ok: false, code, message: UNTIS_MESSAGES[code] };
}

/** Link configured on the server (never reaches the browser). */
export function configuredUntisUrl(env: Record<string, string | undefined> = process.env): string | null {
  const v = env.WEBUNTIS_ICAL_URL?.trim();
  return v ? v : null;
}
