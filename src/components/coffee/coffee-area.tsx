import type { CoffeeDrink } from "@/lib/types";
import { AppNav } from "@/components/shared/app-nav";
import { CoffeeTimer } from "@/components/coffee/coffee-timer";
import { EmptyState } from "@/components/empty-state";

export function CoffeeArea({ drinks }: { drinks: CoffeeDrink[] }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-6 sm:px-8 sm:py-8">
      <AppNav showCoffee={false} />

      <header className="animate-rise space-y-3">
        <p className="text-sm tracking-[0.16em] text-[color:var(--quiet)] uppercase">Kaffeeecke</p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Was trinkst du?</h1>
        <p className="max-w-xl text-lg text-[color:var(--quiet)]">
          Getränk wählen, Anleitung lesen, Timer starten.
        </p>
      </header>

      {drinks.length === 0 ? (
        <EmptyState title="Keine Getränke" description="Noch keine Kaffee-Getränke konfiguriert." />
      ) : (
        <div className="animate-rise" style={{ animationDelay: "80ms" }}>
          <CoffeeTimer drinks={drinks} />
        </div>
      )}
    </div>
  );
}
