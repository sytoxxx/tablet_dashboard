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
 * Without TRIAS/VAO credentials → manual Admin entry only.
 */
export async function searchTransitStops(query: string): Promise<StopSearchResponse> {
  const q = query.trim();
  if (q.length < 2) {
    return {
      ok: true,
      searchable: isSteiermarkConfigured() || isVaoConfigured(),
      stops: [],
      provider: null,
      message: "Mindestens 2 Zeichen eingeben.",
      isTestData: false,
    };
  }

  if (isSteiermarkConfigured()) {
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
        message: "Haltestellen-Suche gerade nicht erreichbar — bitte manuell eintragen.",
        isTestData: false,
      };
    }
  }

  if (isVaoConfigured()) {
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
        message: "Haltestellen-Suche gerade nicht erreichbar — bitte manuell eintragen.",
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
  if (isSteiermarkConfigured()) {
    return { searchable: true, provider: "verbund-steiermark" };
  }
  if (isVaoConfigured()) {
    return { searchable: true, provider: "vao" };
  }
  return { searchable: false, provider: null };
}
