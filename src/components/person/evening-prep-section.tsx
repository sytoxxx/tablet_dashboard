import type { EveningPrep } from "@/lib/evening/prep";
import { Section } from "@/components/section";

/**
 * Evening prep for tomorrow — no invented wardrobe / outfit data.
 */
export function EveningPrepSection({
  prep,
  simple = false,
}: {
  prep: EveningPrep | null;
  simple?: boolean;
}) {
  if (!prep) return null;

  return (
    <Section title={prep.title}>
      <ul className={simple ? "space-y-4" : "space-y-4 sm:space-y-5"}>
        {prep.items.map((item) => (
          <li key={item.kind} className="min-w-0">
            <p className="text-base text-[color:var(--quiet)]">{item.label}</p>
            <p
              className={
                simple
                  ? "mt-0.5 text-lg text-[color:var(--ink)]"
                  : "mt-0.5 text-lg sm:text-xl text-[color:var(--ink)]"
              }
            >
              {item.detail}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
