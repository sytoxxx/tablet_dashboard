import { describe, expect, it } from "vitest";
import { parseTriasStopEvents } from "@/server/bus/trias/parse-stop-events";
import { parseTriasLocationResults } from "@/server/bus/trias/parse-locations";
import { selectRelevantDeparture } from "@/lib/bus/select";
import { buildTriasStopEventRequest } from "@/server/bus/trias/requests";
import { VerbundSteiermarkBusProvider } from "@/server/bus/verbund-steiermark";

/** Minimal StopEventResult fixture using documented VDV tags only. */
function stopEventXml(parts: {
  line: string;
  destination: string;
  timetable: string;
  estimated?: string;
  cancelled?: boolean;
  notServiced?: boolean;
}): string {
  return `<?xml version="1.0"?>
<Trias xmlns="http://www.vdv.de/trias">
  <ServiceDelivery>
    <DeliveryPayload>
      <StopEventResponse>
        <StopEventResult>
          <ResultId>1</ResultId>
          <StopEvent>
            <ThisCall>
              <CallAtStop>
                <ServiceDeparture>
                  <TimetabledTime>${parts.timetable}</TimetabledTime>
                  ${
                    parts.estimated
                      ? `<EstimatedTime>${parts.estimated}</EstimatedTime>`
                      : ""
                  }
                </ServiceDeparture>
                ${
                  parts.notServiced
                    ? "<NotServicedStop>true</NotServicedStop>"
                    : ""
                }
              </CallAtStop>
            </ThisCall>
            <Service>
              ${parts.cancelled ? "<Cancelled>true</Cancelled>" : ""}
              <PublishedLineName><Text>${parts.line}</Text></PublishedLineName>
              <DestinationText><Text>${parts.destination}</Text></DestinationText>
            </Service>
          </StopEvent>
        </StopEventResult>
      </StopEventResponse>
    </DeliveryPayload>
  </ServiceDelivery>
</Trias>`;
}

describe("TRIAS StopEvent parser", () => {
  it("maps planned departure without realtime", () => {
    const deps = parseTriasStopEvents(
      stopEventXml({
        line: "1",
        destination: "Kapfenberg Europaplatz",
        timetable: "2026-09-14T05:32:00+02:00",
      }),
    );
    expect(deps).toHaveLength(1);
    expect(deps[0].scheduledTime).toBe("05:32");
    expect(deps[0].realtimeTime).toBeUndefined();
    expect(deps[0].time).toBe("05:32");
    expect(deps[0].isRealtime).toBe(false);
    expect(deps[0].status).toBe("PLANNED");
    expect(deps[0].delayMinutes).toBeNull();
  });

  it("prefers EstimatedTime and computes delayMinutes", () => {
    const deps = parseTriasStopEvents(
      stopEventXml({
        line: "1",
        destination: "Bruck/Mur Bahnhof",
        timetable: "2026-09-14T05:32:00+02:00",
        estimated: "2026-09-14T05:41:00+02:00",
      }),
    );
    expect(deps[0].scheduledTime).toBe("05:32");
    expect(deps[0].realtimeTime).toBe("05:41");
    expect(deps[0].time).toBe("05:41");
    expect(deps[0].delayMinutes).toBe(9);
    expect(deps[0].isRealtime).toBe(true);
    expect(deps[0].status).toBe("DELAYED");
  });

  it("marks Cancelled services", () => {
    const deps = parseTriasStopEvents(
      stopEventXml({
        line: "1",
        destination: "Bruck",
        timetable: "2026-09-14T05:32:00+02:00",
        cancelled: true,
      }),
    );
    expect(deps[0].cancelled).toBe(true);
    expect(deps[0].status).toBe("CANCELLED");
  });

  it("marks NotServicedStop as cancelled", () => {
    const deps = parseTriasStopEvents(
      stopEventXml({
        line: "2",
        destination: "Kapfenberg",
        timetable: "2026-09-14T05:52:00+02:00",
        notServiced: true,
      }),
    );
    expect(deps[0].cancelled).toBe(true);
    expect(deps[0].status).toBe("CANCELLED");
  });

  it("returns empty for invalid / empty provider XML", () => {
    expect(parseTriasStopEvents("<Trias></Trias>")).toEqual([]);
    expect(parseTriasStopEvents("not-xml")).toEqual([]);
  });
});

