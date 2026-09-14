"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bus,
  CalendarDays,
  CloudSun,
  Coffee,
  Database,
  ListTodo,
  Settings2,
  Sparkles,
  Users,
  CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_LINKS: Array<{
  href: string;
  label: string;
  icon: typeof Settings2;
  exact?: boolean;
}> = [
  { href: "/einstellungen", label: "Übersicht", icon: Settings2, exact: true },
  { href: "/einstellungen/personen", label: "Personen", icon: Users },
  { href: "/einstellungen/plaene", label: "Pläne", icon: CalendarRange },
  { href: "/einstellungen/aufgaben", label: "Aufgaben", icon: ListTodo },
  { href: "/einstellungen/bus", label: "Bus", icon: Bus },
  { href: "/einstellungen/wetter", label: "Wetter", icon: CloudSun },
  { href: "/einstellungen/kalender", label: "Kalender", icon: CalendarDays },
  { href: "/einstellungen/kaffee", label: "Kaffee", icon: Coffee },
  { href: "/einstellungen/import-export", label: "Import/Export", icon: Database },
  { href: "/einstellungen/ki", label: "KI", icon: Sparkles },
  { href: "/einstellungen/system", label: "System", icon: Settings2 },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin"
      className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {ADMIN_LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl px-3 text-sm transition-colors",
              active
                ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                : "bg-[color:var(--surface)] text-[color:var(--ink)]",
            )}
          >
            <link.icon className="size-4" aria-hidden />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
