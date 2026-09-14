import Link from "next/link";
import { ProfileTile } from "@/components/profile-tile";
import { profiles } from "@/data/profiles";
import { Coffee } from "lucide-react";

export default function HomePage() {
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
        {profiles.map((person, index) => (
          <ProfileTile
            key={person.id}
            href={`/person/${person.id}`}
            name={person.displayName}
            hint={person.hint}
            accent={person.accent}
            delayMs={100 + index * 70}
          />
        ))}
      </section>

      <div className="animate-rise" style={{ animationDelay: "320ms" }}>
        <Link
          href="/kaffee"
          className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-[color:var(--ink)] px-6 text-lg text-[color:var(--surface)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--bg)]"
        >
          <Coffee className="size-5" aria-hidden />
          Zur Kaffeeecke
        </Link>
      </div>
    </main>
  );
}
