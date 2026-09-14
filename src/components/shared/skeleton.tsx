import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Soft pulse placeholders for tablet loading moments. */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-skeleton rounded-2xl bg-[color:var(--surface-strong)]",
        className,
      )}
      aria-hidden
      {...props}
    />
  );
}

export function MorningSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6 sm:px-8"
      role="status"
      aria-label="Lädt"
    >
      <Skeleton className="h-12 w-48" />
      <Skeleton className="h-16 w-2/3 max-w-md" />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="min-h-48 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </div>
  );
}
