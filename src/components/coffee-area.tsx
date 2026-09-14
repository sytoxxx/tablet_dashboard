import Link from "next/link";
import type { CoffeeDrink } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";

type CoffeeAreaProps = {
  drinks: CoffeeDrink[];
};

export function CoffeeArea({ drinks }: CoffeeAreaProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-5 py-6 sm:px-8 sm:py-8">
      <AppHeader backHref="/" backLabel="Zurück" showCoffee={false} />

      <header className="animate-rise space-y-3">
        <p className="text-sm tracking-[0.16em] text-[color:var(--quiet)] uppercase">
          Kaffeeecke
        </p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Was trinkst du?</h1>
        <p className="max-w-xl text-lg text-[color:var(--quiet)]">
          Stub-Ansicht mit Zubereitungshinweisen. Timer und persönliche Einstellungen kommen später.
        </p>
      </header>

      {drinks.length === 0 ? (
        <EmptyState title="Keine Getränke" description="Noch keine Kaffee-Stubs konfiguriert." />
      ) : (
        <div className="animate-rise space-y-12" style={{ animationDelay: "80ms" }}>
          {drinks.map((drink) => (
            <article
              key={drink.id}
              id={drink.id}
              className="border-t border-[color:var(--hairline)] pt-8 first:border-0 first:pt-0"
            >
              <h2 className="font-display text-3xl tracking-tight sm:text-4xl">{drink.name}</h2>
              <div className="mt-6 grid gap-8 sm:grid-cols-2">
                <Section title="Zubereitung">
                  <p className="text-lg leading-relaxed">{drink.prepNotes}</p>
                  <p className="mt-3 text-[color:var(--quiet)]">{drink.amounts}</p>
                </Section>
                <Section title="Timer & Einstellungen">
                  <p className="font-display text-4xl tabular-nums">
                    {drink.timerSeconds}
                    <span className="ml-2 text-lg text-[color:var(--quiet)]">Sek.</span>
                  </p>
                  <p className="mt-3 text-[color:var(--quiet)]">Timer-Platzhalter — noch nicht aktiv.</p>
                  <p className="mt-4 text-base">{drink.personalSettings}</p>
                </Section>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="text-sm text-[color:var(--quiet)]">
        Zurück zur Auswahl:{" "}
        <Link href="/" className="underline underline-offset-4 hover:text-[color:var(--ink)]">
          Home
        </Link>
      </p>
    </div>
  );
}
