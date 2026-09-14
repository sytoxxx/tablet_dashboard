/**
 * Server-only auth for Coffee Morning → School Jarvis integration.
 * Token never logged, never sent to browsers from this app.
 */

export type CoffeeMorningAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: "missing_token" | "invalid_token" | "not_configured" };

export function getCoffeeMorningApiToken(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return env.COFFEE_MORNING_API_TOKEN?.trim() || null;
}

/**
 * Primary Coffee Morning person this integration serves (Phase 14: Levi).
 */
export function getIntegrationPersonId(
  env: Record<string, string | undefined> = process.env,
): "levi" | "birgit" | "heidi" {
  const raw = env.COFFEE_MORNING_PERSON_ID?.trim().toLowerCase();
  if (raw === "birgit" || raw === "heidi" || raw === "levi") return raw;
  return "levi";
}

export function authenticateCoffeeMorningRequest(
  authorizationHeader: string | null,
  env: Record<string, string | undefined> = process.env,
): CoffeeMorningAuthResult {
  const expected = getCoffeeMorningApiToken(env);
  if (!expected) {
    return { ok: false, status: 503, error: "not_configured" };
  }

  if (!authorizationHeader?.trim()) {
    return { ok: false, status: 401, error: "missing_token" };
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  if (!match) {
    return { ok: false, status: 401, error: "invalid_token" };
  }

  const provided = match[1]?.trim() ?? "";
  if (!provided || provided !== expected) {
    return { ok: false, status: 401, error: "invalid_token" };
  }

  return { ok: true };
}
