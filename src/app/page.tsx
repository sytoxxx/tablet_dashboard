"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coffee, Music2 } from "lucide-react";
import { ProfileTile } from "@/components/profile-tile";
import { useAppData } from "@/components/providers/data-provider";
import { OfflineBanner } from "@/components/admin/offline-banner";
import { Skeleton } from "@/components/shared/skeleton";

const ADMIN_HOLD_MS = 2200;

export default function HomePage() {
  const { data } = useAppData();
  const router = useRouter();
  const holdTimer = useRef<number | null>(null);
  const [adminHint, setAdminHint] = useState(false);

  const clearHold = useCallback(() => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

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

      <div
        className="pointer-events-none absolute top-10 right-8 size-28 rounded-full bg-[radial-gradient(circle,rgba(184,149,74,0.32),transparent_70%)] blur-2xl animate-soft-pulse sm:top-16 sm:right-16"
        aria-hidden
      />

      <header className="animate-rise max-w-2xl space-y-3 sm:space-y-4">
        <p className="text-sm font-semibold tracking-[0.2em] text-[color:var(--brand)] uppercase">
          Coffee Morning
        </p>
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl landscape-tablet:text-6xl">
          ☀️ Guten Morgen
        </h1>
        <p className="text-xl text-[color:var(--quiet)] sm:text-2xl">Wer bist du?</p>
      </header>

      <section
        className="grid gap-4 sm:grid-cols-3 sm:gap-5 landscape-tablet:gap-4"
        aria-label="Profile"
      >
        {data.persons.map((person, index) => (
          <ProfileTile
            key={person.id}
            href={`/person/${person.id}`}
            personId={person.id}
            name={person.name}
            hint={person.hint}
            accent={person.accent}
            avatar={person.avatar}
            delayMs={80 + index * 70}
          />
        ))}
      </section>

      <div
        className="animate-rise flex flex-wrap items-center gap-4"
        style={{ animationDelay: "280ms" }}
      >
        <Link
          href="/kaffee"
          className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-[color:var(--ink)] px-6 text-lg text-[color:var(--surface)] transition-[opacity,transform] duration-200 ease-out hover:opacity-90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--bg)]"
        >
          <Coffee className="size-5" aria-hidden />
          Zur Kaffeeecke
        </Link>
        <Link
          href="/musik"
          className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-[color:var(--surface)] px-6 text-lg text-[color:var(--ink)] transition-[opacity,transform] duration-200 ease-out hover:bg-[color:var(--surface-strong)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]"
        >
          <Music2 className="size-5" aria-hidden />
          Musik
        </Link>
        <Link
          href="/jarvis"
          className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-[color:var(--surface)] px-6 text-lg text-[color:var(--ink)] transition-[opacity,transform] duration-200 ease-out hover:bg-[color:var(--surface-strong)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]"
        >
          Jarvis
        </Link>
      </div>

      {/* Admin: long-press corner — not accidental for Birgit morning use */}
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
