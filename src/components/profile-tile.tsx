import Link from "next/link";
import { cn } from "@/lib/utils";

type ProfileTileProps = {
  href: string;
  name: string;
  hint: string;
  accent: string;
  delayMs?: number;
};

export function ProfileTile({
  href,
  name,
  hint,
  accent,
  delayMs = 0,
}: ProfileTileProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex min-h-36 flex-col justify-between rounded-[1.75rem] px-7 py-6",
        "bg-[color:var(--surface)] text-[color:var(--ink)]",
        "transition-[transform,box-shadow,background-color] duration-300 ease-out",
        "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgba(28,36,48,0.45)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--bg)]",
        "animate-rise",
      )}
      style={{ animationDelay: `${delayMs}ms`, ["--tile-accent" as string]: accent }}
    >
      <span
        className="absolute inset-x-7 top-0 h-1 rounded-full opacity-80"
        style={{ background: "var(--tile-accent)" }}
        aria-hidden
      />
      <span className="font-display text-3xl tracking-tight sm:text-4xl">{name}</span>
      <span className="text-sm text-[color:var(--quiet)] sm:text-base">{hint}</span>
    </Link>
  );
}
