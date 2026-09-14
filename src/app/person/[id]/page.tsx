"use client";

import { notFound } from "next/navigation";
import { use, useMemo } from "react";
import { PersonDashboard } from "@/components/person-dashboard";
import { isPersonId, useAppData } from "@/components/providers/data-provider";
import { useDevTime } from "@/components/providers/dev-time-provider";
import { buildDayIntelligence } from "@/lib/day/intelligence";

type PersonPageProps = {
  params: Promise<{ id: string }>;
};

export default function PersonPage({ params }: PersonPageProps) {
  const { id } = use(params);
  const { getPerson } = useAppData();
  const { now } = useDevTime();

  if (!isPersonId(id)) notFound();
  const person = getPerson(id);
  if (!person) notFound();

  const view = useMemo(() => buildDayIntelligence(person, now), [person, now]);

  return (
    <main>
      <PersonDashboard view={view} wallNow={now} />
    </main>
  );
}
