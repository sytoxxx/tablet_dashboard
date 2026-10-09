"use client";

import { DRINK_CARDS, METHOD_CARDS } from "@/lib/coffee/guide/flow";
import type { ExtendedMethod, GuideDrinkId } from "@/lib/coffee/guide/types";

export function DrinkSelection({ onPick }: { onPick: (drink: GuideDrinkId) => void }) {
  return (
    <section className="flex flex-col gap-6" aria-labelledby="guide-drink-title">
      <h2
        id="guide-drink-title"
        className="font-display text-5xl tracking-tight landscape-tablet:text-6xl"
      >
        Was möchtest du trinken? ☕
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {DRINK_CARDS.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onPick(card.id)}
            className="flex min-h-40 flex-col items-start justify-center gap-2 rounded-[2rem] bg-[color:var(--surface)] px-8 py-6 text-left transition-[transform,background-color] duration-150 hover:bg-[color:var(--surface-strong)] active:scale-[0.98] landscape-tablet:min-h-44"
          >
            <span className="text-5xl" aria-hidden>
              {card.emoji}
            </span>
            <span className="font-display text-4xl tracking-tight">{card.name}</span>
            <span className="text-xl text-[color:var(--quiet)]">{card.tagline}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function MethodSelection({
  onPick,
  onBack,
}: {
  onPick: (method: ExtendedMethod) => void;
  onBack: () => void;
}) {
  return (
    <section className="flex flex-col gap-6" aria-labelledby="guide-method-title">
      <h2
        id="guide-method-title"
        className="font-display text-5xl tracking-tight landscape-tablet:text-5xl"
      >
        Wie möchtest du deinen Verlängerten machen?
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {METHOD_CARDS.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onPick(card.id)}
            className="flex min-h-52 flex-col items-start justify-center gap-3 rounded-[2rem] bg-[color:var(--surface)] px-8 py-6 text-left transition-[transform,background-color] duration-150 hover:bg-[color:var(--surface-strong)] active:scale-[0.98]"
          >
            <span className="text-5xl" aria-hidden>
              {card.emoji}
            </span>
            <span className="font-display text-4xl tracking-tight">{card.name}</span>
            <span className="text-xl leading-snug text-[color:var(--quiet)]">{card.hint}</span>
          </button>
        ))}
      </div>
      <div>
        <button
          type="button"
          onClick={onBack}
          className="h-16 rounded-2xl bg-[color:var(--surface)] px-8 text-xl font-medium active:scale-[0.98]"
        >
          Zurück
        </button>
      </div>
    </section>
  );
}
