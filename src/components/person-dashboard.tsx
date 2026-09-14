"use client";

import { useMemo } from "react";
import type { DayIntelligenceView } from "@/lib/day/intelligence";
import type { PersonProfile } from "@/lib/types";
import { LeviMorningDashboard } from "@/components/person/levi-morning-dashboard";
import { SimpleMorningDashboard } from "@/components/person/simple-morning-dashboard";
import { useBusLive } from "@/hooks/use-bus-live";
import { useWeatherLive } from "@/hooks/use-weather-live";
import { MorningSkeleton } from "@/components/shared/skeleton";

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

  const liveView = useMemo<DayIntelligenceView>(() => {
    return {
      ...view,
      nextBus: bus.next ?? view.nextBus,
      busStopName: bus.stopName ?? view.busStopName,
      weather: weather.weather ?? view.weather,
    };
  }, [view, bus.next, bus.stopName, weather.weather]);

  const liveMeta = {
    busMessage: bus.message,
    busUpcoming: bus.upcoming,
    busMatched: bus.matchedToWork,
    busFetchedAt: bus.fetchedAt,
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
        busUpcoming={liveMeta.busUpcoming}
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
        busUpcoming={liveMeta.busUpcoming}
        busMatched={liveMeta.busMatched}
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
      busUpcoming={liveMeta.busUpcoming}
      weatherPlace={liveMeta.weatherPlace}
    />
  );
}
