"use client";

import { AppNav } from "@/components/shared/app-nav";
import { useAppData } from "@/components/providers/data-provider";
import type { CoffeeDrink } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function KaffeeSettingsPage() {
  const { data, updateCoffeeDrinks } = useAppData();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-6 sm:px-8">
      <AppNav showSettings={false} backLabel="Einstellungen" backHref="/einstellungen" />
      <header>
        <h1 className="font-display text-4xl tracking-tight">Kaffee</h1>
        <p className="mt-2 text-[color:var(--quiet)]">Timer-Sekunden und Kurzbeschreibung.</p>
      </header>

      <div className="space-y-8">
        {data.coffeeDrinks.map((drink, index) => (
          <form
            key={drink.id}
            className="space-y-3 border-t border-[color:var(--hairline)] pt-6"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const next: CoffeeDrink[] = data.coffeeDrinks.map((d, i) =>
                i === index
                  ? {
                      ...d,
                      name: String(fd.get("name") || d.name),
                      prepNotes: String(fd.get("prepNotes") || d.prepNotes),
                      amounts: String(fd.get("amounts") || d.amounts),
                      timerSeconds: Number(fd.get("timerSeconds") || d.timerSeconds),
                    }
                  : d,
              );
              updateCoffeeDrinks(next);
            }}
          >
            <h2 className="font-display text-2xl">{drink.name}</h2>
            <input
              name="name"
              defaultValue={drink.name}
              className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
            />
            <textarea
              name="prepNotes"
              rows={2}
              defaultValue={drink.prepNotes}
              className="w-full rounded-2xl bg-[color:var(--surface)] px-4 py-3 outline-none ring-[color:var(--brand)] focus:ring-2"
            />
            <input
              name="amounts"
              defaultValue={drink.amounts}
              className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
            />
            <label className="flex items-center gap-3">
              <span className="text-sm text-[color:var(--quiet)]">Timer (Sek.)</span>
              <input
                name="timerSeconds"
                type="number"
                min={5}
                max={600}
                defaultValue={drink.timerSeconds}
                className="h-12 w-28 rounded-2xl bg-[color:var(--surface)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
            <Button type="submit" size="lg" className="h-12 rounded-2xl">
              Speichern
            </Button>
          </form>
        ))}
      </div>
    </main>
  );
}
