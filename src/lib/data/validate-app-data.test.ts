import { describe, expect, it } from "vitest";
import { validateAppDataImport } from "@/lib/data/validate-app-data";

describe("validateAppDataImport avatarImageUrl", () => {
  it("accepts a local /avatars path and a data:image URL", () => {
    const result = validateAppDataImport({
      version: 3,
      persons: [{ id: "levi", avatarImageUrl: "/avatars/levi.jpg" }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.persons.find((p) => p.id === "levi")?.avatarImageUrl).toBe(
        "/avatars/levi.jpg",
      );
    }
  });

  it("rejects external and javascript: URLs, keeping no override", () => {
    const external = validateAppDataImport({
      version: 3,
      persons: [{ id: "birgit", avatarImageUrl: "https://evil.example/x.jpg" }],
    });
    expect(external.ok).toBe(true);
    if (external.ok) {
      expect(
        external.data.persons.find((p) => p.id === "birgit")?.avatarImageUrl,
      ).toBeUndefined();
    }

    const js = validateAppDataImport({
      version: 3,
      persons: [{ id: "heidi", avatarImageUrl: "javascript:alert(1)" }],
    });
    expect(js.ok).toBe(true);
    if (js.ok) {
      expect(
        js.data.persons.find((p) => p.id === "heidi")?.avatarImageUrl,
      ).toBeUndefined();
    }
  });
});
