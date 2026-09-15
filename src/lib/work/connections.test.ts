import { describe, expect, it } from "vitest";
import { buildTriasTripRequest } from "@/server/bus/trias/trip-request";
import {
  parseTriasTrips,
  tripHasCancelledLeg,
  tripIsDirect,
} from "@/server/bus/trias/parse-trips";
import {
  appendConfiguredFinalWalk,
  computeLeaveHome,
  connectionFromParsedTrip,
  findEarliestCancelledConnection,
  selectUpcomingConnections,
} from "@/lib/work/connections";
import {
  BIRGIT_END_DESTINATION_LABEL,
  BIRGIT_TRANSIT_STOP_LABEL,
  HEIDI_DEST_REF,
  HEIDI_ORIGIN_REF,
} from "@/server/bus/trip-travel";

const SAMPLE_DIRECT = `<?xml version="1.0"?>
<trias:Trias xmlns:trias="http://www.vdv.de/trias">
  <trias:TripResult>
    <trias:Trip>
      <trias:Interchanges>0</trias:Interchanges>
      <trias:Duration>PT12M</trias:Duration>
      <trias:TripLeg>
        <trias:TimedLeg>
          <trias:LegBoard>
            <trias:StopPointRef>at:46:6005:0:4</trias:StopPointRef>
            <trias:StopPointName><trias:Text>Kapfenberg Europaplatz</trias:Text></trias:StopPointName>
            <trias:ServiceDeparture>
              <trias:TimetabledTime>2026-09-15T12:00:00Z</trias:TimetabledTime>
              <trias:EstimatedTime>2026-09-15T12:00:00Z</trias:EstimatedTime>
            </trias:ServiceDeparture>
          </trias:LegBoard>
          <trias:LegAlight>
            <trias:StopPointRef>at:46:30537:0:1</trias:StopPointRef>
            <trias:StopPointName><trias:Text>Apfelmoar Einkaufszentrum</trias:Text></trias:StopPointName>
            <trias:ServiceArrival>
              <trias:TimetabledTime>2026-09-15T12:12:00Z</trias:TimetabledTime>
              <trias:EstimatedTime>2026-09-15T12:12:00Z</trias:EstimatedTime>
            </trias:ServiceArrival>
          </trias:LegAlight>
          <trias:Service>
            <trias:PublishedLineName><trias:Text>1</trias:Text></trias:PublishedLineName>
            <trias:DestinationText><trias:Text>Apfelmoar Einkaufszentrum</trias:Text></trias:DestinationText>
          </trias:Service>
        </trias:TimedLeg>
      </trias:TripLeg>
    </trias:Trip>
  </trias:TripResult>
</trias:Trias>`;

const SAMPLE_MULTI = `<?xml version="1.0"?>
<trias:Trias xmlns:trias="http://www.vdv.de/trias">
  <trias:TripResult>
    <trias:Trip>
      <trias:Interchanges>1</trias:Interchanges>
      <trias:Duration>PT26M</trias:Duration>
      <trias:TripLeg>
        <trias:TimedLeg>
          <trias:LegBoard>
            <trias:StopPointRef>at:46:6005</trias:StopPointRef>
            <trias:StopPointName><trias:Text>Kapfenberg Europaplatz</trias:Text></trias:StopPointName>
            <trias:ServiceDeparture>
              <trias:TimetabledTime>2026-09-15T12:00:00Z</trias:TimetabledTime>
            </trias:ServiceDeparture>
          </trias:LegBoard>
          <trias:LegAlight>
            <trias:StopPointRef>at:46:2063</trias:StopPointRef>
            <trias:StopPointName><trias:Text>Koloman-Wallisch-Platz</trias:Text></trias:StopPointName>
            <trias:ServiceArrival>
              <trias:TimetabledTime>2026-09-15T12:14:00Z</trias:TimetabledTime>
            </trias:ServiceArrival>
          </trias:LegAlight>
          <trias:Service>
            <trias:PublishedLineName><trias:Text>1</trias:Text></trias:PublishedLineName>
            <trias:DestinationText><trias:Text>Bruck/Mur Koloman-Wallisch-Platz via Bahnhof</trias:Text></trias:DestinationText>
          </trias:Service>
        </trias:TimedLeg>
      </trias:TripLeg>
      <trias:TripLeg>
        <trias:TimedLeg>
          <trias:LegBoard>
            <trias:StopPointRef>at:46:2063</trias:StopPointRef>
            <trias:StopPointName><trias:Text>Koloman-Wallisch-Platz</trias:Text></trias:StopPointName>
            <trias:ServiceDeparture>
              <trias:TimetabledTime>2026-09-15T12:17:00Z</trias:TimetabledTime>
            </trias:ServiceDeparture>
          </trias:LegBoard>
          <trias:LegAlight>
            <trias:StopPointRef>at:46:6056</trias:StopPointRef>
            <trias:StopPointName><trias:Text>Altersheimgasse</trias:Text></trias:StopPointName>
            <trias:ServiceArrival>
              <trias:TimetabledTime>2026-09-15T12:21:30Z</trias:TimetabledTime>
            </trias:ServiceArrival>
          </trias:LegAlight>
          <trias:Service>
            <trias:PublishedLineName><trias:Text>12</trias:Text></trias:PublishedLineName>
            <trias:DestinationText><trias:Text>Bruck/Mur Murinsel</trias:Text></trias:DestinationText>
          </trias:Service>
        </trias:TimedLeg>
      </trias:TripLeg>
    </trias:Trip>
  </trias:TripResult>
</trias:Trias>`;

