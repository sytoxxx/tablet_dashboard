"use client";

import Link from "next/link";
import { Coffee, Settings } from "lucide-react";
import { ProfileTile } from "@/components/profile-tile";
import { useAppData } from "@/components/providers/data-provider";

export default function HomePage() {
  const { data } = useAppData();

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center gap-12 px-5 py-10 sm:px-8 lg:px-10">
      <div
        className="pointer-events-none absolute top-10 right-8 size-24 rounded-full bg-[radial-gradient(circle,rgba(184,149,74,0.35),transparent_70%)] blur-2xl animate-soft-pulse sm:top-16 sm:right-16"
        aria-hidden
      />

      <header className="animate-rise max-w-2xl space-y-4">
        <p className="text-sm font-semibold tracking-[0.2em] text-[color:var(--brand)] uppercase">
          Coffee Morning
        </p>
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          Guten Morgen ☀️
        </h1>
        <p className="text-xl text-[color:var(--quiet)] sm:text-2xl">Wer bist du?</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3 sm:gap-5" aria-label="Profile">
        {data.persons.map((person, index) => (
          <ProfileTile
            key={person.id}
            href={`/person/${person.id}`}
            name={person.name}
            hint={person.hint}
            accent={person.accent}
            avatar={person.avatar}
            delayMs={100 + index * 70}
          />
        ))}
      </section>

      <div
        className="animate-rise flex flex-wrap items-center gap-4"
        style={{ animationDelay: "320ms" }}
      >
        <Link
          href="/kaffee"
          className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-[color:var(--ink)] px-6 text-lg text-[color:var(--surface)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--bg)]"
        >
          <Coffee className="size-5" aria-hidden />
          Zur Kaffeeecke
        </Link>
      </div>

      <Link
        href="/einstellungen"
        className="fixed right-4 bottom-4 inline-flex size-11 items-center justify-center rounded-full text-[color:var(--quiet)] opacity-50 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]"
        aria-label="Einstellungen"
      >
        <Settings className="size-5" />
      </Link>
    </main>
  );
}
