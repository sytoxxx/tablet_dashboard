import { isSteiermarkConfigured, isVaoConfigured } from "@/server/bus";

export type BusConnectionStatus = "live" | "testdata" | "offline" | "disabled";

export type BusStatusSnapshot = {
  status: BusConnectionStatus;
  statusLabel: string;
  activeProvider: string;
  steiermarkConfigured: boolean;
  vaoConfigured: boolean;
  busProviderEnv: string;
  lastSuccessAt: string | null;
  lastError: string | null;
  message: string;
};

/**
 * Server-side capability snapshot for Admin — never invents credentials.
 * Does not call external APIs (cheap, safe for frequent Admin refresh).
 */
export function getBusStatusSnapshot(input?: {
  online?: boolean;
  lastSuccessAt?: string | null;
  lastError?: string | null;
  preferredProvider?: string | null;
}): BusStatusSnapshot {
  const steiermarkConfigured = isSteiermarkConfigured();
  const vaoConfigured = isVaoConfigured();
  const busProviderEnv = (process.env.BUS_PROVIDER || "auto").toLowerCase();
  const online = input?.online !== false;

  let activeProvider = "local";
  const preferred = input?.preferredProvider;
  if (
    preferred === "verbund-steiermark" ||
    preferred === "vao" ||
    preferred === "wienerlinien" ||
    preferred === "local" ||
    preferred === "mock"
  ) {
    activeProvider = preferred;
  } else if (busProviderEnv !== "auto") {
    activeProvider = busProviderEnv;
  } else if (steiermarkConfigured) {
    activeProvider = "verbund-steiermark";
  } else if (vaoConfigured) {
    activeProvider = "vao";
  }

  if (!online) {
    return {
      status: "offline",
      statusLabel: "Offline",
      activeProvider,
      steiermarkConfigured,
      vaoConfigured,
      busProviderEnv,
      lastSuccessAt: input?.lastSuccessAt ?? null,
      lastError: input?.lastError ?? "Keine Netzwerkverbindung",
      message: "Offline — zuletzt bekannte Daten behalten.",
    };
  }

  const liveReady =
    (activeProvider === "verbund-steiermark" && steiermarkConfigured) ||
    (activeProvider === "vao" && vaoConfigured) ||
    activeProvider === "wienerlinien" ||
    ((preferred === "auto" || !preferred) &&
      busProviderEnv === "auto" &&
      (steiermarkConfigured || vaoConfigured));

  if (liveReady && !input?.lastError) {
    const resolved =
      steiermarkConfigured && (activeProvider === "verbund-steiermark" || activeProvider === "local")
        ? "verbund-steiermark"
        : steiermarkConfigured
          ? "verbund-steiermark"
          : vaoConfigured
            ? "vao"
            : activeProvider;
    return {
      status: "live",
      statusLabel: "Live",
      activeProvider: resolved,
      steiermarkConfigured,
      vaoConfigured,
      busProviderEnv,
      lastSuccessAt: input?.lastSuccessAt ?? null,
      lastError: null,
      message: steiermarkConfigured
        ? "TRIAS-Zugang konfiguriert — Live möglich sobald Haltestellen-IDs gesetzt sind."
        : "VAO-Zugang konfiguriert — Live möglich sobald Haltestellen-IDs gesetzt sind.",
    };
  }

  if (liveReady && input?.lastError) {
    return {
      status: "testdata",
      statusLabel: "Testdaten",
      activeProvider,
      steiermarkConfigured,
      vaoConfigured,
      busProviderEnv,
      lastSuccessAt: input?.lastSuccessAt ?? null,
      lastError: input.lastError,
      message: "Providerfehler — Fallback auf lokale Testdaten.",
    };
  }

  return {
    status: "testdata",
    statusLabel: "Testdaten",
    activeProvider: "local",
    steiermarkConfigured,
    vaoConfigured,
    busProviderEnv,
    lastSuccessAt: input?.lastSuccessAt ?? null,
    lastError: input?.lastError ?? null,
    message:
      "Kein Live-Zugang (TRIAS/VAO). App nutzt lokale Testdaten — nie als Live gekennzeichnet.",
  };
}
