"use client";

import { useMemo } from "react";
import type { DayIntelligenceView } from "@/lib/day/intelligence";
import type { PersonProfile } from "@/lib/types";
import {
  applyOverviewToDayView,
  getMorningOverview,
} from "@/lib/morning/overview";
import { LeviMorningDashboard } from "@/components/person/levi-morning-dashboard";
import { SimpleMorningDashboard } from "@/components/person/simple-morning-dashboard";
import { useBusLive } from "@/hooks/use-bus-live";
import { useWeatherLive } from "@/hooks/use-weather-live";
import { MorningSkeleton } from "@/components/shared/skeleton";
import { DEFAULT_TRANSIT_PREFS } from "@/lib/data/defaults";
import { useAppData } from "@/components/providers/data-provider";

/** Routes each person to their morning layout with live bus/weather + Phase-9 overview. */
export function PersonDashboard({
  view,
  wallNow,
  person,
}: {
  view: DayIntelligenceView;
  wallNow: Date;
  person: PersonProfile;
}) {
  const { data } = useAppData();
  const bus = useBusLive(person, {
    regionPreferredProvider: data.region?.preferredBusProvider ?? null,
  });
  const weather = useWeatherLive(person);
  const busEnabled =
    (person.transitPrefs?.enabled ?? DEFAULT_TRANSIT_PREFS.enabled) !== false;

  const liveView = useMemo<DayIntelligenceView>(() => {
    return {
      ...view,
      nextBus: busEnabled ? (bus.next ?? view.nextBus) : null,
      busStopName: busEnabled ? (bus.stopName ?? view.busStopName) : null,
      weather: weather.weather ?? view.weather,
    };
  }, [view, bus.next, bus.stopName, weather.weather, busEnabled]);

  const overview = useMemo(
    () =>
      getMorningOverview(person.id, wallNow, {
        person,
        data,
        dayView: liveView,
        live: {
          bus: busEnabled ? liveView.nextBus : null,
          weather: liveView.weather,
          busMatched: bus.matchedToWork,
          busEnabled,
        },
      }),
    [person, wallNow, data, liveView, bus.matchedToWork, busEnabled],
  );

  const overviewView = useMemo(
    () => applyOverviewToDayView(liveView, overview, wallNow),
    [liveView, overview, wallNow],
  );

  const liveMeta = {
    busMessage: bus.message,
    busEmptyTitle: bus.emptyTitle,
    busUpcoming: bus.upcoming,
    busMatched: bus.matchedToWork,
    busFetchedAt: bus.fetchedAt,
    busIsTestData: bus.isTestData,
    busEnabled,
    busOffline: bus.offline,
    busUnavailable: bus.unavailable,
    busDataAgeLabel: bus.dataAgeLabel,
    weatherPlace: weather.place,
    busLoading: bus.loading && !bus.fetchedAt,
    weatherLoading: weather.loading && !weather.fetchedAt,
  };

  if ((liveMeta.busLoading || liveMeta.weatherLoading) && !view.nextBus && !view.weather) {
    return <MorningSkeleton />;
  }

  if (view.id === "levi") {
    return (
      <LeviMorningDashboard
        view={overviewView}
        overview={overview}
        busMessage={liveMeta.busMessage}
        busEmptyTitle={liveMeta.busEmptyTitle}
        busUpcoming={liveMeta.busUpcoming}
        busMatched={liveMeta.busMatched}
        busIsTestData={liveMeta.busIsTestData}
        busEnabled={liveMeta.busEnabled}
        busOffline={liveMeta.busOffline}
        busUnavailable={liveMeta.busUnavailable}
        busDataAgeLabel={liveMeta.busDataAgeLabel}
        weatherPlace={liveMeta.weatherPlace}
      />
    );
  }
  if (view.id === "birgit") {
    return (
      <SimpleMorningDashboard
        view={overviewView}
        overview={overview}
        wallNow={wallNow}
        mode="work"
        simple
        busMessage={liveMeta.busMessage}
        busEmptyTitle={liveMeta.busEmptyTitle}
        busUpcoming={liveMeta.busUpcoming}
        busMatched={liveMeta.busMatched}
        busEnabled={liveMeta.busEnabled}
        busOffline={liveMeta.busOffline}
        busUnavailable={liveMeta.busUnavailable}
        busDataAgeLabel={liveMeta.busDataAgeLabel}
        weatherPlace={liveMeta.weatherPlace}
      />
    );
  }
  return (
    <SimpleMorningDashboard
      view={overviewView}
      overview={overview}
      wallNow={wallNow}
      mode="personal"
      simple
      busMessage={liveMeta.busMessage}
      busEmptyTitle={liveMeta.busEmptyTitle}
      busUpcoming={liveMeta.busUpcoming}
      busMatched={liveMeta.busMatched}
      busEnabled={liveMeta.busEnabled}
      busOffline={liveMeta.busOffline}
      busUnavailable={liveMeta.busUnavailable}
      busDataAgeLabel={liveMeta.busDataAgeLabel}
      weatherPlace={liveMeta.weatherPlace}
    />
  );
}