const SAMPLE_CANCELLED = `<?xml version="1.0"?>
<trias:Trias xmlns:trias="http://www.vdv.de/trias">
  <trias:TripResult>
    <trias:Trip>
      <trias:Interchanges>0</trias:Interchanges>
      <trias:TripLeg>
        <trias:TimedLeg>
          <trias:LegBoard>
            <trias:StopPointRef>at:46:6005</trias:StopPointRef>
            <trias:StopPointName><trias:Text>Europaplatz</trias:Text></trias:StopPointName>
            <trias:ServiceDeparture>
              <trias:TimetabledTime>2026-09-15T12:05:00Z</trias:TimetabledTime>
            </trias:ServiceDeparture>
          </trias:LegBoard>
          <trias:LegAlight>
            <trias:StopPointRef>at:46:30537</trias:StopPointRef>
            <trias:StopPointName><trias:Text>Einkaufszentrum</trias:Text></trias:StopPointName>
            <trias:ServiceArrival>
              <trias:TimetabledTime>2026-09-15T12:17:00Z</trias:TimetabledTime>
            </trias:ServiceArrival>
          </trias:LegAlight>
          <trias:Service>
            <trias:Cancelled>true</trias:Cancelled>
            <trias:PublishedLineName><trias:Text>1</trias:Text></trias:PublishedLineName>
            <trias:DestinationText><trias:Text>Apfelmoar Einkaufszentrum</trias:Text></trias:DestinationText>
          </trias:Service>
        </trias:TimedLeg>
      </trias:TripLeg>
    </trias:Trip>
  </trias:TripResult>
  <trias:TripResult>
    <trias:Trip>
      <trias:Interchanges>0</trias:Interchanges>
      <trias:TripLeg>
        <trias:TimedLeg>
          <trias:LegBoard>
            <trias:StopPointRef>at:46:6005</trias:StopPointRef>
            <trias:StopPointName><trias:Text>Europaplatz</trias:Text></trias:StopPointName>
            <trias:ServiceDeparture>
              <trias:TimetabledTime>2026-09-15T12:20:00Z</trias:TimetabledTime>
              <trias:EstimatedTime>2026-09-15T12:22:00Z</trias:EstimatedTime>
            </trias:ServiceDeparture>
          </trias:LegBoard>
          <trias:LegAlight>
            <trias:StopPointRef>at:46:30537</trias:StopPointRef>
            <trias:StopPointName><trias:Text>Einkaufszentrum</trias:Text></trias:StopPointName>
            <trias:ServiceArrival>
              <trias:TimetabledTime>2026-09-15T12:32:00Z</trias:TimetabledTime>
              <trias:EstimatedTime>2026-09-15T12:34:00Z</trias:EstimatedTime>
            </trias:ServiceArrival>
          </trias:LegAlight>
          <trias:Service>
            <trias:PublishedLineName><trias:Text>1</trias:Text></trias:PublishedLineName>
            <trias:DestinationText><trias:Text>Apfelmoar Einkaufszentrum</trias:Text></trias:DestinationText>
          </trias:Service>
        </trias:TimedLeg>
      </trias:TripLeg>
    </trias:Trip>
  </trias:TripResult>
</trias:Trias>`;

describe("TRIAS TripRequest builder", () => {
  it("builds TripRequest with IncludeRealtimeData and stop refs", () => {
    const xml = buildTriasTripRequest({
      originRef: HEIDI_ORIGIN_REF,
      destRef: HEIDI_DEST_REF,
      requestor: "OpenService",
      depArrTime: "2026-09-15T12:00:00Z",
    });
    expect(xml).toContain("<TripRequest>");
    expect(xml).toContain(`<StopPointRef>${HEIDI_ORIGIN_REF}</StopPointRef>`);
    expect(xml).toContain(`<StopPointRef>${HEIDI_DEST_REF}</StopPointRef>`);
    expect(xml).toContain("<IncludeRealtimeData>true</IncludeRealtimeData>");
    expect(xml).not.toContain("Authorization");
  });
});

