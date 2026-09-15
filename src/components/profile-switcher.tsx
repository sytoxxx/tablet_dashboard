"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { PersonId } from "@/lib/types";
import { isPersonId, useAppData } from "@/components/providers/data-provider";
import {
  getActivePersonId,
  setActivePersonId,
  subscribeActivePerson,
} from "@/lib/profile/active-person";
import { cn } from "@/lib/utils";

const LABELS: Record<PersonId, string> = {
  levi: "Levi",
  birgit: "Birgit",
  heidi: "Heidi",
};

function readActive(): PersonId | null {
  return getActivePersonId();
}

/**
 * Minimal global profile switcher — sets active personId and navigates
 * without remounting the whole app shell.
 */
export function ProfileSwitcher({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { data } = useAppData();
  const router = useRouter();
  const pathname = usePathname();
  const storedActive = useSyncExternalStore(
    subscribeActivePerson,
    readActive,
    () => null,
  );

  const pathMatch = pathname.match(/^\/person\/(levi|birgit|heidi)/);
  const pathId =
    pathMatch && isPersonId(pathMatch[1]) ? pathMatch[1] : null;
  const active = pathId ?? storedActive;

  const switchTo = useCallback(
    (id: PersonId) => {
      setActivePersonId(id);
      router.push(`/person/${id}`);
    },
    [router],
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        compact ? "justify-end" : "",
        className,
      )}
      role="navigation"
      aria-label="Profil wechseln"
    >
      {!compact ? (
        <span className="text-sm text-[color:var(--quiet)]">Profil:</span>
      ) : null}
      {data.persons.map((p) => {
        const id = p.id;
        if (!isPersonId(id)) return null;
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => switchTo(id)}
            className={cn(
              "min-h-10 rounded-xl px-3 text-base transition-colors",
              isActive
                ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                : "bg-[color:var(--surface)] text-[color:var(--ink)] hover:bg-[color:var(--surface-strong)]",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {LABELS[id]}
          </button>
        );
      })}
      <Link
        href="/"
        className="text-sm text-[color:var(--quiet)] underline-offset-2 hover:underline"
      >
        Wer bist du?
      </Link>
    </div>
  );
}
