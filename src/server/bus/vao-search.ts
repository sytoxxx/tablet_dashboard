import type { StopSearchHit } from "@/server/bus/types";

/**
 * VAO location.name search — only when VAO_API_KEY + VAO_BASE_URL are set.
 * Never invents stop IDs.
 */
export async function searchVaoStops(query: string): Promise<StopSearchHit[]> {
  const apiKey = process.env.VAO_API_KEY?.trim();
  const baseUrl = process.env.VAO_BASE_URL?.trim()?.replace(/\/$/, "");
  if (!apiKey || !baseUrl) return [];

  const url = new URL(`${baseUrl}/location.name`);
  url.searchParams.set("input", query);
  url.searchParams.set("accessId", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("type", "S");
  url.searchParams.set("maxNo", "12");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as unknown;
    return parseVaoLocations(json);
  } finally {
    clearTimeout(timeout);
  }
}

function parseVaoLocations(json: unknown): StopSearchHit[] {
  if (!json || typeof json !== "object") return [];
  const root = json as Record<string, unknown>;
  const list =
    (Array.isArray(root.stopLocationOrCoordLocation) &&
      root.stopLocationOrCoordLocation) ||
    (Array.isArray(root.StopLocation) && root.StopLocation) ||
    (Array.isArray(root.LocationList) && root.LocationList) ||
    [];

  const out: StopSearchHit[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const stop =
      row.StopLocation && typeof row.StopLocation === "object"
        ? (row.StopLocation as Record<string, unknown>)
        : row;
    const id = String(stop.id || stop.extId || stop.stopId || "").trim();
    const name = String(stop.name || stop.stopName || "").trim();
    if (!id || !name) continue;
    const place = String(
      stop.productAtStop || stop.municipality || stop.locationNotes || "",
    ).trim();
    out.push({
      id,
      name,
      place: place || undefined,
      provider: "vao",
    });
  }
  return out.slice(0, 12);
}
