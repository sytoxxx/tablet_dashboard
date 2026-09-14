"use client";

import type { DayIntelligenceView } from "@/lib/day/intelligence";
import { IntelligentDayDashboard } from "@/components/person/intelligent-day-dashboard";

/** Shared day intelligence for Levi / Birgit / Heidi. */
export function PersonDashboard({
  view,
  wallNow,
}: {
  view: DayIntelligenceView;
  wallNow: Date;
}) {
  return <IntelligentDayDashboard view={view} wallNow={wallNow} />;
}
