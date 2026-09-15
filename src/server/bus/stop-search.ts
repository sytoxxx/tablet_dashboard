import type { StopSearchHit } from "@/server/bus/types";
import { isVaoConfigured } from "@/server/bus/vao";
import { isSteiermarkConfigured } from "@/server/bus/verbund-steiermark";
import { searchSteiermarkStops } from "@/server/bus/verbund-steiermark-search";
import { searchVaoStops } from "@/server/bus/vao-search";

export type StopSearchResponse = {
  ok: boolean;
  searchable: boolean;
  stops: StopSearchHit[];
  provider: string | null;
  message: string;
  isTestData: boolean;
};

/**
 * Search stops via the first configured regional provider (no fan-out).
 * With BUS_PROVIDER=auto (default): Steiermark TRIAS first when URL is set, then VAO.
 * Without TRIAS/VAO credentials → manual Admin entry only.
 * Never invents StopPointRefs; never logs full XML or secrets.
 */
function busProviderEnv(): string {
  return (process.env.BUS_PROVIDER || "auto").toLowerCase();
}

function allowSteiermarkSearch(): boolean {
  const mode = busProviderEnv();
  if (mode === "vao" || mode === "wienerlinien" || mode === "local" || mode === "mock") {
    return false;
  }
  // auto | verbund-steiermark
  return isSteiermarkConfigured();
}

function allowVaoSearch(): boolean {
  const mode = busProviderEnv();
  if (
    mode === "verbund-steiermark" ||
    mode === "wienerlinien" ||
    mode === "local" ||
    mode === "mock"
  ) {
    return false;
  }
  // auto | vao
  return isVaoConfigured();
}

export async function searchTransitStops(query: string): Promise<StopSearchResponse> {
  const q = query.trim();
  if (q.length < 2) {
    return {
      ok: true,
      searchable: allowSteiermarkSearch() || allowVaoSearch(),
      stops: [],
      provider: null,
      message: "Mindestens 2 Zeichen eingeben.",
      isTestData: false,
    };
  }

  // auto / verbund-steiermark: TRIAS first when URL configured
  if (allowSteiermarkSearch()) {
    try {
      const stops = await searchSteiermarkStops(q);
      return {
        ok: true,
        searchable: true,
        stops,
        provider: "verbund-steiermark",
        message:
          stops.length > 0
            ? `${stops.length} Haltestelle(n) gefunden.`
            : "Keine Haltestelle gefunden.",
        isTestData: false,
      };
    } catch {
      return {
        ok: false,
        searchable: true,
        stops: [],
        provider: "verbund-steiermark",
        message:
          "Haltestellen-Suche gerade nicht erreichbar — bitte manuell eintragen.",
        isTestData: false,
      };
    }
  }

  if (allowVaoSearch()) {
    try {
      const stops = await searchVaoStops(q);
      return {
        ok: true,
        searchable: true,
        stops,
        provider: "vao",
        message:
          stops.length > 0
            ? `${stops.length} Haltestelle(n) gefunden.`
            : "Keine Haltestelle gefunden.",
        isTestData: false,
      };
    } catch {
      return {
        ok: false,
        searchable: true,
        stops: [],
        provider: "vao",
        message:
          "Haltestellen-Suche gerade nicht erreichbar — bitte manuell eintragen.",
        isTestData: false,
      };
    }
  }

  return {
    ok: true,
    searchable: false,
    stops: [],
    provider: null,
    message:
      "Kein Live-Zugang (TRIAS/VAO). Haltestellen manuell als lokale Test-Konfiguration eintragen — keine IDs erfinden.",
    isTestData: true,
  };
}

export function getStopSearchCapability(): {
  searchable: boolean;
  provider: string | null;
} {
  if (allowSteiermarkSearch()) {
    return { searchable: true, provider: "verbund-steiermark" };
  }
  if (allowVaoSearch()) {
    return { searchable: true, provider: "vao" };
  }
  return { searchable: false, provider: null };
}
