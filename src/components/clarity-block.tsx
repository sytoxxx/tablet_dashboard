import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ClarityEmphasis = "hero" | "secondary" | "tertiary";

type ClarityBlockProps = {
  /** Always a readable label — icons never replace this. */
  title: string;
  children: ReactNode;
  emphasis?: ClarityEmphasis;
  aside?: ReactNode;
  className?: string;
};

/**
 * Hierarchy block for morning glance: one hero, a few medium, rest small.
 */
export function ClarityBlock({
  title,
  children,
  emphasis = "secondary",
  aside,
  className,
}: ClarityBlockProps) {
  return (
    <section
      className={cn(
        "animate-soft-in",
        emphasis === "hero" &&
          "rounded-[1.75rem] bg-[color:var(--surface)] px-6 py-6 shadow-[0_1px_0_var(--hairline)] sm:px-8 sm:py-7 landscape-tablet:rounded-2xl landscape-tablet:px-5 landscape-tablet:py-4",
        emphasis === "secondary" &&
          "rounded-[1.5rem] bg-[color:var(--surface)]/80 px-5 py-5 sm:px-6 landscape-tablet:rounded-2xl landscape-tablet:px-4 landscape-tablet:py-3.5",
        emphasis === "tertiary" && "px-1 py-1 landscape-tablet:py-0.5",
        className,
      )}
    >
      <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4 landscape-tablet:mb-2">
        <h2
          className={cn(
            "font-semibold tracking-[0.16em] text-[color:var(--quiet)] uppercase",
            emphasis === "hero" && "text-sm sm:text-base landscape-tablet:text-sm",
            emphasis === "secondary" && "text-sm landscape-tablet:text-xs",
            emphasis === "tertiary" && "text-xs tracking-[0.14em]",
          )}
        >
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
