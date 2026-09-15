import type { ReactNode } from "react";

type SectionProps = {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
};

export function Section({ title, children, aside, className }: SectionProps) {
  return (
    <section className={className}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
