"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CoffeeCommandProvider } from "@/components/coffee/coffee-command-provider";
import { MorningNav } from "@/components/shared/morning-nav";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/kaffee", label: "Dashboard", match: (p: string) => p === "/kaffee" },
  {
    href: "/kaffee/machen",
    label: "Kaffee machen",
    match: (p: string) => p.startsWith("/kaffee/machen"),
  },
  { href: "/kaffee/bruehen", label: "Brühen", match: (p: string) => p.startsWith("/kaffee/bruehen") },
  { href: "/kaffee/bohnen", label: "Bohnen", match: (p: string) => p.startsWith("/kaffee/bohnen") },
  {
    href: "/kaffee/statistik",
    label: "Statistik",
    match: (p: string) => p.startsWith("/kaffee/statistik"),
  },
  {
    href: "/kaffee/verlauf",
    label: "Verlauf",
    match: (p: string) => p.startsWith("/kaffee/verlauf"),
  },
] as const;

export function CoffeeShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const pathname = usePathname();

  return (
    <CoffeeCommandProvider>
      <div className="morning-shell mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-6 sm:gap-8 sm:px-8 sm:py-8 landscape-tablet:gap-5 landscape-tablet:py-5">
        <MorningNav showCoffee={false} showPrimary />

        <header className="animate-rise space-y-2">
          <p className="text-sm tracking-[0.16em] text-[color:var(--quiet)] uppercase">
            Kaffee
          </p>
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl landscape-tablet:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="max-w-2xl text-lg text-[color:var(--quiet)]">{subtitle}</p>
          ) : null}
        </header>

        <nav
          className="animate-soft-in flex flex-wrap gap-2"
          aria-label="Kaffee-Bereiche"
        >
          {LINKS.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex min-h-12 items-center rounded-2xl px-4 text-base font-medium transition-[transform,background-color,color] duration-150 active:scale-[0.97]",
                  active
                    ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                    : "bg-[color:var(--surface)] text-[color:var(--ink)] hover:bg-[color:var(--surface-strong)]",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="animate-rise" style={{ animationDelay: "60ms" }}>
          {children}
        </div>
      </div>
    </CoffeeCommandProvider>
  );
}
