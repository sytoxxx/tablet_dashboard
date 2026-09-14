"use client";

import { useMemo } from "react";
import type { DayIntelligenceView } from "@/lib/day/intelligence";
import type { PersonProfile } from "@/lib/types";
import { LeviMorningDashboard } from "@/components/person/levi-morning-dashboard";
import { SimpleMorningDashboard } from "@/components/person/simple-morning-dashboard";
import { useBusLive } from "@/hooks/use-bus-live";
import { useWeatherLive } from "@/hooks/use-weather-live";
import { MorningSkeleton } from "@/components/shared/skeleton";
import { DEFAULT_TRANSIT_PREFS } from "@/lib/data/defaults";

/** Routes each person to their Phase-6/7 morning layout with live bus/weather. */
export function PersonDashboard({
  view,
  wallNow,
  person,
}: {
  view: DayIntelligenceView;
  wallNow: Date;
  person: PersonProfile;
}) {
  const bus = useBusLive(person);
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

  const liveMeta = {
    busMessage: bus.message,
    busEmptyTitle: bus.emptyTitle,
    busUpcoming: bus.upcoming,
    busMatched: bus.matchedToWork,
    busArrivesInTime: bus.arrivesInTime,
    busFetchedAt: bus.fetchedAt,
    busIsTestData: bus.isTestData,
    busEnabled,
    busOffline: bus.offline,
    busUnavailable: bus.unavailable,
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
        view={liveView}
        wallNow={wallNow}
        busMessage={liveMeta.busMessage}
        busEmptyTitle={liveMeta.busEmptyTitle}
        busUpcoming={liveMeta.busUpcoming}
        busMatched={liveMeta.busMatched}
        busIsTestData={liveMeta.busIsTestData}
        busEnabled={liveMeta.busEnabled}
        busOffline={liveMeta.busOffline}
        busUnavailable={liveMeta.busUnavailable}
        weatherPlace={liveMeta.weatherPlace}
      />
    );
  }
  if (view.id === "birgit") {
    return (
      <SimpleMorningDashboard
        view={liveView}
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
        weatherPlace={liveMeta.weatherPlace}
      />
    );
  }
  return (
    <SimpleMorningDashboard
      view={liveView}
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
      weatherPlace={liveMeta.weatherPlace}
    />
  );
}
