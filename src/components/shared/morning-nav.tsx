"use client";

import Link from "next/link";
import { ArrowLeft, Coffee, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileSwitcher } from "@/components/profile-switcher";
import { cn } from "@/lib/utils";

type MorningNavProps = {
  showCoffee?: boolean;
  /** Extra-quiet chrome for Birgit — still reachable Home/Coffee. */
  quiet?: boolean;
  className?: string;
  showProfileSwitcher?: boolean;
};

/**
 * Morning-flow navigation only — no Admin/Settings entry.
 * Admin stays on Home (long-press) / dedicated /einstellungen routes.
 */
export function MorningNav({
  showCoffee = true,
  quiet = false,
  className,
  showProfileSwitcher = true,
}: MorningNavProps) {
  return (
    <nav
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        quiet && "opacity-90",
        className,
      )}
      aria-label="Navigation"
    >
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          size="lg"
          className="h-12 min-w-12 gap-2 rounded-2xl px-4 text-base text-[color:var(--quiet)] hover:bg-[color:var(--surface)] hover:text-[color:var(--ink)] active:scale-[0.97] transition-transform duration-150"
        >
          <Link href="/">
            <ArrowLeft className="size-5" aria-hidden />
            <span>Zurück</span>
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="lg"
          className="h-12 rounded-2xl px-3 text-base text-[color:var(--quiet)] hover:bg-[color:var(--surface)] hover:text-[color:var(--ink)] active:scale-[0.97] transition-transform duration-150"
        >
          <Link href="/" aria-label="Zur Personenwahl">
            <Home className="size-5" aria-hidden />
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {showProfileSwitcher ? <ProfileSwitcher compact /> : null}
        {showCoffee ? (
          <Button
            asChild
            variant="secondary"
            size="lg"
            className="h-12 gap-2 rounded-2xl bg-[color:var(--surface)] px-5 text-base text-[color:var(--ink)] hover:bg-[color:var(--surface-strong)] active:scale-[0.97] transition-transform duration-150"
          >
            <Link href="/kaffee">
              <Coffee className="size-5" aria-hidden />
              Kaffee
            </Link>
          </Button>
        ) : null}
      </div>
    </nav>
  );
}
