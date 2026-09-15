"use client";

import { useMemo, useState } from "react";
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
import { useSchoolJarvisLive } from "@/hooks/use-school-jarvis-live";
import { MorningSkeleton } from "@/components/shared/skeleton";
import { useLeaveReminder } from "@/hooks/use-leave-reminder";
import { useWardrobe } from "@/hooks/use-wardrobe";
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
  const schoolJarvis = useSchoolJarvisLive(person.id);
  const { catalog: digitalWardrobe, replaceCatalog } = useWardrobe(person.id);
  const [excludeCombinationKey, setExcludeCombinationKey] = useState<string | null>(null);
  const busEnabled =
    (person.transitPrefs?.enabled ?? DEFAULT_TRANSIT_PREFS.enabled) !== false &&
    person.displayPrefs?.showBus !== false;

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
          busIsTestData: bus.isTestData,
          travelPlan: bus.workTravel
            ? {
                applicable: true,
                mode: bus.workTravel.mode ?? "bus",
                destinationLabel: bus.workTravel.destinationLabel ?? null,
                endDestinationLabel:
                  bus.workTravel.endDestinationLabel ??
                  bus.workTravel.destinationLabel ??
                  null,
                transitDestinationLabel:
                  bus.workTravel.transitDestinationLabel ?? null,
                arrivalTarget:
                  bus.workTravel.arrivalTarget ?? bus.workTravel.workStart,
                arrivalTargetEnd: bus.workTravel.arrivalTargetEnd ?? null,
                workStart: bus.workTravel.workStart,
                workEnd: bus.workTravel.workEnd,
                leaveHome: bus.workTravel.leaveHome,
                busDeparture: bus.workTravel.busDeparture,
                arrivalAtDestination:
                  bus.workTravel.arrivalAtWork ??
                  bus.workTravel.arrivalAtDestination ??
                  null,
                arrivalAtWork: bus.workTravel.arrivalAtWork,
                preparationStart: bus.workTravel.preparationStart,
                status: bus.workTravel.status,
                isTestData: bus.workTravel.isTestData,
                matched: bus.workTravel.matched,
                message: bus.workTravel.message,
                bus: bus.next,
                travelMinutes: bus.workTravel.travelMinutes ?? 0,
                walkToStopMinutes: bus.workTravel.walkToStopMinutes ?? 0,
                stopToWorkMinutes: bus.workTravel.stopToWorkMinutes ?? 0,
                preparationMinutes: bus.workTravel.preparationMinutes ?? 0,
                safetyBufferMinutes: bus.workTravel.safetyBufferMinutes ?? 5,
                legs: bus.workTravel.legs,
                connections: bus.workTravel.connections,
                alternativeConnection: bus.workTravel.alternativeConnection,
              }
            : null,
        },
        digitalWardrobe,
        excludeCombinationKey,
      }),
    [
      person,
      wallNow,
      data,
      liveView,
      bus.matchedToWork,
      busEnabled,
      bus.isTestData,
      bus.workTravel,
      bus.next,
      digitalWardrobe,
      excludeCombinationKey,
    ],
  );

  const overviewView = useMemo(
    () => applyOverviewToDayView(liveView, overview, wallNow),
    [liveView, overview, wallNow],
  );

  const leaveReminder = useLeaveReminder({
    personId: person.id,
    wallNow,
    travel: overview.travelPlan,
    timeline: overview.timeline,
    prefs: {
      enabled: person.personalSettings?.leaveReminderEnabled,
      volume: person.personalSettings?.leaveReminderVolume,
    },
  });

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
    leaveReminderActive:
      leaveReminder.inCueWindow && leaveReminder.enabled,
    leaveReminderLabel: "Erinnerung aktiviert",
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
        schoolJarvisSummary={schoolJarvis.summary}
        schoolJarvisHandoffUrl={schoolJarvis.handoffUrl}
        leaveReminderActive={liveMeta.leaveReminderActive}
        leaveReminderLabel={liveMeta.leaveReminderLabel}
      digitalWardrobe={digitalWardrobe}
      onExcludeCombination={setExcludeCombinationKey}
      onWardrobeChange={replaceCatalog}
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
        workTravel={bus.workTravel}
        workWeek={
          person.schedule.type === "work" ? person.schedule.week : null
        }
        leaveReminderActive={liveMeta.leaveReminderActive}
        leaveReminderLabel={liveMeta.leaveReminderLabel}
      digitalWardrobe={digitalWardrobe}
      onExcludeCombination={setExcludeCombinationKey}
      onWardrobeChange={replaceCatalog}
      />
    );
  }
  return (
    <SimpleMorningDashboard
      view={overviewView}
      overview={overview}
      wallNow={wallNow}
      mode={person.schedule.type === "work" ? "work" : "personal"}
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
      workTravel={bus.workTravel}
      workWeek={
        person.schedule.type === "work" ? person.schedule.week : null
      }
      leaveReminderActive={liveMeta.leaveReminderActive}
      leaveReminderLabel={liveMeta.leaveReminderLabel}
    digitalWardrobe={digitalWardrobe}
    onExcludeCombination={setExcludeCombinationKey}
    onWardrobeChange={replaceCatalog}
    />
  );
}
