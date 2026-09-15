"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileSwitcher } from "@/components/profile-switcher";
import { PrimaryNav } from "@/components/shared/primary-nav";
import { cn } from "@/lib/utils";

type MorningNavProps = {
  /** @deprecated Coffee is reached via PrimaryNav */
  showCoffee?: boolean;
  /** Extra-quiet chrome for work mornings. */
  quiet?: boolean;
  className?: string;
  showProfileSwitcher?: boolean;
  /** Show primary Morgen / Kaffee / Einstellungen row. */
  showPrimary?: boolean;
};

/**
 * Morning-flow chrome: back + optional profile switcher + primary tabs.
 */
export function MorningNav({
  quiet = false,
  className,
  showProfileSwitcher = true,
  showPrimary = true,
}: MorningNavProps) {
  return (
    <nav
      className={cn(
        "flex flex-col gap-3",
        quiet && "opacity-95",
        className,
      )}
      aria-label="Navigation"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          {showProfileSwitcher ? <ProfileSwitcher compact /> : null}
        </div>
        {showPrimary ? <PrimaryNav /> : null}
      </div>
    </nav>
  );
}
