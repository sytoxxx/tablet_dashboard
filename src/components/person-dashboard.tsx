import type { PersonDay } from "@/lib/types";
import { LeviDashboard } from "@/components/person/levi-dashboard";
import { BirgitDashboard } from "@/components/person/birgit-dashboard";
import { HeidiDashboard } from "@/components/person/heidi-dashboard";

export function PersonDashboard({ person }: { person: PersonDay }) {
  switch (person.id) {
    case "levi":
      return <LeviDashboard person={person} />;
    case "birgit":
      return <BirgitDashboard person={person} />;
    case "heidi":
      return <HeidiDashboard person={person} />;
    default: {
      const _exhaustive: never = person.id;
      return _exhaustive;
    }
  }
}
