"use client";

import { notFound, useRouter } from "next/navigation";
import { use, useMemo } from "react";
import { PersonDashboard } from "@/components/person-dashboard";
import { isPersonId, useAppData } from "@/components/providers/data-provider";
import { useDevTime } from "@/components/providers/dev-time-provider";
import { buildDayIntelligence } from "@/lib/day/intelligence";
import { useSwipe } from "@/hooks/use-swipe";
import { setActivePersonId } from "@/lib/profile/active-person";
import { withoutDemoTimetable } from "@/lib/school/demo-timetable";
import { withUntisSchool } from "@/lib/school/school-day";
import { useUntis } from "@/components/providers/untis-provider";
import type { PersonId } from "@/lib/types";

type PersonPageProps = {
  params: Promise<{ id: string }>;
};

/** Swipe order on the dashboard — left goes forward, right goes back. */
const SWIPE_ORDER: PersonId[] = ["levi", "birgit", "heidi"];

export default function PersonPage({ params }: PersonPageProps) {
  const { id } = use(params);
  const { getPerson } = useAppData();
  const { now } = useDevTime();
  const untis = useUntis();
  const router = useRouter();

  const swipeTo = (delta: 1 | -1) => {
    if (!isPersonId(id)) return;
    const index = SWIPE_ORDER.indexOf(id);
    const next = SWIPE_ORDER[(index + delta + SWIPE_ORDER.length) % SWIPE_ORDER.length]!;
    setActivePersonId(next); // a deliberate swipe is a manual pick, same as tapping a tile
    router.push(`/person/${next}`);
  };
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => swipeTo(1),
    onSwipeRight: () => swipeTo(-1),
  });

  if (!isPersonId(id)) notFound();
  const stored = getPerson(id);
  if (!stored) notFound();
  // The shipped example timetable is not real data — never show it as Levi's school day.
  // Real WebUntis days (if connected) are layered over the manual plan; nothing is saved from this copy.
  const person = useMemo(
    () => withUntisSchool(withoutDemoTimetable(stored), untis.snapshot, now),
    [stored, untis.snapshot, now],
  );

  const view = useMemo(() => buildDayIntelligence(person, now), [person, now]);

  return (
    <main {...swipeHandlers}>
      <PersonDashboard view={view} wallNow={now} person={person} />
    </main>
  );
}
