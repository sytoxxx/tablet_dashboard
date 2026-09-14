"use client";

import { useState } from "react";
import type { EveningPrep } from "@/lib/evening/prep";
import {
  eveningChecklistStorageKey,
  type EveningChecklistKey,
} from "@/lib/evening/checklist";
import { Section } from "@/components/section";
import { cn } from "@/lib/utils";

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
 * Evening prep for tomorrow — known plan data only + personal checklist.
 */
export function EveningPrepSection({
  prep,
  simple = false,
}: {
  prep: EveningPrep | null;
  simple?: boolean;
}) {
  if (!prep) return null;
  return (
    <EveningPrepBody
      key={`${prep.personId}-${prep.date}`}
      prep={prep}
      simple={simple}
    />
  );
}

function EveningPrepBody({
  prep,
  simple,
}: {
  prep: EveningPrep;
  simple: boolean;
}) {
  const [checked, setChecked] = useState(() =>
    readChecklist(prep.personId, prep.date),
  );

  const checklist = prep.checklist.map((item) => ({
    ...item,
    done: Boolean(checked[item.key] ?? item.done),
  }));
  const complete =
    checklist.some((i) => i.relevant) &&
    checklist.filter((i) => i.relevant).every((i) => i.done);

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

  return (
    <Section title={prep.title}>
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
            <p
              className={
                simple
                  ? "mt-0.5 text-lg text-[color:var(--ink)]"
                  : "mt-0.5 text-lg sm:text-xl text-[color:var(--ink)]"
              }
            >
              {item.detail}
            </p>
            {item.items && item.items.length > 1 ? (
              <ul className="mt-1 space-y-0.5 text-base text-[color:var(--quiet)]">
                {item.items.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

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
