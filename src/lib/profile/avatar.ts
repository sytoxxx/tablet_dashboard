import type { PersonId, PersonProfile } from "@/lib/types";

/** Built-in profile photos — bundled assets, never an external URL. */
const DEFAULT_AVATAR_SRC: Record<PersonId, string> = {
  levi: "/avatars/levi.jpg",
  birgit: "/avatars/birgit.jpg",
  heidi: "/avatars/heidi.jpg",
};

/** Photo to show for a person — their own set image first, otherwise the built-in default. */
export function personAvatarSrc(
  person: Pick<PersonProfile, "id" | "avatarImageUrl">,
): string {
  return person.avatarImageUrl || DEFAULT_AVATAR_SRC[person.id];
}
