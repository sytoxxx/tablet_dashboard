"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useAppData } from "@/components/providers/data-provider";
import type { PersonId } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DEFAULT_WEATHER_LOCATION } from "@/lib/data/defaults";

export default function WetterSettingsPage() {
  const { data, updatePerson } = useAppData();

  return (
    <AdminShell
      title="Wetter"
      subtitle="Ort mit Koordinaten für Open-Meteo. Keine Keys nötig. Morning zeigt nur Temperatur + Tipp."
    >
      {data.persons.map((person) => {
        const loc = person.weatherLocation ?? DEFAULT_WEATHER_LOCATION;
        return (
          <form
            key={person.id}
            className="space-y-4 border-t border-[color:var(--hairline)] pt-6"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const place = String(fd.get("place") || loc.place)
                .replace(/[<>]/g, "")
                .slice(0, 60);
              const latitude = Number(fd.get("latitude"));
              const longitude = Number(fd.get("longitude"));
              updatePerson(person.id as PersonId, (p) => ({
                ...p,
                weatherLocation: {
                  place,
                  latitude: Number.isFinite(latitude) ? latitude : loc.latitude,
                  longitude: Number.isFinite(longitude) ? longitude : loc.longitude,
                },
              }));
            }}
          >
            <h2 className="font-display text-2xl tracking-tight">{person.name}</h2>
            <label className="block space-y-1">
              <span className="text-sm text-[color:var(--quiet)]">Ort</span>
              <input
                name="place"
                defaultValue={loc.place}
                className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm text-[color:var(--quiet)]">Latitude</span>
                <input
                  name="latitude"
                  type="number"
                  step="0.0001"
                  defaultValue={loc.latitude}
                  className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-[color:var(--quiet)]">Longitude</span>
                <input
                  name="longitude"
                  type="number"
                  step="0.0001"
                  defaultValue={loc.longitude}
                  className="h-12 w-full rounded-2xl bg-[color:var(--surface)] px-4 outline-none ring-[color:var(--brand)] focus:ring-2"
                />
              </label>
            </div>
            <Button type="submit" size="lg" className="h-12 rounded-2xl">
              Speichern
            </Button>
          </form>
        );
      })}
    </AdminShell>
  );
}
