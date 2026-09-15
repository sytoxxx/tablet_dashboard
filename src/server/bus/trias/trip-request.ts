import { escapeXml } from "@/server/bus/trias/xml";

/**
 * TRIAS TripRequest builder (VDV 431 / Mentz TRIAS 1.2).
 * Experimentally verified against Verbund Steiermark OGD.
 */
export function buildTriasTripRequest(input: {
  originRef: string;
  destRef: string;
  requestor: string;
  depArrTime: string;
  numberOfResults?: number;
}): string {
  const origin = escapeXml(input.originRef);
  const dest = escapeXml(input.destRef);
  const requestor = escapeXml(input.requestor);
  const depArrTime = escapeXml(input.depArrTime);
  const n = input.numberOfResults ?? 6;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Trias version="1.2" xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri">
  <ServiceRequest>
    <siri:RequestTimestamp>${depArrTime}</siri:RequestTimestamp>
    <siri:RequestorRef>${requestor}</siri:RequestorRef>
    <RequestPayload>
      <TripRequest>
        <Origin>
          <LocationRef>
            <StopPointRef>${origin}</StopPointRef>
          </LocationRef>
          <DepArrTime>${depArrTime}</DepArrTime>
        </Origin>
        <Destination>
          <LocationRef>
            <StopPointRef>${dest}</StopPointRef>
          </LocationRef>
        </Destination>
        <Params>
          <NumberOfResults>${n}</NumberOfResults>
          <IncludeTrackSections>false</IncludeTrackSections>
          <IncludeLegProjection>false</IncludeLegProjection>
          <IncludeTurnDescription>false</IncludeTurnDescription>
          <IncludeAccessibility>false</IncludeAccessibility>
          <IncludeRealtimeData>true</IncludeRealtimeData>
        </Params>
      </TripRequest>
    </RequestPayload>
  </ServiceRequest>
</Trias>`;
}
