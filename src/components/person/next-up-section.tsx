import type { NextUpGlance } from "@/lib/morning/work-priority";
import { Section } from "@/components/section";
import type { ClarityEmphasis } from "@/components/clarity-block";

/** Compact “Als Nächstes” — one fact, no empty card when nothing urgent. */
export function NextUpSection({
  next,
  emphasis = "secondary",
}: {
  next: NextUpGlance;
  emphasis?: ClarityEmphasis;
}) {
  return (
    <Section title="Als Nächstes" emphasis={emphasis}>
      <p className="text-xl font-medium text-[color:var(--ink)] sm:text-2xl landscape-tablet:text-xl">
        {next.title}
      </p>
      {next.detail ? (
        <p className="mt-1 text-base text-[color:var(--quiet)] landscape-tablet:text-sm">
          {next.detail}
        </p>
      ) : null}
    </Section>
  );
}
