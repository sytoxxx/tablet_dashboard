"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import { WardrobeScreen } from "@/components/person/wardrobe-screen";
import { isPersonId, useAppData } from "@/components/providers/data-provider";

type Props = {
  params: Promise<{ id: string }>;
};

export default function WardrobePage({ params }: Props) {
  const { id } = use(params);
  const { getPerson } = useAppData();

  if (!isPersonId(id)) notFound();
  const person = getPerson(id);
  if (!person) notFound();

  return <WardrobeScreen personId={person.id} personName={person.name} />;
}
