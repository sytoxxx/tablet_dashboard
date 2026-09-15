import type { PersonId } from "@/lib/types";
import type { SchoolJarvisDailySummary } from "@/lib/integrations/school-jarvis/types";
import { validateSchoolJarvisDailySummary } from "@/lib/integrations/school-jarvis/validate";
import {
  buildSchoolJarvisSummaryUrl,
  type SchoolJarvisServerConfig,
} from "@/server/school-jarvis/config";

export type RemoteFetchResult =
  | { ok: true; summary: SchoolJarvisDailySummary; status: number }
  | {
      ok: false;
      reason:
        | "not_configured"
        | "auth"
        | "not_found"
        | "server_error"
        | "timeout"
        | "network"
        | "invalid_payload"
        | "person_mismatch";
      status?: number;
      detail?: string;
    };

export type RemoteFetchDeps = {
  fetchImpl?: typeof fetch;
};

/**
 * Server-to-server call to School Jarvis Integration API.
 * Secrets stay on the Coffee Morning server — never exposed to the browser.
 */
export async function fetchSchoolJarvisRemote(input: {
  personId: PersonId;
  focusDate: string;
  config: SchoolJarvisServerConfig;
  deps?: RemoteFetchDeps;
}): Promise<RemoteFetchResult> {
  const { personId, focusDate, config } = input;
  const fetchImpl = input.deps?.fetchImpl ?? fetch;

  if (!config.configured || !config.baseUrl || !config.apiToken) {
    return { ok: false, reason: "not_configured" };
  }

  const url = buildSchoolJarvisSummaryUrl(config, personId, focusDate);
  if (!url) return { ok: false, reason: "not_configured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const res = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.apiToken}`,
        "X-Coffee-Morning-Person": personId,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: "auth", status: res.status };
    }
    if (res.status === 404) {
      return { ok: false, reason: "not_found", status: 404 };
    }
    if (res.status >= 500) {
      return { ok: false, reason: "server_error", status: res.status };
    }
    if (!res.ok) {
      return {
        ok: false,
        reason: "server_error",
        status: res.status,
        detail: `Unexpected status ${res.status}`,
      };
    }

    let raw: unknown;
    try {
      raw = await res.json();
    } catch {
      return { ok: false, reason: "invalid_payload", status: res.status };
    }

    // Allow either bare summary or envelope { ok, summary }
    const candidate =
      raw &&
      typeof raw === "object" &&
      "summary" in (raw as Record<string, unknown>)
        ? (raw as { summary: unknown }).summary
        : raw;

    const validated = validateSchoolJarvisDailySummary(candidate);
    if (!validated.ok) {
      console.error(
        "[school-jarvis] invalid summary payload:",
        validated.error,
      );
      return {
        ok: false,
        reason: "invalid_payload",
        status: res.status,
        detail: validated.error,
      };
    }

    if (validated.summary.personId !== personId) {
      console.error(
        "[school-jarvis] person mismatch: requested",
        personId,
        "got",
        validated.summary.personId,
      );
      return { ok: false, reason: "person_mismatch", status: res.status };
    }

    return { ok: true, summary: validated.summary, status: res.status };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return {
      ok: false,
      reason: "network",
      detail: err instanceof Error ? err.message : "network error",
    };
  } finally {
    clearTimeout(timer);
  }
}