describe("HEIDI connections", () => {
  it("parses Europaplatz → Apfelmoar Einkaufszentrum direct trip", () => {
    const trips = parseTriasTrips(SAMPLE_DIRECT);
    expect(trips).toHaveLength(1);
    expect(tripIsDirect(trips[0])).toBe(true);
    expect(trips[0].legs[0].line).toBe("1");
    expect(trips[0].legs[0].direction).toBe("Apfelmoar Einkaufszentrum");
    expect(trips[0].legs[0].to).toBe("Apfelmoar Einkaufszentrum");
  });

  it("selects up to 3 upcoming, skips past and cancelled, prefers realtime", () => {
    const now = new Date("2026-09-15T11:50:00Z");
    const past = parseTriasTrips(SAMPLE_DIRECT.replaceAll("12:", "10:"));
    const cancelledBundle = parseTriasTrips(SAMPLE_CANCELLED);
    const later = parseTriasTrips(
      SAMPLE_DIRECT.replaceAll("12:00", "12:40").replaceAll("12:12", "12:52"),
    );
    const more = parseTriasTrips(
      SAMPLE_DIRECT.replaceAll("12:00", "12:55").replaceAll("12:12", "13:07"),
    );

    expect(tripHasCancelledLeg(cancelledBundle[0])).toBe(true);

    const selected = selectUpcomingConnections(
      [...past, ...cancelledBundle, ...later, ...more],
      { now, limit: 3, walkToStopMinutes: 8, preferDirect: true },
    );

    expect(selected.length).toBeLessThanOrEqual(3);
    expect(selected.every((c) => !c.cancelled)).toBe(true);
    // past 10:00 filtered
    expect(selected.every((c) => c.departure !== "10:00")).toBe(true);
    // cancelled 12:05 skipped — next is realtime 12:22
    expect(selected[0]?.departure).toBe("12:22");
    expect(selected[0]?.realtime).toBe(true);
    expect(selected[0]?.delayMinutes).toBe(2);
  });

  it("findEarliestCancelledConnection surfaces TRIAS cancel without inventing", () => {
    const now = new Date("2026-09-15T11:50:00Z");
    const cancelledBundle = parseTriasTrips(SAMPLE_CANCELLED);
    const found = findEarliestCancelledConnection(cancelledBundle, {
      now,
      walkToStopMinutes: 8,
    });
    expect(found).not.toBeNull();
    expect(found?.cancelled).toBe(true);
    expect(found?.departure).toBe("12:05");
    expect(found?.lineSummary).toBe("1");
  });

  it("includeCancelled maps cancelled trip instead of dropping it", () => {
    const trips = parseTriasTrips(SAMPLE_CANCELLED);
    const dropped = connectionFromParsedTrip(trips[0], {});
    expect(dropped).toBeNull();
    const kept = connectionFromParsedTrip(trips[0], { includeCancelled: true });
    expect(kept?.cancelled).toBe(true);
    expect(kept?.departure).toBe("12:05");
  });

  it("computes leaveHome = departure − walk minutes", () => {
    const { leaveHome, walkConfigured } = computeLeaveHome("12:00", 8);
    expect(walkConfigured).toBe(true);
    expect(leaveHome).toBe("11:52");
  });

  it("does not invent walk minutes when not configured", () => {
    const { leaveHome, walkConfigured } = computeLeaveHome("12:00", null);
    expect(walkConfigured).toBe(false);
    expect(leaveHome).toBe("12:00");
  });

  it("extends arrival when trailing TRIAS walk leg lacks timestamps", () => {
    const SAMPLE_TRAILING_WALK = `<?xml version="1.0"?>
<trias:Trias xmlns:trias="http://www.vdv.de/trias">
  <trias:TripResult>
    <trias:Trip>
      <trias:Interchanges>0</trias:Interchanges>
      <trias:TripLeg>
        <trias:TimedLeg>
          <trias:LegBoard>
            <trias:StopPointRef>at:46:6005</trias:StopPointRef>
            <trias:StopPointName><trias:Text>Europaplatz</trias:Text></trias:StopPointName>
            <trias:ServiceDeparture>
              <trias:TimetabledTime>2026-09-15T12:00:00Z</trias:TimetabledTime>
            </trias:ServiceDeparture>
          </trias:LegBoard>
          <trias:LegAlight>
            <trias:StopPointRef>at:46:7893</trias:StopPointRef>
            <trias:StopPointName><trias:Text>Viktor-Adler-Straße</trias:Text></trias:StopPointName>
            <trias:ServiceArrival>
              <trias:TimetabledTime>2026-09-15T12:12:00Z</trias:TimetabledTime>
            </trias:ServiceArrival>
          </trias:LegAlight>
          <trias:Service>
            <trias:PublishedLineName><trias:Text>180</trias:Text></trias:PublishedLineName>
            <trias:DestinationText><trias:Text>Kindberg</trias:Text></trias:DestinationText>
          </trias:Service>
        </trias:TimedLeg>
      </trias:TripLeg>
      <trias:TripLeg>
        <trias:ContinuousLeg>
          <trias:LegStart>
            <trias:StopPointRef>at:46:7893</trias:StopPointRef>
            <trias:LocationName><trias:Text>Viktor-Adler-Straße</trias:Text></trias:LocationName>
          </trias:LegStart>
          <trias:LegEnd>
            <trias:StopPointRef>at:46:30537</trias:StopPointRef>
            <trias:LocationName><trias:Text>Einkaufszentrum</trias:Text></trias:LocationName>
          </trias:LegEnd>
          <trias:Duration>PT5M</trias:Duration>
          <trias:ContinuousService>
            <trias:IndividualTransport>
              <trias:Mode>walk</trias:Mode>
            </trias:IndividualTransport>
          </trias:ContinuousService>
        </trias:ContinuousLeg>
      </trias:TripLeg>
    </trias:Trip>
  </trias:TripResult>
</trias:Trias>`;
    const trips = parseTriasTrips(SAMPLE_TRAILING_WALK);
    const conn = connectionFromParsedTrip(trips[0], {
      walkToStopMinutes: 8,
      now: new Date("2026-09-15T11:50:00Z"),
    });
    expect(conn).not.toBeNull();
    expect(conn!.arrival).toBe("12:17");
    const walk = conn!.legs.find((l) => l.type === "WALK");
    expect(walk?.arrival).toBe("12:17");
    expect(walk?.durationMinutes).toBe(5);
  });

  it("prioritizes direct line among same departure window", () => {
    const now = new Date("2026-09-15T11:50:00Z");
    const direct = parseTriasTrips(SAMPLE_DIRECT);
    const multi = parseTriasTrips(SAMPLE_MULTI);
    // force same departure time on multi
    const selected = selectUpcomingConnections([...multi, ...direct], {
      now,
      limit: 3,
      walkToStopMinutes: 8,
      preferDirect: true,
    });
    expect(selected[0]?.isDirect).toBe(true);
    expect(selected[0]?.lineSummary).toBe("1");
  });
});

