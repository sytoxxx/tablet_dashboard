import { notFound } from "next/navigation";
import { PersonDashboard } from "@/components/person-dashboard";
import { getPerson, isPersonId, profiles } from "@/data/profiles";

type PersonPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return profiles.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PersonPageProps) {
  const { id } = await params;
  const person = getPerson(id);
  return {
    title: person ? `${person.displayName} · Coffee Morning` : "Nicht gefunden",
  };
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { id } = await params;
  if (!isPersonId(id)) notFound();
  const person = getPerson(id);
  if (!person) notFound();

  return (
    <main>
      <PersonDashboard person={person} />
    </main>
  );
}
