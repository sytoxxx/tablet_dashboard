"use client";

import type { TodayView } from "@/lib/types";
import { LeviDashboard } from "@/components/person/levi-dashboard";
import { BirgitDashboard } from "@/components/person/birgit-dashboard";
import { HeidiDashboard } from "@/components/person/heidi-dashboard";

export function PersonDashboard({ view }: { view: TodayView }) {
  if (view.scheduleType === "school") return <LeviDashboard view={view} />;
  if (view.scheduleType === "work") return <BirgitDashboard view={view} />;
  return <HeidiDashboard view={view} />;
}
