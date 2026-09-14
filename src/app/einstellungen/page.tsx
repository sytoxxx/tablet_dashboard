"use client";

import Link from "next/link";
import {
  Bus,
  CalendarDays,
  CalendarRange,
  CloudSun,
  Coffee,
  Database,
  ListTodo,
  Sparkles,
  Users,
  Settings2,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { useAppData } from "@/components/providers/data-provider";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/einstellungen/personen", label: "Personen", icon: Users, hint: "Name, Avatar, Plan-Typ, Anzeige" },
  { href: "/einstellungen/plaene", label: "Pläne", icon: CalendarRange, hint: "Wocheneditor Mo–So" },
  { href: "/einstellungen/aufgaben", label: "Aufgaben", icon: ListTodo, hint: "To-dos pro Person" },
  { href: "/einstellungen/bus", label: "Bus", icon: Bus, hint: "Haltestelle, RBL, Vorlaufzeit" },
  { href: "/einstellungen/wetter", label: "Wetter", icon: CloudSun, hint: "Ort & Koordinaten" },
  { href: "/einstellungen/kalender", label: "Kalender", icon: CalendarDays, hint: "Termine pflegen" },
  { href: "/einstellungen/kaffee", label: "Kaffee", icon: Coffee, hint: "Getränke & Timer" },
  { href: "/einstellungen/import-export", label: "Import/Export", icon: Database, hint: "JSON & Backup" },
  { href: "/einstellungen/ki", label: "KI", icon: Sparkles, hint: "Foto → Draft → Speichern" },
  { href: "/einstellungen/system", label: "System", icon: Settings2, hint: "Offline, Reset, Info" },
];

export default function SettingsPage() {
  const { data, resetToSeed } = useAppData();

  return (
    <AdminShell
      title="Einstellungen"
      subtitle="Morning-Home bleibt klar — hier pflegst du Daten. Änderungen bleiben im Gerät gespeichert."
    >
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

      <p className="text-sm text-[color:var(--quiet)]">
        Profile: {data.persons.map((p) => p.name).join(" · ")} · Datenversion {data.version}
      </p>

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
    </AdminShell>
  );
}
