"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import { PersonDashboard } from "@/components/person-dashboard";
import { isPersonId, useAppData } from "@/components/providers/data-provider";
import { buildTodayView } from "@/lib/today";
import { useNow } from "@/hooks/use-now";

type PersonPageProps = {
  params: Promise<{ id: string }>;
};

export default function PersonPage({ params }: PersonPageProps) {
  const { id } = use(params);
  const { getPerson } = useAppData();
  const now = useNow(30_000);

  if (!isPersonId(id)) notFound();
  const person = getPerson(id);
  if (!person) notFound();

  const view = buildTodayView(person, now);

  return (
    <main>
      <PersonDashboard view={view} />
    </main>
  );
}
