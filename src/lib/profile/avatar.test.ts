import { describe, expect, it } from "vitest";
import { personAvatarSrc } from "@/lib/profile/avatar";

describe("personAvatarSrc", () => {
  it("falls back to the built-in default photo per person", () => {
    expect(personAvatarSrc({ id: "levi" })).toBe("/avatars/levi.jpg");
    expect(personAvatarSrc({ id: "birgit" })).toBe("/avatars/birgit.jpg");
    expect(personAvatarSrc({ id: "heidi" })).toBe("/avatars/heidi.jpg");
  });

  it("prefers a custom avatarImageUrl when set", () => {
    expect(
      personAvatarSrc({ id: "levi", avatarImageUrl: "data:image/png;base64,abc" }),
    ).toBe("data:image/png;base64,abc");
  });
});
