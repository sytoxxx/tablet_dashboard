"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileTile } from "@/components/profile-tile";
import { personAvatarSrc } from "@/lib/profile/avatar";
import { PrimaryNav } from "@/components/shared/primary-nav";
import { DaypartGreeting } from "@/components/shared/daypart-greeting";
import { useAppData } from "@/components/providers/data-provider";
import { useDevTime } from "@/components/providers/dev-time-provider";
import { OfflineBanner } from "@/components/admin/offline-banner";
import { Skeleton } from "@/components/shared/skeleton";
import { resolveAutoProfile } from "@/lib/profile/auto-select";
import { hasManualOverrideToday } from "@/lib/profile/active-person";
import { isAppHydrated } from "@/data/app-store";

const ADMIN_HOLD_MS = 2200;

/** Friendly role label under each name — no jargon. */
function roleHint(personId: string, fallback: string): string {
  if (personId === "levi") return "Schule";
  if (personId === "birgit" || personId === "heidi") return "Arbeit";
  return fallback;
}

export default function HomePage() {
  const { data } = useAppData();
  const router = useRouter();
  const { now } = useDevTime();
  const holdTimer = useRef<number | null>(null);
  const [adminHint, setAdminHint] = useState(false);

  // Auto-open the right profile from real schedule data — never while a
  // manual pick already stands for today, and never on any page but this
  // one, so an active session is never yanked to another profile mid-use.
  // Re-evaluates whenever `now` ticks (~every 30s) or the schedule changes,
  // so a tablet left open on this screen crosses 07:00/07:30/midnight cleanly.
  useEffect(() => {
    // Defer past the same-tick render churn around hydration (dev-mode
    // double-effects, useSyncExternalStore's post-subscribe re-check) so we
    // only ever act on the settled, real LocalStorage snapshot. A redirect
    // fired on a stale pre-hydration render can't be un-fired by the next,
    // correct render.
    const id = window.setTimeout(() => {
      if (!isAppHydrated()) return;
      if (!data.persons.length) return;
      if (hasManualOverrideToday(now)) return;
      const target = resolveAutoProfile(data.persons, now);
      if (target) router.replace(`/person/${target}`);
    }, 0);
    return () => window.clearTimeout(id);
  }, [data.persons, now, router]);

  const clearHold = useCallback(() => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  useEffect(() => () => clearHold(), [clearHold]);

  const startHold = useCallback(() => {
    clearHold();
    setAdminHint(true);
    holdTimer.current = window.setTimeout(() => {
      setAdminHint(false);
      router.push("/einstellungen");
    }, ADMIN_HOLD_MS);
  }, [clearHold, router]);

  const endHold = useCallback(() => {
    clearHold();
    setAdminHint(false);
  }, [clearHold]);

  if (!data.persons.length) {
    return (
      <main className="morning-shell mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center gap-6 px-5">
        <Skeleton className="h-16 w-2/3" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="min-h-40" />
          <Skeleton className="min-h-40" />
          <Skeleton className="min-h-40" />
        </div>
      </main>
    );
  }

  return (
    <main className="morning-shell relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center gap-10 px-5 py-10 sm:gap-12 sm:px-8 lg:px-10 landscape-tablet:gap-8 landscape-tablet:py-6">
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 left-4 z-10 sm:right-8 sm:left-8">
        <OfflineBanner />
      </div>

      <PrimaryNav className="absolute top-[max(1rem,env(safe-area-inset-top))] left-1/2 z-10 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 sm:left-8 sm:w-auto sm:max-w-none sm:translate-x-0" />

      <header className="animate-rise max-w-2xl space-y-4 pt-14 sm:pt-16 landscape-tablet:pt-12">
        <p className="text-sm font-semibold tracking-[0.2em] text-[color:var(--brand)] uppercase">
          Coffee Morning
        </p>
        <DaypartGreeting className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl landscape-tablet:text-6xl" />
        <p className="text-xl text-[color:var(--quiet)] sm:text-2xl">
          Wer bist du?
        </p>
      </header>

      <section
        className="grid gap-4 sm:grid-cols-3 sm:gap-5 landscape-tablet:gap-4"
        aria-label="Personen"
      >
        {data.persons.map((person, index) => (
          <ProfileTile
            key={person.id}
            href={`/person/${person.id}`}
            personId={person.id}
            name={person.name}
            hint={roleHint(person.id, person.hint)}
            accent={person.accent}
            avatar={person.avatar}
            avatarImageSrc={personAvatarSrc(person)}
            delayMs={80 + index * 70}
          />
        ))}
      </section>

      {/* Admin: long-press corner — not accidental for morning use */}
      <button
        type="button"
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] size-12 rounded-full opacity-[0.18] transition-opacity duration-200 hover:opacity-40 focus-visible:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]"
        aria-label="Einstellungen öffnen (gedrückt halten)"
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
      >
        <span className="sr-only">Einstellungen</span>
      </button>
      {adminHint ? (
        <p
          role="status"
          className="fixed bottom-20 right-4 rounded-2xl bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--quiet)] shadow-sm animate-soft-in"
        >
          Halten für Einstellungen…
        </p>
      ) : null}
    </main>
  );
}
