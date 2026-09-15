"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, Home, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    href: "/",
    label: "Morgen",
    icon: Home,
    match: (p: string) => p === "/" || p.startsWith("/person"),
  },
  {
    href: "/kaffee",
    label: "Kaffee",
    icon: Coffee,
    match: (p: string) => p.startsWith("/kaffee"),
  },
  {
    href: "/einstellungen",
    label: "Einstellungen",
    icon: Settings,
    match: (p: string) => p.startsWith("/einstellungen"),
  },
] as const;

/**
 * Few-item tablet nav: Morgen · Kaffee · Einstellungen.
 */
export function PrimaryNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex items-center justify-center gap-1 sm:justify-start sm:gap-2",
        className,
      )}
      aria-label="Hauptnavigation"
    >
      {ITEMS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex min-h-12 min-w-[7.5rem] items-center justify-center gap-2 rounded-2xl px-4 text-base font-medium transition-[transform,background-color,color] duration-150 active:scale-[0.97]",
              active
                ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                : "bg-[color:var(--surface)] text-[color:var(--ink)] hover:bg-[color:var(--surface-strong)]",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
