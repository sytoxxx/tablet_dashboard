import type { StopSearchHit } from "@/server/bus/types";
import {
  matchTag,
  matchTagOrText,
  stripXml,
} from "@/server/bus/trias/xml";

/**
 * Parse TRIAS LocationInformationResponse.
 * Documented: StopPointRef, StopPointName/Text, LocalityName, GeoPosition Latitude/Longitude.
 * Steiermark OGD often omits LocalityName and puts the place in LocationName
 * (e.g. StopPointName=Einkaufszentrum, LocationName=Apfelmoar).
 * Never invents IDs — skips results without a provider StopPointRef/StopPlaceRef.
 */
export function parseTriasLocationResults(xml: string): StopSearchHit[] {
  const out: StopSearchHit[] = [];
  const chunks = xml.split(/<(?:\w+:)?LocationResult[\s>]/i).slice(1);

  for (const chunk of chunks) {
    const id =
      matchTag(chunk, "StopPointRef") ||
      matchTag(chunk, "StopPlaceRef");
    const name =
      matchTagOrText(chunk, "StopPointName") ||
      matchTagOrText(chunk, "StopName") ||
      matchTagOrText(chunk, "LocationName") ||
      matchTagOrText(chunk, "Name");
    if (!id || !name) continue;

    const locality =
      matchTagOrText(chunk, "LocalityName") ||
      matchTagOrText(chunk, "MunicipalityName") ||
      matchTagOrText(chunk, "ParentLocationName") ||
      // Steiermark: LocationName is the place when StopPointName is the stop label
      (matchTagOrText(chunk, "StopPointName")
        ? matchTagOrText(chunk, "LocationName") || undefined
        : undefined);

    const latRaw = matchTag(chunk, "Latitude");
    const lonRaw = matchTag(chunk, "Longitude");
    const latitude = latRaw !== null ? Number(latRaw) : undefined;
    const longitude = lonRaw !== null ? Number(lonRaw) : undefined;

    out.push({
      id: stripXml(id),
      name: stripXml(name),
      place: locality ? stripXml(locality) : undefined,
      locality: locality ? stripXml(locality) : undefined,
      latitude:
        latitude !== undefined && Number.isFinite(latitude)
          ? latitude
          : undefined,
      longitude:
        longitude !== undefined && Number.isFinite(longitude)
          ? longitude
          : undefined,
      provider: "verbund-steiermark",
    });
  }

  return out.slice(0, 12);
}
