/**
 * Confirm-only wardrobe writes — drafts never persist without explicit save.
 */
import {
  draftToItem,
  type WardrobeCatalog,
  type WardrobeImportDraft,
  type WardrobeItem,
} from "@/lib/wardrobe/model";
import { newWardrobeItemId } from "@/lib/wardrobe/store";

export type ConfirmWardrobeSaveResult =
  | { ok: true; item: WardrobeItem; catalog: WardrobeCatalog }
  | { ok: false; reason: "incomplete" | "person_mismatch"; message: string };

export function validateImportDraft(
  draft: WardrobeImportDraft,
): { ok: true } | { ok: false; message: string } {
  if (!draft.name.trim() && draft.garmentKind === "other") {
    return { ok: false, message: "Bitte Name oder Kategorie setzen." };
  }
  if (!draft.name.trim() && draft.color === "unknown") {
    // Allow save with kind-only name fallback, but encourage color.
    return { ok: true };
  }
  return { ok: true };
}

/**
 * Persist a draft only after explicit user confirmation.
 */
export function confirmSaveWardrobeItem(input: {
  draft: WardrobeImportDraft;
  catalog: WardrobeCatalog;
  nowIso?: string;
  id?: string;
}): ConfirmWardrobeSaveResult {
  const { draft, catalog } = input;
  if (draft.personId !== catalog.personId) {
    return {
      ok: false,
      reason: "person_mismatch",
      message: "Person stimmt nicht überein.",
    };
  }
  const valid = validateImportDraft(draft);
  if (!valid.ok) {
    return { ok: false, reason: "incomplete", message: valid.message };
  }

  const nowIso = input.nowIso ?? new Date().toISOString();
  const item = draftToItem(draft, input.id ?? newWardrobeItemId(), nowIso);
  const next: WardrobeCatalog = {
    personId: catalog.personId,
    items: [...catalog.items, item],
    updatedAt: nowIso,
  };
  return { ok: true, item, catalog: next };
}

/**
 * Apply edits to a draft before save — still not persisted.
 */
export function applyDraftEdits(
  draft: WardrobeImportDraft,
  edits: Partial<WardrobeImportDraft>,
): WardrobeImportDraft {
  return {
    ...draft,
    ...edits,
    personId: draft.personId,
    source: "manual",
  };
}
