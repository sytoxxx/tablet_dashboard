import { escapeXml } from "@/server/bus/trias/xml";

/**
 * TRIAS request builders — Verbund Linie FAQ:
 * - Use `<Params>` (not StopEventParam)
 * - LocationInformationRequest + StopEventRequest supported
 * - RequestorRef from provider agreement
 *
 * TODO(after credentials): confirm exact RequestorRef and any Steiermark-specific
 * headers with the URL they send; do not invent endpoints.
 */

export function buildTriasStopEventRequest(input: {
  stopRef: string;
  requestor: string;
  depArrTime: string;
}): string {
  const stopRef = escapeXml(input.stopRef);
  const requestor = escapeXml(input.requestor);
  const depArrTime = escapeXml(input.depArrTime);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Trias version="1.2" xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri">
  <ServiceRequest>
    <siri:RequestTimestamp>${depArrTime}</siri:RequestTimestamp>
    <siri:RequestorRef>${requestor}</siri:RequestorRef>
    <RequestPayload>
      <StopEventRequest>
        <Location>
          <LocationRef>
            <StopPointRef>${stopRef}</StopPointRef>
          </LocationRef>
          <DepArrTime>${depArrTime}</DepArrTime>
        </Location>
        <Params>
          <NumberOfResults>12</NumberOfResults>
          <StopEventType>departure</StopEventType>
          <IncludeRealtimeData>true</IncludeRealtimeData>
        </Params>
      </StopEventRequest>
    </RequestPayload>
  </ServiceRequest>
</Trias>`;
}

export function buildTriasLocationInformationRequest(input: {
  query: string;
  requestor: string;
  timestamp: string;
}): string {
  const q = escapeXml(input.query);
  const requestor = escapeXml(input.requestor);
  const ts = escapeXml(input.timestamp);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Trias version="1.2" xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri">
  <ServiceRequest>
    <siri:RequestTimestamp>${ts}</siri:RequestTimestamp>
    <siri:RequestorRef>${requestor}</siri:RequestorRef>
    <RequestPayload>
      <LocationInformationRequest>
        <InitialInput>
          <LocationName>${q}</LocationName>
        </InitialInput>
        <Restrictions>
          <Type>stop</Type>
          <NumberOfResults>12</NumberOfResults>
        </Restrictions>
      </LocationInformationRequest>
    </RequestPayload>
  </ServiceRequest>
</Trias>`;
}
