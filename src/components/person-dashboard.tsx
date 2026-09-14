"use client";

import type { DayIntelligenceView } from "@/lib/day/intelligence";
import { LeviMorningDashboard } from "@/components/person/levi-morning-dashboard";
import { SimpleMorningDashboard } from "@/components/person/simple-morning-dashboard";

/** Routes each person to their Phase-6 morning layout. */
export function PersonDashboard({
  view,
  wallNow,
}: {
  view: DayIntelligenceView;
  wallNow: Date;
}) {
  if (view.id === "levi") {
    return <LeviMorningDashboard view={view} wallNow={wallNow} />;
  }
  if (view.id === "birgit") {
    return <SimpleMorningDashboard view={view} wallNow={wallNow} mode="work" />;
  }
  return <SimpleMorningDashboard view={view} wallNow={wallNow} mode="personal" />;
}
