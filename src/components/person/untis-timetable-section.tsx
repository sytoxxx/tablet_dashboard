"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Section } from "@/components/section";
import { useAppData } from "@/components/providers/data-provider";
import { addDays, toIsoDate } from "@/lib/day/tomorrow";
import { ageLabel, eventsForDate, isOutdated } from "@/lib/untis/select";
import type { UntisEvent } from "@/lib/untis/ical";
import type { UntisState } from "@/hooks/use-untis-timetable";
import { schoolLessonsForDate } from "@/lib/school/school-day";
import { withoutDemoTimetable } from "@/lib/school/demo-timetable";
import { cn } from "@/lib/utils";

type Row = { id: string; start: string; end: string; subject: string; room: string; info: string; cancelled: boolean };

function DayList({
  title,
  rows,
  emptyText,
  note,
}: {
  title: string;
  rows: Row[];
  emptyText: string;
  note?: string | null;
}) {
  const active = rows.filter((r) => !r.cancelled);
  const first = active[0]?.start;
  const lastEnd = active.length > 0 && active.every((r) => r.end !== r.start) ? active.map((r) => r.end).sort().at(-1) : null;
  return (
    <div className="min-w-0 space-y-2">
      <h3 className="text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
        {title}
        {first ? (
          <span className="ml-2 font-medium normal-case tracking-normal">
            · Schulbeginn {first}
            {lastEnd ? ` · Schulende ${lastEnd}` : ""}
          </span>
        ) : null}
      </h3>
      {note ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950" data-testid="untis-fallback-note">
          {note}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-lg text-[color:var(--quiet)]">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((e) => (
            <li
              key={e.id}
              className={cn(
                "grid grid-cols-[4.2rem_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-[color:var(--hairline)] pb-1.5 last:border-0",
                e.cancelled && "text-[color:var(--quiet)]",
              )}
            >
              <time className="font-display text-2xl tabular-nums">{e.start}</time>
              <span className="min-w-0">
                <span className={cn("text-xl font-medium", e.cancelled && "line-through decoration-1")}>{e.subject}</span>
                {e.cancelled ? (
                  <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-sm font-medium text-red-800">Entfällt</span>
                ) : null}
                {e.info ? <span className="block truncate text-sm text-[color:var(--quiet)]">{e.info}</span> : null}
              </span>
              <span className="text-base text-[color:var(--quiet)]">{e.room}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const fromEvent = (e: UntisEvent): Row => ({ id: e.id, start: e.start, end: e.end, subject: e.subject, room: e.room, info: e.info, cancelled: e.cancelled });

/** Levi's real WebUntis timetable: heute + morgen, always with how fresh it is and where each day comes from. */
export function UntisTimetableSection({ untis, now }: { untis: UntisState; now: Date }) {
  const { getPerson } = useAppData();
  const today = toIsoDate(now);
  const tomorrowDate = addDays(now, 1);
  const tomorrow = toIsoDate(tomorrowDate);
  const outdated = untis.fetchedAt != null && isOutdated(untis.fetchedAt, now);
  const failed = untis.error != null;
  const cov = untis.snapshot?.coverage ?? null;
  const covered = (iso: string) => Boolean(cov && iso >= cov.start && iso <= cov.end);

  const stored = getPerson("levi");
  const manual = stored ? withoutDemoTimetable(stored) : null;
  const manualRows = (date: Date): Row[] =>
    manual && manual.schedule.type === "school"
      ? schoolLessonsForDate({ ...manual.schedule, dated: undefined }, date).map((l) => ({
          id: l.id, start: l.time, end: l.end ?? l.time, subject: l.subject, room: l.room, info: "", cancelled: false,
        }))
      : [];

  const MANUAL_NOTE = "Für diesen Tag liefert WebUntis keine Daten — hier steht dein manueller Wochenplan (nicht live).";
  const rowsFor = (iso: string, date: Date) =>
    covered(iso) ? { rows: eventsForDate(untis.events, iso).map(fromEvent), note: null } : { rows: manualRows(date), note: MANUAL_NOTE };
  const t = rowsFor(today, now);
  const m = rowsFor(tomorrow, tomorrowDate);

  return (
    <Section title="Schule · WebUntis" emphasis="hero">
      <div className="grid gap-5 landscape-tablet:grid-cols-2 landscape-tablet:gap-8">
        <DayList title="Heute" rows={t.rows} note={t.note} emptyText={covered(today) ? "Heute laut WebUntis keine Stunden." : "Heute keine Stunden eingetragen."} />
        <DayList title="Morgen" rows={m.rows} note={m.note} emptyText={covered(tomorrow) ? "Morgen laut WebUntis keine Stunden." : "Morgen keine Stunden eingetragen."} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[color:var(--quiet)]">
        {untis.fetchedAt != null ? <span>Stand: {ageLabel(untis.fetchedAt, now)}</span> : null}
        <button
          type="button"
          onClick={untis.refresh}
          disabled={untis.loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[color:var(--bg)]/70 px-4 text-base font-medium text-[color:var(--ink)] active:scale-[0.97] disabled:opacity-60"
        >
          <RefreshCw className={cn("size-4", untis.loading && "animate-spin")} aria-hidden />
          Jetzt aktualisieren
        </button>
        <Link href="/einstellungen/webuntis" className="underline-offset-4 hover:underline">
          Einstellungen
        </Link>
      </div>
      {failed || outdated ? (
        <p role="status" className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-base text-amber-950" data-testid="untis-stale">
          ⚠️ Der Stundenplan konnte nicht aktualisiert werden
          {untis.error ? `: ${untis.error}` : "."} Gezeigt wird der Stand von{" "}
          {untis.fetchedAt != null ? ageLabel(untis.fetchedAt, now) : "—"} — Änderungen seitdem fehlen eventuell.
        </p>
      ) : null}
    </Section>
  );
}
