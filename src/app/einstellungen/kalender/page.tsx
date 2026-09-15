"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useAppData } from "@/components/providers/data-provider";
import type { Appointment, PersonId, WeekdayKey } from "@/lib/types";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

function newId() {
  return `appt-${Math.random().toString(36).slice(2, 9)}`;
}

export default function KalenderSettingsPage() {
  const { data, updatePerson } = useAppData();

  return (
    <AdminShell
      title="Kalender"
      subtitle="Wiederkehrende Wochentermine oder einmalige Daten (YYYY-MM-DD)."
    >
      {data.persons.map((person) => (
        <section key={person.id} className="space-y-4 border-t border-[color:var(--hairline)] pt-6">
          <h2 className="font-display text-2xl tracking-tight">{person.name}</h2>
          <Button
            type="button"
            size="lg"
            className="h-12 gap-2 rounded-2xl"
            onClick={() =>
              updatePerson(person.id as PersonId, (p) => ({
                ...p,
                appointments: [
                  ...p.appointments,
                  {
                    id: newId(),
                    title: "Neuer Termin",
                    time: "12:00",
                    weekday: "mon",
                  },
                ],
              }))
            }
          >
            <Plus className="size-4" /> Termin
          </Button>
          <ul className="space-y-3">
            {person.appointments.map((appt, index) => (
              <li
                key={appt.id}
                className="grid gap-2 rounded-2xl bg-[color:var(--surface)] p-3 sm:grid-cols-[6rem_1fr_8rem_8rem_auto]"
              >
                <input
                  value={appt.time}
                  aria-label="Uhrzeit"
                  className="h-11 rounded-xl bg-white/70 px-3 tabular-nums outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                  onChange={(e) => {
                    updatePerson(person.id, (p) => {
                      const appointments = [...p.appointments];
                      appointments[index] = { ...appt, time: e.target.value };
                      return { ...p, appointments };
                    });
                  }}
                />
                <input
                  value={appt.title}
                  aria-label="Titel"
                  className="h-11 rounded-xl bg-white/70 px-3 outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                  onChange={(e) => {
                    const title = e.target.value.replace(/[<>]/g, "").slice(0, 80);
                    updatePerson(person.id, (p) => {
                      const appointments = [...p.appointments];
                      appointments[index] = { ...appt, title };
                      return { ...p, appointments };
                    });
                  }}
                />
                <select
                  value={appt.weekday ?? ""}
                  aria-label="Wochentag"
                  className="h-11 rounded-xl bg-white/70 px-2 outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                  onChange={(e) => {
                    const weekday = (e.target.value || undefined) as WeekdayKey | undefined;
                    updatePerson(person.id, (p) => {
                      const appointments = [...p.appointments];
                      const next: Appointment = { ...appt, weekday };
                      appointments[index] = next;
                      return { ...p, appointments };
                    });
                  }}
                >
                  <option value="">Jeden Tag</option>
                  {WEEKDAY_ORDER.map((d) => (
                    <option key={d} value={d}>
                      {WEEKDAY_LABELS[d]}
                    </option>
                  ))}
                </select>
                <input
                  value={appt.date ?? ""}
                  placeholder="YYYY-MM-DD"
                  aria-label="Datum"
                  className="h-11 rounded-xl bg-white/70 px-3 tabular-nums outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                  onChange={(e) => {
                    const date = e.target.value || undefined;
                    updatePerson(person.id, (p) => {
                      const appointments = [...p.appointments];
                      appointments[index] = { ...appt, date };
                      return { ...p, appointments };
                    });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Löschen"
                  onClick={() =>
                    updatePerson(person.id, (p) => ({
                      ...p,
                      appointments: p.appointments.filter((_, i) => i !== index),
                    }))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </AdminShell>
  );
}
