import type { PersonDay } from "@/lib/types";
import { formatGermanDate, formatMinutesUntil } from "@/lib/format";
import { Section } from "@/components/section";
import { Timetable } from "@/components/timetable";
import { EmptyState } from "@/components/empty-state";
import { AppHeader } from "@/components/app-header";

type PersonDashboardProps = {
  person: PersonDay;
};

export function PersonDashboard({ person }: PersonDashboardProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <AppHeader />

      <header className="animate-rise space-y-2">
        <p className="text-sm tracking-[0.16em] text-[color:var(--quiet)] uppercase">
          {formatGermanDate()}
        </p>
        <h1
          className="font-display text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl"
          style={{ color: person.accent }}
        >
          {person.greeting}
        </h1>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="animate-rise space-y-10" style={{ animationDelay: "80ms" }}>
          <Section title="Stundenplan">
            <Timetable entries={person.timetable} />
          </Section>

          <Section title="Mitnehmen">
            {person.mitnehmen.length === 0 ? (
              <EmptyState title="Nichts einzupacken" description="Heute brauchst du nichts Extra." />
            ) : (
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-lg">
                {person.mitnehmen.map((item) => (
                  <li key={item} className="text-[color:var(--ink)]">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <aside className="animate-rise space-y-8" style={{ animationDelay: "140ms" }}>
          <Section title="Nächster Bus">
            {person.nextBus ? (
              <div>
                <p className="font-display text-4xl tabular-nums tracking-tight">
                  {person.nextBus.departure}
                </p>
                <p className="mt-2 text-lg">
                  Linie {person.nextBus.line} → {person.nextBus.destination}
                </p>
                <p className="mt-1 text-[color:var(--quiet)]">
                  {formatMinutesUntil(person.nextBus.minutesUntil)}
                </p>
              </div>
            ) : (
              <EmptyState
                title="Kein Bus nötig"
                description="Heute bist du zu Fuß oder bleibst in der Nähe."
              />
            )}
          </Section>

          <Section title="Wetter">
            {person.weather ? (
              <div>
                <p className="font-display text-4xl tracking-tight">
                  {person.weather.temperatureC}°
                </p>
                <p className="mt-2 text-lg">{person.weather.summary}</p>
                <p className="mt-2 text-[color:var(--quiet)]">{person.weather.clothingTip}</p>
              </div>
            ) : (
              <EmptyState title="Kein Wetter" description="Wetterdaten fehlen gerade." />
            )}
          </Section>

          <Section title="Kalender">
            {person.calendar.length === 0 ? (
              <EmptyState title="Frei" description="Keine weiteren Termine heute." />
            ) : (
              <ul className="space-y-3">
                {person.calendar.map((event) => (
                  <li key={`${event.time}-${event.title}`} className="flex gap-4 text-base sm:text-lg">
                    <time className="w-14 shrink-0 tabular-nums text-[color:var(--quiet)]">
                      {event.time}
                    </time>
                    <span>{event.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Aufgaben">
            {person.tasks.length === 0 ? (
              <EmptyState title="Alles erledigt" description="Keine offenen Aufgaben." />
            ) : (
              <ul className="space-y-3">
                {person.tasks.map((task) => (
                  <li
                    key={task.id}
                    className={
                      task.done
                        ? "text-[color:var(--quiet)] line-through"
                        : "text-[color:var(--ink)]"
                    }
                  >
                    {task.label}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </aside>
      </div>
    </div>
  );
}