describe("BIRGIT multi-leg + Pflegeverband end destination", () => {
  it("keeps Altersheimgasse as transit; Pflegeverband as end label via config walk", () => {
    const trips = parseTriasTrips(SAMPLE_MULTI);
    const base = connectionFromParsedTrip(trips[0], {
      walkToStopMinutes: 12,
      now: new Date("2026-09-15T11:50:00Z"),
    });
    expect(base).not.toBeNull();
    expect(base!.legs.some((l) => l.to === "Altersheimgasse")).toBe(true);
    expect(
      base!.legs.some((l) => l.to === BIRGIT_END_DESTINATION_LABEL),
    ).toBe(false);

    const withWalk = appendConfiguredFinalWalk(base!, {
      endDestinationLabel: BIRGIT_END_DESTINATION_LABEL,
      stopToWorkMinutes: 8,
      transitStopLabel: BIRGIT_TRANSIT_STOP_LABEL,
    });

    const last = withWalk.legs[withWalk.legs.length - 1];
    expect(last.type).toBe("WALK");
    expect(last.to).toBe(BIRGIT_END_DESTINATION_LABEL);
    expect(last.from).toBe(BIRGIT_TRANSIT_STOP_LABEL);
    expect(last.timingSource).toBe("config");
    expect(last.durationMinutes).toBe(8);
    // no invented TRIAS footpath without config
    const noWalk = appendConfiguredFinalWalk(base!, {
      endDestinationLabel: BIRGIT_END_DESTINATION_LABEL,
      stopToWorkMinutes: 0,
      transitStopLabel: BIRGIT_TRANSIT_STOP_LABEL,
    });
    expect(noWalk.legs.every((l) => l.timingSource !== "config")).toBe(true);
  });

  it("supports alternative multi-leg route existence", () => {
    const now = new Date("2026-09-15T11:50:00Z");
    const a = parseTriasTrips(SAMPLE_MULTI);
    const b = parseTriasTrips(
      SAMPLE_MULTI.replaceAll("12:00", "12:30").replaceAll("12:14", "12:44").replaceAll("12:17", "12:47").replaceAll("12:21", "12:51"),
    );
    const selected = selectUpcomingConnections([...a, ...b], {
      now,
      limit: 2,
      walkToStopMinutes: 12,
      preferDirect: false,
    });
    expect(selected.length).toBe(2);
    expect(selected[0].transfers).toBe(1);
    expect(selected[1].departure).not.toBe(selected[0].departure);
  });
});
