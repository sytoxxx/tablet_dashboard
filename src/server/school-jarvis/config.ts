import type { PersonId } from "@/lib/types";
import { SCHOOL_JARVIS_DEFAULT_ALLOWED_PERSONS } from "@/lib/integrations/school-jarvis/persons";

export type SchoolJarvisServerConfig = {
  configured: boolean;
  baseUrl: string | null;
  summaryPath: string;
  apiToken: string | null;
  handoffUrlTemplate: string | null;
  timeoutMs: number;
  cacheTtlMs: number;
  allowedPersons: PersonId[];
};

const DEFAULT_SUMMARY_PATH = "/api/integrations/coffee/school-summary";
const DEFAULT_TIMEOUT_MS = 4_000;
const DEFAULT_CACHE_TTL_MS = 90_000;

function parseAllowedPersons(raw: string | undefined): PersonId[] {
  if (!raw?.trim()) return [...SCHOOL_JARVIS_DEFAULT_ALLOWED_PERSONS];
  const allowed: PersonId[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim().toLowerCase();
    if (id === "levi" || id === "birgit" || id === "heidi") {
      if (!allowed.includes(id)) allowed.push(id);
    }
  }
  return allowed.length > 0
    ? allowed
    : [...SCHOOL_JARVIS_DEFAULT_ALLOWED_PERSONS];
}

/**
 * Server-only School Jarvis integration config.
 * Missing BASE_URL or TOKEN → integration unavailable (no fake data).
 */
export function getSchoolJarvisServerConfig(
  env: Record<string, string | undefined> = process.env,
): SchoolJarvisServerConfig {
  const baseUrl = env.SCHOOL_JARVIS_BASE_URL?.trim().replace(/\/$/, "") || null;
  const apiToken = env.SCHOOL_JARVIS_API_TOKEN?.trim() || null;
  const summaryPath =
    env.SCHOOL_JARVIS_SUMMARY_PATH?.trim() || DEFAULT_SUMMARY_PATH;
  const handoffUrlTemplate =
    env.SCHOOL_JARVIS_HANDOFF_URL?.trim() ||
    (baseUrl ? `${baseUrl}/learn?target={target}&personId={personId}` : null);
  const timeoutMs = Number.parseInt(
    env.SCHOOL_JARVIS_TIMEOUT_MS?.trim() || String(DEFAULT_TIMEOUT_MS),
    10,
  );
  const cacheTtlMs = Number.parseInt(
    env.SCHOOL_JARVIS_CACHE_TTL_MS?.trim() || String(DEFAULT_CACHE_TTL_MS),
    10,
  );

  return {
    configured: Boolean(baseUrl && apiToken),
    baseUrl,
    summaryPath: summaryPath.startsWith("/")
      ? summaryPath
      : `/${summaryPath}`,
    apiToken,
    handoffUrlTemplate,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0
      ? timeoutMs
      : DEFAULT_TIMEOUT_MS,
    cacheTtlMs: Number.isFinite(cacheTtlMs) && cacheTtlMs >= 0
      ? cacheTtlMs
      : DEFAULT_CACHE_TTL_MS,
    allowedPersons: parseAllowedPersons(env.SCHOOL_JARVIS_ALLOWED_PERSONS),
  };
}

export function isPersonAllowedForSchoolJarvis(
  personId: PersonId,
  config: SchoolJarvisServerConfig = getSchoolJarvisServerConfig(),
): boolean {
  return config.allowedPersons.includes(personId);
}

export function buildSchoolJarvisSummaryUrl(
  config: SchoolJarvisServerConfig,
  personId: PersonId,
  focusDate: string,
): string | null {
  if (!config.baseUrl) return null;
  const url = new URL(
    `${config.baseUrl}${config.summaryPath}`,
  );
  url.searchParams.set("personId", personId);
  url.searchParams.set("focusDate", focusDate);
  return url.toString();
}

/**
 * Resolve opaque action target → School Jarvis URL.
 * Template placeholders: {target}, {personId}, {focusDate}
 */
export function resolveSchoolJarvisHandoffUrl(input: {
  template: string | null;
  target: string;
  personId: PersonId;
  focusDate?: string;
}): string | null {
  if (!input.template?.trim()) return null;
  return input.template
    .replaceAll("{target}", encodeURIComponent(input.target))
    .replaceAll("{personId}", encodeURIComponent(input.personId))
    .replaceAll(
      "{focusDate}",
      encodeURIComponent(input.focusDate ?? ""),
    );
}
