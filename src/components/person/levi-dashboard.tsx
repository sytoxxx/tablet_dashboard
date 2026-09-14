import type { PersonDay } from "@/lib/types";
import { AppNav } from "@/components/shared/app-nav";
import { LiveClock } from "@/components/shared/live-clock";
import { Timetable } from "@/components/timetable";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";
import { NextLessonHighlight } from "@/components/person/next-lesson";
import { BusSection } from "@/components/person/bus-section";
import { WeatherSection } from "@/components/person/weather-section";
import { CalendarSection } from "@/components/person/calendar-section";
import { TasksSection } from "@/components/person/tasks-section";

export function LeviDashboard({ person }: { person: PersonDay }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <AppNav />

      <header className="animate-rise flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1
            className="font-display text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            style={{ color: person.accent }}
          >
            {person.greeting}
          </h1>
        </div>
        <LiveClock />
      </header>

      <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr]">
        <div className="animate-rise space-y-10" style={{ animationDelay: "80ms" }}>
          <NextLessonHighlight entries={person.timetable} />
          <Section title="Stundenplan">
            <Timetable entries={person.timetable} />
          </Section>
          <Section title="Mitnehmen">
            {person.mitnehmen.length === 0 ? (
              <EmptyState title="Nichts einzupacken" description="Heute brauchst du nichts Extra." />
            ) : (
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-lg">
                {person.mitnehmen.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <aside className="animate-rise space-y-8" style={{ animationDelay: "140ms" }}>
          <BusSection bus={person.nextBus} />
          <WeatherSection weather={person.weather} />
          <CalendarSection events={person.calendar} />
          <TasksSection tasks={person.tasks} />
        </aside>
      </div>
    </div>
  );
}
