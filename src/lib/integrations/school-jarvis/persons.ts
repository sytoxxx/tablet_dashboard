import type { PersonId } from "@/lib/types";

/**
 * Default: only Levi may request School Jarvis data.
 * Server env SCHOOL_JARVIS_ALLOWED_PERSONS can extend later.
 * Shared constant so UI and server stay aligned without secrets.
 */
export const SCHOOL_JARVIS_DEFAULT_ALLOWED_PERSONS: readonly PersonId[] = [
  "levi",
];

export function isSchoolJarvisUiPerson(personId: PersonId): boolean {
  return SCHOOL_JARVIS_DEFAULT_ALLOWED_PERSONS.includes(personId);
}