describe("TRIAS selection after cancel / delay", () => {
  it("skips cancelled then picks next", () => {
    const xml = `<?xml version="1.0"?><Trias>
      <StopEventResult>
        <StopEvent>
          <ThisCall><CallAtStop><ServiceDeparture>
            <TimetabledTime>2026-09-14T05:32:00+02:00</TimetabledTime>
          </ServiceDeparture></CallAtStop></ThisCall>
          <Service><Cancelled>true</Cancelled>
            <PublishedLineName><Text>1</Text></PublishedLineName>
            <DestinationText><Text>Bruck</Text></DestinationText>
          </Service>
        </StopEvent>
      </StopEventResult>
      <StopEventResult>
        <StopEvent>
          <ThisCall><CallAtStop><ServiceDeparture>
            <TimetabledTime>2026-09-14T05:52:00+02:00</TimetabledTime>
          </ServiceDeparture></CallAtStop></ThisCall>
          <Service>
            <PublishedLineName><Text>1</Text></PublishedLineName>
            <DestinationText><Text>Bruck</Text></DestinationText>
          </Service>
        </StopEvent>
      </StopEventResult>
    </Trias>`;
    const deps = parseTriasStopEvents(xml);
    const next = selectRelevantDeparture(deps, new Date(2026, 8, 14, 5, 20), {
      stopName: "Start",
      targetStartHHMM: "06:30",
      leadTimeMinutes: 20,
      source: "live",
    });
    expect(next?.departure).toBe("05:52");
    expect(next?.cancelled).toBe(false);
  });

  it("realtime delay can make connection too late vs lead time", () => {
    const deps = parseTriasStopEvents(
      stopEventXml({
        line: "1",
        destination: "Bruck",
        timetable: "2026-09-14T05:32:00+02:00",
        estimated: "2026-09-14T05:50:00+02:00",
      }),
    );
    // Work 06:00, lead 15 → must depart by 05:45. Realtime 05:50 is too late.
    const next = selectRelevantDeparture(deps, new Date(2026, 8, 14, 5, 0), {
      stopName: "Start",
      targetStartHHMM: "06:00",
      leadTimeMinutes: 15,
      source: "live",
    });
    expect(next?.departure).toBe("05:50");
    expect(next?.arrivesInTime).toBe(false);
    expect(next?.delayMinutes).toBe(18);
  });
});

describe("TRIAS location search parser", () => {
  it("keeps original StopPointRef and optional geo/locality", () => {
    const xml = `<?xml version="1.0"?><Trias>
      <LocationResult>
        <Location>
          <StopPoint>
            <StopPointRef>ST:12345:0</StopPointRef>
            <StopPointName><Text>Kapfenberg Europaplatz</Text></StopPointName>
          </StopPoint>
          <GeoPosition>
            <Longitude>15.2901</Longitude>
            <Latitude>47.4442</Latitude>
          </GeoPosition>
          <LocalityName><Text>Kapfenberg</Text></LocalityName>
        </Location>
      </LocationResult>
    </Trias>`;
    const hits = parseTriasLocationResults(xml);
    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe("ST:12345:0");
    expect(hits[0].name).toBe("Kapfenberg Europaplatz");
    expect(hits[0].locality).toBe("Kapfenberg");
    expect(hits[0].latitude).toBeCloseTo(47.4442);
    expect(hits[0].longitude).toBeCloseTo(15.2901);
    expect(hits[0].provider).toBe("verbund-steiermark");
  });

  it("parses Steiermark namespaced LocationName as locality", () => {
    const xml = `<?xml version="1.0"?>
      <trias:Trias xmlns:trias="http://www.vdv.de/trias">
        <trias:LocationResult>
          <trias:Location>
            <trias:StopPoint>
              <trias:StopPointRef>at:46:30537</trias:StopPointRef>
              <trias:StopPointName><trias:Text>Einkaufszentrum</trias:Text></trias:StopPointName>
            </trias:StopPoint>
            <trias:LocationName><trias:Text>Apfelmoar</trias:Text></trias:LocationName>
          </trias:Location>
        </trias:LocationResult>
      </trias:Trias>`;
    const hits = parseTriasLocationResults(xml);
    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe("at:46:30537");
    expect(hits[0].name).toBe("Einkaufszentrum");
    expect(hits[0].locality).toBe("Apfelmoar");
  });

  it("skips results without StopPointRef (never invents ids)", () => {
    const xml = `<?xml version="1.0"?><Trias>
      <LocationResult>
        <Location>
          <StopPointName><Text>Irgendwo</Text></StopPointName>
        </Location>
      </LocationResult>
    </Trias>`;
    expect(parseTriasLocationResults(xml)).toEqual([]);
  });
});

describe("TRIAS request + missing ENV", () => {
  it("builds StopEventRequest with Params (FAQ-compliant)", () => {
    const xml = buildTriasStopEventRequest({
      stopRef: "ST:1",
      requestor: "OpenService",
      depArrTime: "2026-09-14T05:00:00Z",
    });
    expect(xml).toContain("<Params>");
    expect(xml).not.toContain("StopEventParam");
    expect(xml).toContain("<StopPointRef>ST:1</StopPointRef>");
    expect(xml).toContain("<IncludeRealtimeData>true</IncludeRealtimeData>");
  });

  it("provider without ENV returns isTestData local", async () => {
    const prev = process.env.VERBUND_STEIERMARK_TRIAS_URL;
    delete process.env.VERBUND_STEIERMARK_TRIAS_URL;
    const provider = new VerbundSteiermarkBusProvider();
    const result = await provider.getDepartures({
      stopName: "Start",
      externalId: "ST:1",
      localDepartures: [{ line: "1", destination: "X [TEST]", time: "05:32" }],
    });
    expect(result.isTestData).toBe(true);
    expect(result.source).toBe("local");
    expect(result.fetchedAt).toBeTruthy();
    if (prev === undefined) delete process.env.VERBUND_STEIERMARK_TRIAS_URL;
    else process.env.VERBUND_STEIERMARK_TRIAS_URL = prev;
  });
});
