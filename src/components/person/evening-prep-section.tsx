"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { EveningPrep } from "@/lib/evening/prep";
import {
  eveningChecklistStorageKey,
  type EveningChecklistKey,
} from "@/lib/evening/checklist";
import { Section } from "@/components/section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WardrobeCatalog } from "@/lib/wardrobe/model";
import { markOutfitWorn, buildRejectionSignal } from "@/lib/wardrobe/worn";

function readChecklist(
  personId: string,
  date: string,
): Partial<Record<EveningChecklistKey, boolean>> {
  try {
    const raw = localStorage.getItem(
      eveningChecklistStorageKey(personId as never, date),
    );
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<EveningChecklistKey, boolean>>;
  } catch {
    return {};
  }
}

/**
 * Evening prep for tomorrow — known plan data + wardrobe confirm/alternative.
 */
export function EveningPrepSection({
  prep,
  simple = false,
  digitalWardrobe = null,
  onExcludeCombination,
  onWardrobeChange,
}: {
  prep: EveningPrep | null;
  simple?: boolean;
  digitalWardrobe?: WardrobeCatalog | null;
  /** Request another outfit by excluding the current combination key. */
  onExcludeCombination?: (combinationKey: string) => void;
  onWardrobeChange?: (catalog: WardrobeCatalog) => void;
}) {
  if (!prep) return null;
  return (
    <EveningPrepBody
      key={`${prep.personId}-${prep.date}-${prep.pickedOutfit?.combinationKey ?? "none"}`}
      prep={prep}
      simple={simple}
      digitalWardrobe={digitalWardrobe}
      onExcludeCombination={onExcludeCombination}
      onWardrobeChange={onWardrobeChange}
    />
  );
}

function EveningPrepBody({
  prep,
  simple,
  digitalWardrobe,
  onExcludeCombination,
  onWardrobeChange,
}: {
  prep: EveningPrep;
  simple: boolean;
  digitalWardrobe: WardrobeCatalog | null;
  onExcludeCombination?: (combinationKey: string) => void;
  onWardrobeChange?: (catalog: WardrobeCatalog) => void;
}) {
  const [checked, setChecked] = useState(() =>
    readChecklist(prep.personId, prep.date),
  );
  const [confirmed, setConfirmed] = useState(false);
  const [worn, setWorn] = useState(false);

  const checklist = prep.checklist.map((item) => ({
    ...item,
    done: Boolean(checked[item.key] ?? item.done),
  }));
  const complete =
    checklist.some((i) => i.relevant) &&
    checklist.filter((i) => i.relevant).every((i) => i.done);

  const outfitLines = useMemo(() => {
    if (prep.pickedOutfit?.pieces.length) {
      return prep.pickedOutfit.pieces.map((p) => {
        if (p.item) return p.item.name;
        // Short glance label — never the long "füge dem Kleiderschrank hinzu" prompt.
        return p.label;
      });
    }
    const outfitItem = prep.items.find((i) => i.kind === "outfit");
    return outfitItem?.items ?? [];
  }, [prep]);

  function toggle(key: EveningChecklistKey) {
    setChecked((prev) => {
      const next = { ...prev, [key]: !Boolean(prev[key]) };
      try {
        localStorage.setItem(
          eveningChecklistStorageKey(prep.personId, prep.date),
          JSON.stringify(next),
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function confirmOutfit() {
    setConfirmed(true);
    setChecked((prev) => {
      const next = { ...prev, outfit: true };
      try {
        localStorage.setItem(
          eveningChecklistStorageKey(prep.personId, prep.date),
          JSON.stringify(next),
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function requestAlternative() {
    if (!prep.pickedOutfit) return;
    // Soft preference signal only — never deletes wardrobe items.
    buildRejectionSignal(prep.pickedOutfit);
    onExcludeCombination?.(prep.pickedOutfit.combinationKey);
  }

  function markWorn() {
    if (!prep.pickedOutfit || !digitalWardrobe || worn) return;
    const next = markOutfitWorn(
      digitalWardrobe,
      prep.pickedOutfit,
      prep.date,
    );
    onWardrobeChange?.(next);
    setWorn(true);
  }

  return (
    <Section title={prep.title} emphasis="secondary">
      {prep.banner ? (
        <p
          className={cn(
            "mb-4 font-medium text-[color:var(--ink)]",
            simple ? "text-lg" : "text-lg sm:text-xl",
          )}
        >
          {prep.banner}
        </p>
      ) : null}

      <ul className={simple ? "space-y-4" : "space-y-4 sm:space-y-5"}>
        {prep.items.map((item) => (
          <li key={item.kind} className="min-w-0">
            <p className="text-base text-[color:var(--quiet)]">{item.label}</p>
            {item.kind === "outfit" && outfitLines.length > 0 ? (
              <ul
                className={
                  simple
                    ? "mt-1 space-y-1 text-lg text-[color:var(--ink)]"
                    : "mt-1 space-y-1 text-lg sm:text-xl text-[color:var(--ink)]"
                }
              >
                {outfitLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p
                className={
                  simple
                    ? "mt-0.5 text-lg text-[color:var(--ink)]"
                    : "mt-0.5 text-lg sm:text-xl text-[color:var(--ink)]"
                }
              >
                {item.detail}
              </p>
            )}
            {item.kind !== "outfit" && item.items && item.items.length > 1 ? (
              <ul className="mt-1 space-y-0.5 text-base text-[color:var(--quiet)]">
                {item.items.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      {prep.pickedOutfit ? (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            size="lg"
            className="h-12 rounded-2xl"
            disabled={confirmed}
            onClick={confirmOutfit}
          >
            {confirmed ? "Vorbereitet" : "Vorbereiten"}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-12 rounded-2xl"
            onClick={requestAlternative}
          >
            Anderes Outfit
          </Button>
          {digitalWardrobe ? (
            <Button
              size="lg"
              variant="ghost"
              className="h-12 rounded-2xl"
              disabled={worn || !prep.pickedOutfit.pieces.some((p) => p.item)}
              onClick={markWorn}
            >
              {worn ? "Als getragen markiert" : "Getragen"}
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-base text-[color:var(--quiet)]">
          <Link
            href={`/person/${prep.personId}/kleiderschrank`}
            className="underline-offset-2 hover:underline"
          >
            Kleiderschrank einrichten
          </Link>
        </p>
      )}

      <div className="mt-6 border-t border-[color:var(--hairline)] pt-4">
        <p className="text-base text-[color:var(--quiet)]">Checkliste</p>
        {complete ? (
          <p className="mt-2 text-lg font-medium text-[color:var(--ink)]">
            ✓ Für morgen alles vorbereitet
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {checklist.map((item) => (
              <li key={item.key}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-lg text-[color:var(--ink)]">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggle(item.key)}
                    className="size-5 accent-[color:var(--brand)]"
                  />
                  <span>
                    {item.done ? "✓" : "☐"} {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
