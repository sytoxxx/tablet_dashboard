import type { CoffeeDrink } from "@/lib/types";
import { MorningNav } from "@/components/shared/morning-nav";
import { CoffeeTimer } from "@/components/coffee/coffee-timer";
import { EmptyState } from "@/components/empty-state";

export function CoffeeArea({ drinks }: { drinks: CoffeeDrink[] }) {
  return (
    <div className="morning-shell mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-6 sm:px-8 sm:py-8 landscape-tablet:gap-6 landscape-tablet:py-5">
      <MorningNav showCoffee={false} />

      <header className="animate-rise space-y-3">
        <p className="text-sm tracking-[0.16em] text-[color:var(--quiet)] uppercase">Kaffeeecke</p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Was trinkst du?</h1>
        <p className="max-w-xl text-lg text-[color:var(--quiet)]">
          Espresso, Cappuccino oder Latte — wählen, starten, fertig.
        </p>
      </header>

      {drinks.length === 0 ? (
        <EmptyState
          title="Noch kein Getränk"
          description="Die Kaffeeecke ist gerade leer — später wieder vorbeischauen."
        />
      ) : (
        <div className="animate-rise" style={{ animationDelay: "80ms" }}>
          <CoffeeTimer drinks={drinks} />
        </div>
      )}
    </div>
  );
}
