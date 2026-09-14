"use client";

import Link from "next/link";
import {
  Bus,
  CalendarRange,
  Coffee,
  Upload,
  Users,
  ListTodo,
  Briefcase,
} from "lucide-react";
import { AppNav } from "@/components/shared/app-nav";
import { useAppData } from "@/components/providers/data-provider";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/einstellungen/personen", label: "Personen", icon: Users, hint: "Namen, Avatar, Hinweise" },
  { href: "/einstellungen/stundenplan", label: "Stundenplan", icon: CalendarRange, hint: "Levi · Schule" },
  { href: "/einstellungen/arbeitsplan", label: "Arbeitsplan", icon: Briefcase, hint: "Birgit · Schichten" },
  { href: "/einstellungen/bus", label: "Bus", icon: Bus, hint: "Haltestelle & Abfahrten" },
  { href: "/einstellungen/aufgaben", label: "Aufgaben", icon: ListTodo, hint: "To-dos pro Person" },
  { href: "/einstellungen/kaffee", label: "Kaffee", icon: Coffee, hint: "Getränke & Timer" },
  { href: "/plan-aktualisieren", label: "Plan aktualisieren", icon: Upload, hint: "Foto / Datei für späteren OCR" },
];

export default function SettingsPage() {
  const { resetToSeed } = useAppData();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-6 sm:px-8 sm:py-8">
      <AppNav showCoffee showSettings={false} />

      <header className="space-y-2">
        <p className="text-sm tracking-[0.16em] text-[color:var(--quiet)] uppercase">Admin</p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Einstellungen</h1>
        <p className="text-lg text-[color:var(--quiet)]">
          Morning-Home bleibt klar — hier pflegst du Daten. Änderungen bleiben im Gerät gespeichert.
        </p>
      </header>

      <ul className="divide-y divide-[color:var(--hairline)]">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex min-h-16 items-center gap-4 py-4 transition-opacity hover:opacity-80 active:scale-[0.99]"
            >
              <item.icon className="size-5 text-[color:var(--quiet)]" aria-hidden />
              <span className="flex-1">
                <span className="block text-lg font-medium">{item.label}</span>
                <span className="text-sm text-[color:var(--quiet)]">{item.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-12 rounded-2xl"
        onClick={() => {
          if (window.confirm("Alle lokalen Änderungen verwerfen und Seed laden?")) {
            resetToSeed();
          }
        }}
      >
        Auf Standard zurücksetzen
      </Button>
    </main>
  );
}
