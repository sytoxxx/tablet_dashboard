import type { PersonDay, PersonId } from "@/lib/types";
import { birgitDay } from "@/data/persons/birgit";
import { heidiDay } from "@/data/persons/heidi";
import { leviDay } from "@/data/persons/levi";

export const profiles: PersonDay[] = [leviDay, birgitDay, heidiDay];

export function getPerson(id: string): PersonDay | undefined {
  return profiles.find((p) => p.id === id);
}

export function isPersonId(id: string): id is PersonId {
  return profiles.some((p) => p.id === id);
}
